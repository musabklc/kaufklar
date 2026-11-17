-- Forum: Unterforen, Profile, Themen, Beiträge, Meldungen.
-- Lesen öffentlich, Schreiben nur angemeldet und nur im eigenen Namen. Trigger-Funktionen im nicht freigegebenen Schema "private".
create schema if not exists private;

create table if not exists public.forum_boards (
  id text primary key,
  title text not null,
  description text not null default '',
  grp text not null,
  sort int not null default 0
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[A-Za-z0-9_.-]{3,24}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.forum_threads (
  id bigint generated always as identity primary key,
  board_id text not null references public.forum_boards (id),
  author_id uuid references public.profiles (id) on delete set null,
  title text not null check (char_length(title) between 5 and 120),
  created_at timestamptz not null default now(),
  last_post_at timestamptz not null default now(),
  post_count int not null default 0
);
create index if not exists forum_threads_board on public.forum_threads (board_id, last_post_at desc);

create table if not exists public.forum_posts (
  id bigint generated always as identity primary key,
  thread_id bigint not null references public.forum_threads (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(body) between 2 and 5000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  hidden boolean not null default false
);
create index if not exists forum_posts_thread on public.forum_posts (thread_id, created_at);
create index if not exists forum_posts_author on public.forum_posts (author_id, created_at desc);

create table if not exists public.forum_reports (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.forum_posts (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 500),
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);

alter table public.forum_boards enable row level security;
alter table public.profiles enable row level security;
alter table public.forum_threads enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_reports enable row level security;

-- Lesen: öffentlich; ausgeblendete Beiträge sieht nur ihr Verfasser
create policy "boards lesen" on public.forum_boards for select to anon, authenticated using (true);
create policy "profile lesen" on public.profiles for select to anon, authenticated using (true);
create policy "themen lesen" on public.forum_threads for select to anon, authenticated using (true);
create policy "beitraege lesen" on public.forum_posts for select to anon, authenticated
  using (not hidden or (select auth.uid()) = author_id);

-- Schreiben: nur angemeldet, nur im eigenen Namen (USING + WITH CHECK gegen Umschreiben auf andere)
create policy "thema anlegen" on public.forum_threads for insert to authenticated
  with check ((select auth.uid()) = author_id);
create policy "beitrag schreiben" on public.forum_posts for insert to authenticated
  with check ((select auth.uid()) = author_id);
create policy "eigenen beitrag bearbeiten" on public.forum_posts for update to authenticated
  using ((select auth.uid()) = author_id) with check ((select auth.uid()) = author_id);
create policy "eigenen beitrag loeschen" on public.forum_posts for delete to authenticated
  using ((select auth.uid()) = author_id);
create policy "melden" on public.forum_reports for insert to authenticated
  with check ((select auth.uid()) = reporter_id);

-- Supabase gibt neuen Tabellen volle Rechte: zurücknehmen, dann nur die nötigen Spalten erlauben
-- (sonst könnte man z. B. den eigenen, wegen Meldungen ausgeblendeten Beitrag wieder einblenden).
revoke all on public.forum_boards, public.profiles, public.forum_threads, public.forum_posts, public.forum_reports from anon, authenticated;
grant select on public.forum_boards, public.profiles, public.forum_threads, public.forum_posts to anon, authenticated;
grant insert (board_id, author_id, title) on public.forum_threads to authenticated;
grant insert (thread_id, author_id, body) on public.forum_posts to authenticated;
grant update (body, edited_at) on public.forum_posts to authenticated;
grant delete on public.forum_posts to authenticated;
grant insert (post_id, reporter_id, reason) on public.forum_reports to authenticated;

-- Profil beim Registrieren anlegen (Benutzername aus der Anmeldung; der CHECK oben prüft ihn)
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username) values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- Zähler pflegen; Spam-Bremse: höchstens 8 Beiträge in 10 Minuten je Konto
create or replace function private.forum_post_inserted() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.forum_posts
      where author_id = new.author_id and created_at > now() - interval '10 minutes') > 8 then
    raise exception 'Zu viele Beiträge in kurzer Zeit. Bitte warte ein paar Minuten.';
  end if;
  update public.forum_threads set post_count = post_count + 1, last_post_at = new.created_at where id = new.thread_id;
  return new;
end $$;
drop trigger if exists forum_post_inserted on public.forum_posts;
create trigger forum_post_inserted after insert on public.forum_posts
  for each row execute function private.forum_post_inserted();

-- Melden (DSA): ab 3 Meldungen wird ein Beitrag ausgeblendet, bis ein Admin ihn prüft
create or replace function private.forum_report_inserted() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.forum_reports where post_id = new.post_id) >= 3 then
    update public.forum_posts set hidden = true where id = new.post_id;
  end if;
  return new;
end $$;
drop trigger if exists forum_report_inserted on public.forum_reports;
create trigger forum_report_inserted after insert on public.forum_reports
  for each row execute function private.forum_report_inserted();

revoke all on function private.handle_new_user(), private.forum_post_inserted(), private.forum_report_inserted()
  from public, anon, authenticated;

insert into public.forum_boards (id, title, description, grp, sort) values
  ('kaufberatung', 'Kaufberatung', 'Welches Auto passt zu mir? Fragen vor dem Kauf.', 'Allgemein', 1),
  ('inserate', 'Inserat-Check', 'Inserat gefunden? Frag die Community, bevor du zusagst.', 'Allgemein', 2),
  ('erfahrungen', 'Erfahrungen & Pannen', 'Was ist bei euch kaputtgegangen, und was hat es gekostet?', 'Allgemein', 3),
  ('werkstatt', 'Werkstatt & Technik', 'Reparatur, Wartung, Fehlersuche.', 'Allgemein', 4),
  ('audi', 'Audi', '', 'Marken', 10),
  ('bmw', 'BMW', '', 'Marken', 11),
  ('mercedes', 'Mercedes-Benz', '', 'Marken', 12),
  ('vw', 'Volkswagen', '', 'Marken', 13),
  ('opel', 'Opel', '', 'Marken', 14),
  ('ford', 'Ford', '', 'Marken', 15),
  ('skoda', 'Škoda', '', 'Marken', 16),
  ('seat-cupra', 'Seat & Cupra', '', 'Marken', 17),
  ('toyota', 'Toyota', '', 'Marken', 18),
  ('hyundai-kia', 'Hyundai & Kia', '', 'Marken', 19),
  ('renault-dacia', 'Renault & Dacia', '', 'Marken', 20),
  ('peugeot-citroen', 'Peugeot & Citroën', '', 'Marken', 21),
  ('mazda', 'Mazda', '', 'Marken', 22),
  ('volvo', 'Volvo', '', 'Marken', 23),
  ('elektro', 'Elektroautos & Hybride', 'Akku, Reichweite, Laden.', 'Marken', 24),
  ('sonstige', 'Sonstige Marken', '', 'Marken', 30)
on conflict (id) do nothing;
