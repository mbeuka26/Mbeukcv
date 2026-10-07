-- ════════════════════════════════════════════════════════════
-- MbeukCV Pro — Schéma Supabase (Option C : backend optionnel)
-- ════════════════════════════════════════════════════════════
-- Porte vers Postgres/Supabase ce qui était prévu sur Firebase/
-- Firestore : licences, crédits IA, historique CV synchronisé,
-- matching, offres scrapées. L'app fonctionne intégralement SANS
-- ce backend (mode local pur, BYOK) — ce schéma n'active que les
-- fonctionnalités avancées (mode "quota" sans clé perso, envoi
-- d'e-mail réel, veille automatique serveur, matching IA).
--
-- Identité : Auth anonyme Supabase (équivalent de Firebase Anonymous
-- Auth) — `auth.uid()` donne un UUID stable par navigateur, sans
-- email/mot de passe. Activez "Anonymous sign-ins" dans
-- Authentication > Providers avant d'utiliser ce schéma.
--
-- ⚠️ IMPORTANT — différence structurelle avec Firestore : Postgres/RLS
-- n'a PAS de distinction "get vs list" comme Firestore. Une policy
-- SELECT qui autoriserait "n'importe quelle ligne dont vous connaissez
-- le code" laisserait quand même un client lister TOUTES les lignes
-- via une requête sans filtre. Pour empêcher l'énumération des
-- licences (équivalent de `allow list: if false` côté Firestore), la
-- table `licences` n'expose AUCUN accès direct via l'API PostgREST
-- (ni SELECT ni UPDATE pour les rôles anon/authenticated) : toute
-- interaction passe par les fonctions RPC `SECURITY DEFINER`
-- ci-dessous, qui exigent de connaître le code exact en paramètre.

-- ── Extensions ──
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ════════════════════════════════════════════════════════════
-- TABLE licences
-- ════════════════════════════════════════════════════════════
create table if not exists public.licences (
  code               text primary key check (code ~ '^MB-\d{4}-[A-Z0-9]{6}$'),
  acheteur           text not null default '',
  actif              boolean not null default true,
  expire             timestamptz not null,
  appareils          text[] not null default '{}',
  nb_appareils       integer not null default 0,
  uids               uuid[] not null default '{}',
  credits_ia         integer not null default 0,
  credits_search     integer not null default 0,
  derniere_connexion timestamptz,
  cree_le            timestamptz not null default now()
);

alter table public.licences enable row level security;
-- Aucune policy créée volontairement : accès exclusivement via les
-- fonctions RPC SECURITY DEFINER ci-dessous (deny-by-default RLS).

-- ════════════════════════════════════════════════════════════
-- TABLE profils_candidats (mots-clés + CV pour le matching serveur)
-- ════════════════════════════════════════════════════════════
create table if not exists public.profils_candidats (
  licence_code             text primary key references public.licences(code) on delete cascade,
  mots_cles                text[] not null default '{}',
  cv_brut_texte             text not null default '',
  mis_a_jour_le             timestamptz not null default now(),
  derniere_analyse_matching timestamptz
);

alter table public.profils_candidats enable row level security;

-- Propriétaire = un uid déjà présent dans licences.uids pour ce code.
create or replace function public.est_proprietaire_licence(p_code text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.licences
    where code = p_code
      and auth.uid() = any(uids)
  );
$$;

create policy "profil: lecture propriétaire"
  on public.profils_candidats for select
  using (public.est_proprietaire_licence(licence_code));

create policy "profil: écriture propriétaire"
  on public.profils_candidats for insert
  with check (public.est_proprietaire_licence(licence_code));

create policy "profil: mise à jour propriétaire"
  on public.profils_candidats for update
  using (public.est_proprietaire_licence(licence_code))
  with check (public.est_proprietaire_licence(licence_code));

-- ════════════════════════════════════════════════════════════
-- TABLE historique_cv (synchronisation multi-appareils, optionnelle)
-- ════════════════════════════════════════════════════════════
create table if not exists public.historique_cv (
  id                uuid primary key default gen_random_uuid(),
  licence_code      text not null references public.licences(code) on delete cascade,
  nom               text not null,
  cv_brut_texte     text not null,
  langue_cible      text not null default 'les-deux' check (langue_cible in ('fr', 'en', 'les-deux')),
  instructions_style text not null default '',
  cree_le           timestamptz not null default now(),
  mis_a_jour_le     timestamptz not null default now()
);

alter table public.historique_cv enable row level security;

create policy "historique_cv: CRUD propriétaire"
  on public.historique_cv for all
  using (public.est_proprietaire_licence(licence_code))
  with check (public.est_proprietaire_licence(licence_code));

-- ════════════════════════════════════════════════════════════
-- TABLE offres_globales (base métier : scrape cron + collect-offers)
-- ════════════════════════════════════════════════════════════
create table if not exists public.offres_globales (
  id             text primary key,
  titre          text not null,
  entreprise     text not null,
  lieu           text,
  url            text not null,
  email_recruteur text,
  description    text,
  source         text not null default 'minajobs.net',
  pays           text,
  collecte       text not null default 'scrape',
  scraped_at     timestamptz not null default now()
);

alter table public.offres_globales add column if not exists pays text;
alter table public.offres_globales add column if not exists collecte text not null default 'scrape';

-- Clés JSearch / Africawork de l'utilisateur. Écriture par Edge Function
-- (service_role). Le navigateur ne peut pas les relire.
-- Si le secret COLLECT_KEYS_KEY est défini sur les fonctions, la colonne
-- contient un texte chiffré préfixé v1:. Sans cette variable, la valeur
-- reste le secret tel que saisi (comportement précédent).
create table if not exists public.cles_collecte (
  licence_code text not null references public.licences(code) on delete cascade,
  fournisseur  text not null check (fournisseur in ('jsearch', 'africawork')),
  secret       text not null,
  mis_a_jour_le timestamptz not null default now(),
  primary key (licence_code, fournisseur)
);

alter table public.cles_collecte enable row level security;

alter table public.offres_globales enable row level security;
-- Aucune policy : accès exclusif au rôle "service_role" (Edge
-- Functions), jamais au client — équivalent du deny-by-default
-- Firestore pour cette collection.

-- ════════════════════════════════════════════════════════════
-- TABLE user_matchs (résultats du matching IA, écriture Edge Function)
-- ════════════════════════════════════════════════════════════
create table if not exists public.user_matchs (
  id              uuid primary key default gen_random_uuid(),
  licence_code    text not null references public.licences(code) on delete cascade,
  offre_id        text not null,
  titre           text not null,
  entreprise      text not null,
  lieu            text,
  url             text not null,
  email_recruteur text,
  description     text,
  score           numeric not null check (score >= 0 and score <= 100),
  resume          text not null,
  matched_at      timestamptz not null default now(),
  unique (licence_code, offre_id)
);

alter table public.user_matchs enable row level security;

create policy "matchs: lecture propriétaire uniquement"
  on public.user_matchs for select
  using (public.est_proprietaire_licence(licence_code));
-- Pas de policy insert/update/delete : écriture réservée à
-- service_role (Edge Function refresh-matches).

create index if not exists idx_user_matchs_licence on public.user_matchs(licence_code);
create index if not exists idx_offres_scraped_at on public.offres_globales(scraped_at desc);

-- ════════════════════════════════════════════════════════════
-- TABLE envois_journaliers (quota Brevo, écriture service_role)
-- ════════════════════════════════════════════════════════════
create table if not exists public.envois_journaliers (
  licence_code text not null references public.licences(code) on delete cascade,
  jour date not null,
  nb integer not null default 0 check (nb >= 0),
  primary key (licence_code, jour)
);

alter table public.envois_journaliers enable row level security;

-- ════════════════════════════════════════════════════════════
-- RPC : vérification de licence. Le slot d'appareil est auth.uid().
-- ════════════════════════════════════════════════════════════
-- L'ancienne signature (p_code, p_device_id) acceptait un identifiant
-- choisi par le client. On la retire pour ne pas laisser la surcharge.
drop function if exists public.verifier_licence(text, text);

create or replace function public.verifier_licence(p_code text)
returns table (
  code text,
  acheteur text,
  actif boolean,
  expire timestamptz,
  credits_ia integer,
  appareil_connu boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_licence public.licences%rowtype;
  v_uid uuid := auth.uid();
  v_uid_connu boolean;
  v_nb_uids integer;
begin
  if v_uid is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;

  select * into v_licence
  from public.licences
  where public.licences.code = p_code
  for update;

  if not found then
    raise exception 'Licence introuvable.' using errcode = 'P0002';
  end if;

  if not v_licence.actif then
    raise exception 'Licence désactivée.' using errcode = 'P0001';
  end if;

  if v_licence.expire < now() then
    raise exception 'Licence expirée.' using errcode = 'P0001';
  end if;

  v_uid_connu := v_uid = any(v_licence.uids);
  v_nb_uids := coalesce(array_length(v_licence.uids, 1), 0);

  if not v_uid_connu and v_nb_uids >= 2 then
    raise exception 'Limite de 2 appareils atteinte pour cette licence.' using errcode = 'P0001';
  end if;

  update public.licences
  set
    appareils = case when v_uid_connu then appareils else appareils || v_uid::text end,
    nb_appareils = case when v_uid_connu then nb_appareils else v_nb_uids + 1 end,
    uids = case when v_uid_connu then uids else uids || v_uid end,
    derniere_connexion = now()
  where public.licences.code = p_code;

  return query
    select v_licence.code, v_licence.acheteur, v_licence.actif, v_licence.expire,
           v_licence.credits_ia, v_uid_connu;
end;
$$;

-- ════════════════════════════════════════════════════════════
-- RPC : ledger crédits IA — service_role uniquement
-- ════════════════════════════════════════════════════════════
-- consommer verrouille la ligne (for update) puis décrémente.
-- restituer réincrémente après un échec Claude. Les deux sont
-- révoquées pour anon et authenticated plus bas.
create or replace function public.consommer_credit_ia(p_code text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credits integer;
  v_actif boolean;
  v_expire timestamptz;
begin
  select credits_ia, actif, expire into v_credits, v_actif, v_expire
  from public.licences
  where code = p_code
  for update;

  if not found then
    raise exception 'Licence introuvable.' using errcode = 'P0002';
  end if;

  if not v_actif then
    raise exception 'Licence désactivée.' using errcode = 'P0001';
  end if;

  if v_expire < now() then
    raise exception 'Licence expirée.' using errcode = 'P0001';
  end if;

  if v_credits <= 0 then
    raise exception 'Crédits épuisés. Ajoutez votre propre clé API dans les paramètres.' using errcode = 'P0001';
  end if;

  update public.licences set credits_ia = credits_ia - 1 where code = p_code;
  return v_credits - 1;
end;
$$;

create or replace function public.restituer_credit_ia(p_code text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credits integer;
begin
  select credits_ia into v_credits
  from public.licences
  where code = p_code
  for update;

  if not found then
    raise exception 'Licence introuvable.' using errcode = 'P0002';
  end if;

  update public.licences set credits_ia = credits_ia + 1 where code = p_code;
  return v_credits + 1;
end;
$$;

-- Quota : 20 e-mails par licence et par jour UTC.
create or replace function public.reserver_envoi_email(p_code text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quota constant integer := 20;
  v_nb integer;
begin
  insert into public.envois_journaliers (licence_code, jour, nb)
  values (p_code, (now() at time zone 'utc')::date, 1)
  on conflict (licence_code, jour)
  do update set nb = public.envois_journaliers.nb + 1
  where public.envois_journaliers.nb < v_quota
  returning nb into v_nb;

  if v_nb is null then
    raise exception 'Quota d''envoi quotidien atteint (20 e-mails). Réessayez demain.' using errcode = 'P0001';
  end if;

  return v_nb;
end;
$$;

create or replace function public.liberer_envoi_email(p_code text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nb integer;
begin
  update public.envois_journaliers
  set nb = nb - 1
  where licence_code = p_code
    and jour = (now() at time zone 'utc')::date
    and nb > 0
  returning nb into v_nb;

  return coalesce(v_nb, 0);
end;
$$;

revoke all on function public.consommer_credit_ia(text) from public;
revoke all on function public.restituer_credit_ia(text) from public;
revoke all on function public.reserver_envoi_email(text) from public;
revoke all on function public.liberer_envoi_email(text) from public;
revoke all on function public.verifier_licence(text) from public;
revoke all on table public.envois_journaliers from public;
revoke all on table public.cles_collecte from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function public.consommer_credit_ia(text) from anon';
    execute 'revoke all on function public.restituer_credit_ia(text) from anon';
    execute 'revoke all on function public.reserver_envoi_email(text) from anon';
    execute 'revoke all on function public.liberer_envoi_email(text) from anon';
    execute 'revoke all on function public.verifier_licence(text) from anon';
    execute 'revoke all on table public.envois_journaliers from anon';
    execute 'revoke all on table public.cles_collecte from anon';
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on function public.consommer_credit_ia(text) from authenticated';
    execute 'revoke all on function public.restituer_credit_ia(text) from authenticated';
    execute 'revoke all on function public.reserver_envoi_email(text) from authenticated';
    execute 'revoke all on function public.liberer_envoi_email(text) from authenticated';
    execute 'grant execute on function public.verifier_licence(text) to authenticated';
    execute 'revoke all on table public.envois_journaliers from authenticated';
    execute 'revoke all on table public.cles_collecte from authenticated';
  end if;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.consommer_credit_ia(text) to service_role';
    execute 'grant execute on function public.restituer_credit_ia(text) to service_role';
    execute 'grant execute on function public.reserver_envoi_email(text) to service_role';
    execute 'grant execute on function public.liberer_envoi_email(text) to service_role';
    execute 'grant execute on function public.verifier_licence(text) to service_role';
    execute 'grant select, insert, update, delete on table public.envois_journaliers to service_role';
    execute 'grant select, insert, update, delete on table public.cles_collecte to service_role';
    execute 'grant select, insert, update, delete on table public.offres_globales to service_role';
  end if;
end $$;

comment on function public.verifier_licence(text) is
  'Connexion par code de licence. Verrouille la ligne. Le slot d''appareil est auth.uid(), plafond 2.';
comment on function public.consommer_credit_ia(text) is
  'Décrément atomique des crédits IA. EXECUTE réservé à service_role.';
comment on function public.restituer_credit_ia(text) is
  'Recrédite un appel IA échoué. EXECUTE réservé à service_role.';
comment on function public.reserver_envoi_email(text) is
  'Réserve un envoi Brevo dans la limite de 20 par jour UTC. EXECUTE réservé à service_role.';
