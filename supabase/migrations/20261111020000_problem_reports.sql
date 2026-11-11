-- Von Kunden gemeldete Probleme ("Kaufklar-Community"). Keine personenbezogenen Daten:
-- statt IP nur ein gesalzener Hash, um unabhängige Melder zu zählen.
create table if not exists public.problem_reports (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  make text not null,            -- normalisiert: klein
  model text not null,
  engine_code text,
  year int,
  mileage_km int check (mileage_km between 0 and 1000000),
  component text not null,
  description text not null check (char_length(description) <= 600),
  cost_eur int check (cost_eur between 0 and 100000),
  status text not null check (status in ('approved', 'rejected', 'pending')),
  canonical_title text,
  moderation_note text,
  reporter_hash text not null
);
create index if not exists problem_reports_lookup on public.problem_reports (make, model, status);

alter table public.problem_reports enable row level security;
revoke all on table public.problem_reports from anon, authenticated;
grant select, insert on table public.problem_reports to service_role;
