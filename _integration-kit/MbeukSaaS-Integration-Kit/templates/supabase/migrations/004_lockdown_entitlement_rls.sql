-- ============================================================================
-- v1.8.0 — VERROUILLAGE RLS DES TABLES D'ENTITLEMENT (défense en profondeur)
-- ----------------------------------------------------------------------------
-- Invariant : "NO CONFIRMED ENTITLEMENT = NO STANDARD ACCESS."
-- Seules les Edge Functions (service_role) ont le droit d'écrire le statut
-- d'entitlement. Un client authentifié (rôle `authenticated`) ne doit JAMAIS
-- pouvoir s'auto-activer une licence, un essai, ou modifier son propre statut
-- de paiement/appareil — même en lecture seule sur ses propres lignes il ne
-- doit pas pouvoir écrire dessus.
--
-- Cette migration ne suppose pas la structure exacte du schéma hôte (le kit
-- s'installe sur un SaaS existant) : elle utilise des blocs conditionnels
-- pour s'appliquer uniquement aux tables réellement présentes.
-- ============================================================================

do $$
declare
  t text;
  tables text[] := array['subscriptions', 'licenses', 'license_history'];
begin
  foreach t in array tables loop
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = t) then
      execute format('alter table public.%I enable row level security', t);

      -- Lecture : chaque utilisateur ne voit que ses propres lignes.
      if not exists (
        select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = t || '_select_own'
      ) then
        execute format(
          'create policy %I on public.%I for select using (auth.uid() = user_id)',
          t || '_select_own', t
        );
      end if;

      -- Écriture (insert/update/delete) : AUCUNE policy pour authenticated/anon.
      -- Sans policy explicite pour ces commandes, RLS refuse par défaut.
      -- Seul service_role (utilisé par les Edge Functions) contourne RLS.
      -- On documente explicitement l'intention avec un commentaire :
      execute format(
        'comment on table public.%I is ''Cache entitlement — écriture réservée à service_role (Edge Functions). Aucune policy INSERT/UPDATE/DELETE pour authenticated/anon : c''''est volontaire (fail-closed).''',
        t
      );

      -- Révoque explicitement tout droit d'écriture hérité sur les rôles
      -- client, au cas où des GRANT larges existeraient déjà sur le schéma.
      execute format('revoke insert, update, delete on public.%I from authenticated', t);
      execute format('revoke insert, update, delete on public.%I from anon', t);
    end if;
  end loop;
end $$;

-- Idem pour les colonnes hub_* de profiles : un utilisateur peut lire son
-- profil, mais ne doit jamais pouvoir réécrire hub_user_id / hub_email /
-- hub_product_id lui-même (usurpation d'identité Hub / rattachement à un
-- autre compte Hub).
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'profiles') then
    execute 'alter table public.profiles enable row level security';

    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_select_own'
    ) then
      execute 'create policy profiles_select_own on public.profiles for select using (auth.uid() = id)';
    end if;

    -- Autorise la mise à jour de champs métier non sensibles par le
    -- propriétaire, mais PAS des colonnes d'identité Hub. PostgreSQL RLS ne
    -- filtre pas par colonne : on protège donc au niveau GRANT (colonnes)
    -- plutôt qu'au niveau policy, en complément d'une policy de ligne.
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_update_own'
    ) then
      execute 'create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id)';
    end if;

    execute 'revoke update (hub_user_id, hub_email, hub_product_id) on public.profiles from authenticated';
    execute 'revoke update (hub_user_id, hub_email, hub_product_id) on public.profiles from anon';
  end if;
end $$;

comment on schema public is
  'MbeukSaaS Integration Kit v1.8.0 — 004: RLS verrouillé sur les tables entitlement (voir SECURITY-AUDIT-v1.8.md §3).';
