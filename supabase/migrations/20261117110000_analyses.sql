-- Jede Analyse wird auf dem Server gespeichert: Grundlage für die spätere Premium-Freischaltung (Inhalte nur vom Server)
-- und für Links, die auf jedem Gerät funktionieren. Nur der Server greift zu (Secret Key); die zufällige UUID ist der Zugangsschlüssel.

create table if not exists public.analyses (
  id uuid primary key,
  user_id uuid references auth.users (id) on delete cascade,
  result jsonb not null check (octet_length(result::text) < 400000),
  created_at timestamptz not null default now()
);
create index if not exists analyses_user on public.analyses (user_id, created_at desc) where user_id is not null;
-- Aufräumen ohne Konto (nach 90 Tagen)
create index if not exists analyses_anon_created on public.analyses (created_at) where user_id is null;

alter table public.analyses enable row level security;
revoke all on public.analyses from anon, authenticated;
