-- Keep text columns: PostgreSQL does not gain storage/performance benefits from
-- varchar(n). CHECK constraints express the domain and can be added NOT VALID
-- so legacy rows do not block deployment while every new write is protected.

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'players_first_name_valid') then
    alter table public.players add constraint players_first_name_valid
      check (char_length(btrim(first_name)) between 1 and 60
        and btrim(first_name) ~ '^[[:alpha:]][[:alpha:] .''-]*$') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'players_last_name_valid') then
    alter table public.players add constraint players_last_name_valid
      check (char_length(btrim(last_name)) between 1 and 80
        and btrim(last_name) ~ '^[[:alpha:]][[:alpha:] .''-]*$') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'players_dorsal_valid') then
    alter table public.players add constraint players_dorsal_valid
      check (dorsal is null or dorsal between 0 and 999) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'players_position_valid') then
    alter table public.players add constraint players_position_valid
      check (position is null or position in ('No especificada', 'Portero', 'Defensa', 'Medio', 'Delantero')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'players_identity_valid') then
    alter table public.players add constraint players_identity_valid
      check (curp_dni is null or (char_length(btrim(curp_dni)) between 1 and 30
        and btrim(curp_dni) ~ '^[[:alnum:]][[:alnum:] ./_-]*$')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'teams_name_valid') then
    alter table public.teams add constraint teams_name_valid
      check (char_length(btrim(name)) between 1 and 80
        and btrim(name) ~ '^[[:alnum:]][[:alnum:] .&''()/-]*$') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'teams_delegate_name_valid') then
    alter table public.teams add constraint teams_delegate_name_valid
      check (delegate_name is null or (char_length(btrim(delegate_name)) between 1 and 120
        and btrim(delegate_name) ~ '^[[:alpha:]][[:alpha:] .''-]*$')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'teams_contact_phone_valid') then
    alter table public.teams add constraint teams_contact_phone_valid
      check (contact_phone is null or (char_length(btrim(contact_phone)) between 7 and 25
        and btrim(contact_phone) ~ '^\+?[0-9][0-9 ()-]*[0-9]$')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'teams_color_valid') then
    alter table public.teams add constraint teams_color_valid
      check (color is null or color ~ '^#[0-9A-Fa-f]{6}$') not valid;
  end if;
end
$$;

comment on constraint players_first_name_valid on public.players is
  'Application input contract; NOT VALID permits cleanup of legacy rows separately.';
comment on constraint teams_name_valid on public.teams is
  'Application input contract; NOT VALID permits cleanup of legacy rows separately.';
