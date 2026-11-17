-- Recherche-Datenbank: Schwachstellen je Fahrzeugtyp, einmal per KI + Google-Suche recherchiert und für alle weiteren Analysen gespeichert.
-- Nur der Server greift zu (Secret Key).

create table if not exists public.model_research (
  key text primary key check (char_length(key) <= 160),
  label text,
  status text not null default 'laeuft' check (status in ('laeuft', 'fertig', 'fehler')),
  identified_as text,
  weak_points jsonb check (weak_points is null or octet_length(weak_points::text) < 60000),
  sources jsonb not null default '[]'::jsonb,
  model text,
  started_at timestamptz not null default now(),
  researched_at timestamptz,
  uses int not null default 0
);
create index if not exists model_research_researched on public.model_research (researched_at desc);
alter table public.model_research enable row level security;
revoke all on public.model_research from anon, authenticated;

-- Recherche für einen Typ übernehmen – true nur für genau einen Aufrufer (keine doppelten Google-Suchen bei gleichzeitigen Analysen).
-- Neu recherchiert wird, wenn es den Typ noch nicht gibt, die letzte Recherche älter als ein Jahr ist,
-- ein Versuch vor über einer Stunde fehlschlug oder einer seit über 10 Minuten hängt.
create or replace function public.claim_research(p_key text, p_label text) returns boolean
language sql set search_path = '' as $$
  insert into public.model_research (key, label, status, started_at) values (p_key, p_label, 'laeuft', now())
  on conflict (key) do update set status = 'laeuft', started_at = now(), label = excluded.label
    where (model_research.status = 'fertig' and model_research.researched_at < now() - interval '365 days')
       or (model_research.status = 'fehler' and model_research.started_at < now() - interval '1 hour')
       or (model_research.status = 'laeuft' and model_research.started_at < now() - interval '10 minutes')
  returning true;
$$;
revoke execute on function public.claim_research(text, text) from public, anon, authenticated;
grant execute on function public.claim_research(text, text) to service_role;
