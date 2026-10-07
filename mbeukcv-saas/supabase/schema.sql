-- Schéma métier. À exécuter dans l'éditeur SQL du projet central,
-- puis dans chaque projet Supabase personnel (mode BYOK).
-- Les clés service_role des utilisateurs ne sont pas en clair :
-- l'application y écrit un texte chiffré.

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create table if not exists public.job_offers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text not null,
  location text,
  type text not null check (type in ('job', 'scholarship', 'concours', 'other')),
  source text not null,
  url text not null unique,
  description text,
  skills text[] not null default '{}',
  contact_email text,
  date_posted date,
  deadline_date date,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists job_offers_active_expires_idx
  on public.job_offers (is_active, expires_at);

create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  phone text,
  cv_data jsonb not null default '{}'::jsonb,
  supabase_url text,
  supabase_anon_key text,
  supabase_service_role_key text,
  rapidapi_key text,
  claude_api_key text,
  use_byok boolean not null default false,
  claude_credits integer not null default 8,
  rapidapi_credits integer not null default 6,
  updated_at timestamptz not null default now()
);

-- Les offres sont dans cette base centrale. RapidAPI est la clé de la plateforme, pas un forfait client.
-- Le compteur Claude est dans auth.users.raw_app_meta_data -> mbeuk_credits.
-- Quota gratuit : 2 actions Claude, une fois, puis de nouveau après 365 jours.
-- Les crédits achetés sont dans claudeBought. Ne pas effacer mbeuk_claude ni mbeuk_alert.
-- Plafond du jour, heure de Douala : 3 actions Claude.
-- L'alerte métier est dans raw_app_meta_data -> mbeuk_alert. Elle ne déclenche pas RapidAPI.

alter table public.user_profiles add column if not exists claude_credits integer not null default 8;
alter table public.user_profiles add column if not exists rapidapi_credits integer not null default 6;

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  job_id uuid references public.job_offers (id) on delete set null,
  applied_at timestamptz not null default now(),
  status text not null default 'envoyee',
  cover_letter text,
  job_title text,
  job_url text
);

create index if not exists applications_user_idx on public.applications (user_id, applied_at desc);

create table if not exists public.credit_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  used_on date not null,
  claude_used integer not null default 0,
  rapidapi_used integer not null default 0,
  primary key (user_id, used_on)
);

alter table public.job_offers enable row level security;
alter table public.user_profiles enable row level security;
alter table public.applications enable row level security;
alter table public.credit_usage enable row level security;

drop policy if exists job_offers_read_active on public.job_offers;
create policy job_offers_read_active on public.job_offers
  for select to authenticated
  using (is_active = true and (expires_at is null or expires_at >= now()));

drop policy if exists profiles_select_own on public.user_profiles;
create policy profiles_select_own on public.user_profiles
  for select to authenticated
  using (id = auth.uid());

drop policy if exists profiles_update_own on public.user_profiles;
create policy profiles_update_own on public.user_profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists profiles_insert_own on public.user_profiles;
create policy profiles_insert_own on public.user_profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists applications_own on public.applications;
create policy applications_own on public.applications
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on table public.job_offers from public, anon, authenticated;
grant select on table public.job_offers to authenticated;

revoke all on table public.user_profiles from public, anon, authenticated;
grant select (id, full_name, email, phone, cv_data, use_byok) on table public.user_profiles to authenticated;
grant insert (id, full_name, email, phone, cv_data, use_byok) on table public.user_profiles to authenticated;
grant update (full_name, email, phone, cv_data, use_byok) on table public.user_profiles to authenticated;

revoke all on table public.applications from public, anon, authenticated;
grant select, insert, update, delete on table public.applications to authenticated;

revoke all on table public.credit_usage from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant select, insert, update, delete on table public.job_offers to service_role';
    execute 'grant select, insert, update, delete on table public.user_profiles to service_role';
    execute 'grant select, insert, update, delete on table public.applications to service_role';
    execute 'grant select, insert, update, delete on table public.credit_usage to service_role';
  end if;
end $$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function public.consume_credit(p_user uuid, p_kind text)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  cap integer := case when p_kind = 'claude' then 3 else 2 end;
  used integer;
  balance integer;
  today date := (timezone('Africa/Douala', now()))::date;
begin
  if p_kind not in ('claude', 'rapidapi') then
    return jsonb_build_object('ok', false, 'reason', 'Type de crédit inconnu.');
  end if;

  perform 1 from public.user_profiles where id = p_user for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'Compte introuvable.');
  end if;

  insert into public.credit_usage (user_id, used_on)
  values (p_user, today)
  on conflict (user_id, used_on) do nothing;

  if p_kind = 'claude' then
    select claude_used into used from public.credit_usage where user_id = p_user and used_on = today;
    select claude_credits into balance from public.user_profiles where id = p_user;
    if coalesce(used, 0) >= cap then
      return jsonb_build_object('ok', false, 'reason', 'Plafond du jour atteint pour Claude : 3 actions. Réessayez demain, ou demandez un rechargement.');
    end if;
    if coalesce(balance, 0) <= 0 then
      return jsonb_build_object('ok', false, 'reason', 'Crédit Claude épuisé. Demandez un rechargement depuis Paramètres.');
    end if;
    update public.user_profiles set claude_credits = claude_credits - 1 where id = p_user;
    update public.credit_usage set claude_used = claude_used + 1 where user_id = p_user and used_on = today;
  else
    select rapidapi_used into used from public.credit_usage where user_id = p_user and used_on = today;
    select rapidapi_credits into balance from public.user_profiles where id = p_user;
    if coalesce(used, 0) >= cap then
      return jsonb_build_object('ok', false, 'reason', 'Plafond du jour atteint pour RapidAPI : 2 recherches. Réessayez demain, ou demandez un rechargement.');
    end if;
    if coalesce(balance, 0) <= 0 then
      return jsonb_build_object('ok', false, 'reason', 'Crédit RapidAPI épuisé. Demandez un rechargement depuis Paramètres.');
    end if;
    update public.user_profiles set rapidapi_credits = rapidapi_credits - 1 where id = p_user;
    update public.credit_usage set rapidapi_used = rapidapi_used + 1 where user_id = p_user and used_on = today;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.refund_credit(p_user uuid, p_kind text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  today date := (timezone('Africa/Douala', now()))::date;
begin
  if p_kind = 'claude' then
    update public.user_profiles set claude_credits = claude_credits + 1 where id = p_user;
    update public.credit_usage set claude_used = greatest(0, claude_used - 1) where user_id = p_user and used_on = today;
  elsif p_kind = 'rapidapi' then
    update public.user_profiles set rapidapi_credits = rapidapi_credits + 1 where id = p_user;
    update public.credit_usage set rapidapi_used = greatest(0, rapidapi_used - 1) where user_id = p_user and used_on = today;
  end if;
end;
$$;

revoke all on function public.consume_credit(uuid, text) from public, anon, authenticated;
revoke all on function public.refund_credit(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_credit(uuid, text) to service_role;
grant execute on function public.refund_credit(uuid, text) to service_role;
