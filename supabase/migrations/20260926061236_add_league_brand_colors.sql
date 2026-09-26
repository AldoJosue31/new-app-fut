alter table public.leagues
  add column primary_color text,
  add column secondary_color text,
  add constraint leagues_primary_color_hex check (
    primary_color is null or primary_color ~ '^#[0-9A-Fa-f]{6}$'
  ),
  add constraint leagues_secondary_color_hex check (
    secondary_color is null or secondary_color ~ '^#[0-9A-Fa-f]{6}$'
  );

comment on column public.leagues.primary_color is 'League brand color, stored as #RRGGBB. Null for leagues not configured yet.';
comment on column public.leagues.secondary_color is 'Optional secondary league brand color, stored as #RRGGBB.';
