create table if not exists public.delegate_account_audit_logs (
  id uuid primary key default gen_random_uuid(),
  team_id bigint not null,
  delegate_profile_id uuid not null,
  actor_profile_id uuid not null,
  reason text not null check (char_length(btrim(reason)) between 5 and 240),
  changed_fields text[] not null check (
    cardinality(changed_fields) > 0
    and changed_fields <@ array['name', 'email', 'password']::text[]
  ),
  created_at timestamptz not null default now()
);

create index if not exists delegate_account_audit_logs_team_created_idx
  on public.delegate_account_audit_logs (team_id, created_at desc);

create index if not exists delegate_account_audit_logs_delegate_created_idx
  on public.delegate_account_audit_logs (delegate_profile_id, created_at desc);

alter table public.delegate_account_audit_logs enable row level security;

drop policy if exists "League managers read delegate account audits"
  on public.delegate_account_audit_logs;
create policy "League managers read delegate account audits"
  on public.delegate_account_audit_logs
  for select
  to authenticated
  using (
    actor_profile_id = (select auth.uid())
    or app_private.is_admin()
    or app_private.is_league_admin(app_private.team_league_id(team_id))
  );

revoke all on table public.delegate_account_audit_logs from public, anon, authenticated;
grant select on table public.delegate_account_audit_logs to authenticated;
grant all on table public.delegate_account_audit_logs to service_role;

create table if not exists public.account_security_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  message text not null check (char_length(message) between 1 and 500),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists account_security_notifications_unread_idx
  on public.account_security_notifications (user_id, created_at)
  where read_at is null;

alter table public.account_security_notifications enable row level security;

drop policy if exists "Users read own security notifications"
  on public.account_security_notifications;
create policy "Users read own security notifications"
  on public.account_security_notifications
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users acknowledge own security notifications"
  on public.account_security_notifications;
create policy "Users acknowledge own security notifications"
  on public.account_security_notifications
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.account_security_notifications from public, anon, authenticated;
grant select on table public.account_security_notifications to authenticated;
grant update (read_at) on table public.account_security_notifications to authenticated;
grant all on table public.account_security_notifications to service_role;

alter table public.account_security_notifications replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'account_security_notifications'
  ) then
    execute 'alter publication supabase_realtime add table public.account_security_notifications';
  end if;
end;
$$;

comment on table public.delegate_account_audit_logs is
  'Immutable application audit trail for manager-initiated delegate account changes.';

comment on table public.account_security_notifications is
  'Unread account-security notices delivered to delegates in the application.';
