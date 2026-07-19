-- Blank legacy values were preserved when the optional team-field constraints
-- were added as NOT VALID. PostgreSQL still checks those rows on any later
-- UPDATE, so a delegate-name change could fail even though the phone was
-- untouched. Normalize both optional fields in the same statement because each
-- constraint is evaluated against the updated row.
update public.teams
set
  delegate_name = nullif(btrim(delegate_name), ''),
  contact_phone = nullif(btrim(contact_phone), '')
where (delegate_name is not null and btrim(delegate_name) = '')
   or (contact_phone is not null and btrim(contact_phone) = '');

alter table public.teams
  validate constraint teams_delegate_name_valid;

alter table public.teams
  validate constraint teams_contact_phone_valid;
