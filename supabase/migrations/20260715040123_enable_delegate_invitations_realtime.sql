do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'delegate_invitations'
  ) then
    alter publication supabase_realtime add table public.delegate_invitations;
  end if;
end
$$;;
