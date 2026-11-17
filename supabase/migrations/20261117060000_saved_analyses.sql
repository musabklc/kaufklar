-- Merkliste: Analysen im Konto (auf allen Geräten) und optionaler Preisalarm per E-Mail.
create table if not exists public.saved_analyses (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null check (octet_length(data::text) < 400000),
  title text not null check (char_length(title) between 1 and 120),
  listing_url text check (listing_url ~ '^https://'),
  price_eur int,
  watch boolean not null default false,
  -- nur der Server (Preisalarm) schreibt diese Felder
  last_price int,
  last_checked_at timestamptz,
  gone_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists saved_analyses_user on public.saved_analyses (user_id, created_at desc);
create index if not exists saved_analyses_watch on public.saved_analyses (last_checked_at nulls first) where watch and gone_at is null and listing_url is not null;

alter table public.saved_analyses enable row level security;
create policy "eigene merkliste lesen" on public.saved_analyses for select to authenticated using ((select auth.uid()) = user_id);
create policy "eigene merkliste anlegen" on public.saved_analyses for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "eigene merkliste aendern" on public.saved_analyses for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "eigene merkliste loeschen" on public.saved_analyses for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.saved_analyses from anon, authenticated;
grant select, delete on public.saved_analyses to authenticated;
grant insert (id, data, title, listing_url, price_eur, watch) on public.saved_analyses to authenticated;
grant update (data, title, watch) on public.saved_analyses to authenticated;
