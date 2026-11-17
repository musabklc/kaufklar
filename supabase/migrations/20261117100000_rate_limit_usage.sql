-- Kostenkontrolle: Anfragen-Limit über alle Server-Instanzen hinweg und ein Ereignisprotokoll (KI-Aufrufe, Tokens, Fehler).
-- Beide Tabellen nur für den Server (Secret Key); keine IP-Adressen, nur gesalzene Hashes.

create table if not exists public.rate_hits (
  key text not null,
  at timestamptz not null default now()
);
create index if not exists rate_hits_key_at on public.rate_hits (key, at);
create index if not exists rate_hits_at on public.rate_hits (at);
alter table public.rate_hits enable row level security;
revoke all on public.rate_hits from anon, authenticated;

-- true = Limit überschritten. Zählt den Aufruf mit (auch abgelehnte, damit Dauerfeuer gesperrt bleibt).
create or replace function public.rate_hit(p_key text, p_per_minute int, p_per_day int) returns boolean
language plpgsql set search_path = '' as $$
declare
  minute_n int;
  day_n int;
begin
  insert into public.rate_hits (key) values (p_key);
  select count(*) filter (where at > now() - interval '1 minute'), count(*)
    into minute_n, day_n
    from public.rate_hits where key = p_key and at > now() - interval '1 day';
  -- gelegentlich aufräumen, damit die Tabelle nicht wächst
  if random() < 0.02 then delete from public.rate_hits where at < now() - interval '1 day'; end if;
  return minute_n > p_per_minute or day_n > p_per_day;
end $$;
revoke execute on function public.rate_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.rate_hit(text, int, int) to service_role;

create table if not exists public.usage_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  kind text not null check (kind in ('ai', 'analyze', 'extract')),
  op text check (char_length(op) <= 40),
  model text check (char_length(model) <= 60),
  ok boolean not null,
  ms int,
  input_tokens int,
  output_tokens int,
  error text check (char_length(error) <= 300)
);
create index if not exists usage_events_kind_at on public.usage_events (kind, at);
alter table public.usage_events enable row level security;
revoke all on public.usage_events from anon, authenticated;
