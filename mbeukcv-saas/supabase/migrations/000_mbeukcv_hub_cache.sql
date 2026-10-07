-- Cache Hub pour MbeukCV. Le métier reste dans user_profiles, job_offers et applications.
-- Ces tables n'existaient pas : les migrations du kit les modifient ensuite.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  phone text,
  hub_user_id text,
  hub_email text,
  hub_product_id uuid,
  business_role text,
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text,
  status text,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  expires_at timestamptz,
  max_devices integer,
  hub_license_id text,
  hub_access_type text,
  hub_last_sync_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.license_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  event text,
  details jsonb
);

create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade
);
