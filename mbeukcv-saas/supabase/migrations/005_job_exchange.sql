-- Mbeuk Job Exchange ↔ CVPro

alter table public.job_offers
  add column if not exists external_ref text,
  add column if not exists content_fingerprint text;

create unique index if not exists job_offers_source_external_ref_uidx
  on public.job_offers (source, external_ref)
  where external_ref is not null;

create index if not exists job_offers_fingerprint_idx
  on public.job_offers (content_fingerprint)
  where content_fingerprint is not null;

alter table public.user_profiles
  add column if not exists professional_discovery_enabled boolean not null default false;

alter table public.applications
  add column if not exists offer_source text,
  add column if not exists company_name text,
  add column if not exists invitation_id uuid,
  add column if not exists channel text not null default 'email';

create table if not exists public.job_exchange_invitations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid not null references public.job_offers (id) on delete cascade,
  company_name text not null,
  status text not null default 'DISCOVERED'
    check (status in ('DISCOVERED', 'INVITED', 'VIEWED', 'INTERESTED', 'APPLIED', 'DECLINED', 'EXPIRED')),
  match_score integer,
  match_note text,
  offer_summary text,
  invited_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id)
);

create index if not exists job_exchange_invitations_user_idx
  on public.job_exchange_invitations (user_id, updated_at desc);

create index if not exists job_exchange_invitations_job_idx
  on public.job_exchange_invitations (job_id, status);

alter table public.applications
  drop constraint if exists applications_invitation_id_fkey;

alter table public.applications
  add constraint applications_invitation_id_fkey
  foreign key (invitation_id) references public.job_exchange_invitations (id) on delete set null;

create table if not exists public.application_snapshots (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  cv_data jsonb not null,
  documents jsonb not null default '[]'::jsonb,
  consent_at timestamptz not null,
  consent_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists application_snapshots_application_idx
  on public.application_snapshots (application_id);

create table if not exists public.job_exchange_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  invitation_id uuid references public.job_exchange_invitations (id) on delete set null,
  kind text not null default 'opportunity',
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists job_exchange_notifications_user_idx
  on public.job_exchange_notifications (user_id, created_at desc);

alter table public.job_exchange_invitations enable row level security;
alter table public.application_snapshots enable row level security;
alter table public.job_exchange_notifications enable row level security;

drop policy if exists job_exchange_invitations_own on public.job_exchange_invitations;
create policy job_exchange_invitations_own on public.job_exchange_invitations
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists application_snapshots_via_application on public.application_snapshots;
create policy application_snapshots_via_application on public.application_snapshots
  for select to authenticated
  using (
    exists (
      select 1 from public.applications a
      where a.id = application_id and a.user_id = auth.uid()
    )
  );

drop policy if exists job_exchange_notifications_own on public.job_exchange_notifications;
create policy job_exchange_notifications_own on public.job_exchange_notifications
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on table public.job_exchange_invitations from public, anon, authenticated;
grant select, insert, update on table public.job_exchange_invitations to authenticated;

revoke all on table public.application_snapshots from public, anon, authenticated;
grant select on table public.application_snapshots to authenticated;

revoke all on table public.job_exchange_notifications from public, anon, authenticated;
grant select, update on table public.job_exchange_notifications to authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant select, insert, update, delete on table public.job_exchange_invitations to service_role';
    execute 'grant select, insert, update, delete on table public.application_snapshots to service_role';
    execute 'grant select, insert, update, delete on table public.job_exchange_notifications to service_role';
  end if;
end $$;

-- Colonne discovery : lecture / mise à jour par le titulaire du compte
grant select (id, full_name, email, phone, cv_data, use_byok, professional_discovery_enabled)
  on table public.user_profiles to authenticated;
grant update (full_name, email, phone, cv_data, use_byok, professional_discovery_enabled)
  on table public.user_profiles to authenticated;
