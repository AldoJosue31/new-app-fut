-- The connected project has no existing values over these tighter limits.
-- Recreate only the affected constraints, preserving their character rules.

alter table public.players drop constraint if exists players_first_name_valid;
alter table public.players add constraint players_first_name_valid
  check (char_length(btrim(first_name)) between 1 and 35
    and btrim(first_name) ~ '^[[:alpha:]][[:alpha:] .''-]*$') not valid;

alter table public.players drop constraint if exists players_last_name_valid;
alter table public.players add constraint players_last_name_valid
  check (char_length(btrim(last_name)) between 1 and 45
    and btrim(last_name) ~ '^[[:alpha:]][[:alpha:] .''-]*$') not valid;

alter table public.teams drop constraint if exists teams_name_valid;
alter table public.teams add constraint teams_name_valid
  check (char_length(btrim(name)) between 1 and 50
    and btrim(name) ~ '^[[:alnum:]][[:alnum:] .&''()/-]*$') not valid;

alter table public.teams drop constraint if exists teams_delegate_name_valid;
alter table public.teams add constraint teams_delegate_name_valid
  check (delegate_name is null or (char_length(btrim(delegate_name)) between 1 and 60
    and btrim(delegate_name) ~ '^[[:alpha:]][[:alpha:] .''-]*$')) not valid;
