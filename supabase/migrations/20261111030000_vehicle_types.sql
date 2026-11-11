-- EU-Typdaten (EEA CO2-Monitoring Pkw, CC BY 4.0), verdichtet auf eine Zeile je Marke/Handelsname/Kraftstoff/Hubraum/kW/Jahr.
-- Import: node scripts/import-eea.mjs 2010 2025
create table if not exists public.vehicle_types (
  make text not null,
  name text not null,
  fuel text not null,
  ccm int not null,
  kw int not null,
  year int not null,
  co2 int,
  fc numeric(4,1),
  mass_kg int,
  tan text,
  engine_code text,
  n int not null,
  primary key (make, name, fuel, ccm, kw, year)
);
create index if not exists vehicle_types_lookup on public.vehicle_types (make, year, kw, ccm);

alter table public.vehicle_types enable row level security;
revoke all on table public.vehicle_types from anon, authenticated;
grant select, insert, update on table public.vehicle_types to service_role;
