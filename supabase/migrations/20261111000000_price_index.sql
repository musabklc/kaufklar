-- Kaufklar-Preisindex: anonyme Preisbeobachtungen (keine personenbezogenen Daten).
-- Zugriff ausschließlich über den Server mit dem Secret Key (Rolle service_role).

create table if not exists public.price_observations (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  make text not null,          -- normalisiert: klein, getrimmt
  model text not null,
  variant text,
  fuel text,
  year int,
  mileage_km int,
  power_kw int,
  price_eur int not null check (price_eur between 500 and 500000),
  source text not null check (source in ('listing', 'web')),
  source_url text unique                -- NULLs erlaubt (mehrfach), echte URLs nur einmal
);

create index if not exists price_observations_lookup on public.price_observations (make, model, fuel, year);

-- Kein Zugriff für anon/authenticated. RLS als zusätzliche Absicherung, falls später doch Grants vergeben werden.
alter table public.price_observations enable row level security;
revoke all on table public.price_observations from anon, authenticated;
grant select, insert on table public.price_observations to service_role;
