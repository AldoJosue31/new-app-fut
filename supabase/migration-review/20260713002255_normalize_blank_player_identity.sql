create or replace function app_private.normalize_player_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.curp_dni := nullif(btrim(new.curp_dni), '');
  return new;
end;
$$;

revoke all on function app_private.normalize_player_identity() from public, anon, authenticated;

drop trigger if exists normalize_player_identity_before_write on public.players;
create trigger normalize_player_identity_before_write
before insert or update of curp_dni on public.players
for each row
execute function app_private.normalize_player_identity();

comment on function app_private.normalize_player_identity() is
  'Canonicalizes an optional blank player identity to NULL before CHECK constraints run.';
