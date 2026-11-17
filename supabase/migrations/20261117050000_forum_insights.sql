-- Erkenntnisse aus Forumsbeiträgen: die KI liest jeden neuen Beitrag und zieht Erfahrungen heraus
-- (Schwachstelle oder Pluspunkt zu einem Modell). Die Analyse zeigt sie unter "Aus dem Forum" mit Link zum Beitrag.
create table if not exists public.forum_insights (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.forum_posts (id) on delete cascade,
  thread_id bigint not null references public.forum_threads (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  make text not null,
  model text not null,
  engine_code text,
  year int,
  kind text not null check (kind in ('schwachstelle', 'pluspunkt')),
  title text not null check (char_length(title) between 3 and 80),
  component text not null,
  mileage_km int,
  cost_eur int,
  created_at timestamptz not null default now()
);
create index if not exists forum_insights_make on public.forum_insights (make);
create index if not exists forum_insights_post on public.forum_insights (post_id);

-- Nur der Server (geheimer Schlüssel) liest und schreibt; Besucher sehen die Ergebnisse über die Analyse
alter table public.forum_insights enable row level security;
revoke all on public.forum_insights from anon, authenticated;

-- Merker, welche Beiträge die KI schon gelesen hat (Nachholen per Cron, falls die KI beim Schreiben ausgelastet war)
alter table public.forum_posts add column if not exists insights_at timestamptz;
create index if not exists forum_posts_insights_pending on public.forum_posts (created_at) where insights_at is null;
