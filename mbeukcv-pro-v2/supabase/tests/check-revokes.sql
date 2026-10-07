-- À exécuter APRÈS supabase/schema.sql, sur une base où les rôles
-- anon, authenticated et service_role existent (projet Supabase).
-- Usage :
--   psql "$MBEUK_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/check-revokes.sql

do $$
declare
  v_admin text[] := array[
    'public.consommer_credit_ia(text)',
    'public.restituer_credit_ia(text)',
    'public.reserver_envoi_email(text)',
    'public.liberer_envoi_email(text)'
  ];
  v_fn text;
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'verifier_licence'
      and pg_get_function_identity_arguments(p.oid) = 'text, text'
  ) then
    raise exception 'L''ancienne surcharge verifier_licence(text, text) est encore présente.';
  end if;

  foreach v_fn in array v_admin loop
    if (
      select p.proacl is null
        or exists (
          select 1 from aclexplode(p.proacl) a
          where a.grantee = 0 and a.privilege_type = 'EXECUTE'
        )
      from pg_proc p
      where p.oid = v_fn::regprocedure
    ) then
      raise exception 'PUBLIC peut encore exécuter %', v_fn;
    end if;
    if exists (select 1 from pg_roles where rolname = 'anon')
       and has_function_privilege('anon', v_fn, 'execute') then
      raise exception 'anon peut encore exécuter %', v_fn;
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated')
       and has_function_privilege('authenticated', v_fn, 'execute') then
      raise exception 'authenticated peut encore exécuter %', v_fn;
    end if;
    if exists (select 1 from pg_roles where rolname = 'service_role')
       and not has_function_privilege('service_role', v_fn, 'execute') then
      raise exception 'service_role ne peut pas exécuter %', v_fn;
    end if;
  end loop;

  if (
    select p.proacl is null
      or exists (
        select 1 from aclexplode(p.proacl) a
        where a.grantee = 0 and a.privilege_type = 'EXECUTE'
      )
    from pg_proc p
    where p.oid = 'public.verifier_licence(text)'::regprocedure
  ) then
    raise exception 'PUBLIC peut encore exécuter verifier_licence.';
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon')
     and has_function_privilege('anon', 'public.verifier_licence(text)', 'execute') then
    raise exception 'anon peut encore exécuter verifier_licence.';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated')
     and not has_function_privilege('authenticated', 'public.verifier_licence(text)', 'execute') then
    raise exception 'authenticated ne peut pas exécuter verifier_licence.';
  end if;
end $$;
