-- EU-Rückrufe für Kraftfahrzeuge aus "Safety Gate" (Europäische Kommission), Lizenz CC BY 4.0.
-- Import: node scripts/import-safety-gate.mjs (wöchentlich wiederholbar, idempotent über case_number).
create table if not exists public.recalls_eu (
  case_number text primary key,
  published date,
  brand text not null,
  name text,
  type_approval text,
  production_dates text,
  risk_type text,
  danger text,
  measures text,
  url text
);
create index if not exists recalls_eu_brand on public.recalls_eu (lower(brand));

alter table public.recalls_eu enable row level security;
revoke all on table public.recalls_eu from anon, authenticated;
grant select, insert, update on table public.recalls_eu to service_role;
