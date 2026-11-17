-- Premium-Bericht (Einmalzahlung über Stripe Checkout). Freischaltung nur durch den Server nach bestätigter Zahlung.

alter table public.analyses add column if not exists premium_at timestamptz;

-- Eine Zeile pro Checkout Session. Bleibt erhalten, auch wenn die Analyse gelöscht wird (Buchhaltung).
create table if not exists public.payments (
  session_id text primary key check (session_id ~ '^cs_'),
  analysis_id uuid references public.analyses (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  amount_cents int not null check (amount_cents > 0),
  currency text not null default 'eur',
  status text not null default 'offen' check (status in ('offen', 'bezahlt', 'fehlgeschlagen')),
  -- Zustimmung zum sofortigen Beginn / Erlöschen des Widerrufsrechts (§ 356 Abs. 5 BGB)
  consent_at timestamptz not null,
  payment_intent text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists payments_analysis on public.payments (analysis_id);
create index if not exists payments_paid on public.payments (paid_at) where status = 'bezahlt';
alter table public.payments enable row level security;
revoke all on public.payments from anon, authenticated;

-- Jedes Stripe-Ereignis nur einmal verarbeiten (Stripe stellt Webhooks mitunter mehrfach zu).
create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
revoke all on public.stripe_events from anon, authenticated;
