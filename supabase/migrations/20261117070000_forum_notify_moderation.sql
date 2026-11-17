-- Antwort-Benachrichtigung, Moderation (Admin, Sperre), Meldungen als erledigt markieren.
alter table public.profiles add column if not exists notify_replies boolean not null default true;
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists banned_until timestamptz;
alter table public.forum_threads add column if not exists notified_at timestamptz;

-- Öffentlich nur die Profilfelder, die im Forum zu sehen sind (Admin-Status, Sperre, Mail-Einstellung nicht)
revoke select on public.profiles from anon, authenticated;
grant select (id, username, created_at, car, avatar_path) on public.profiles to anon, authenticated;
grant update (notify_replies) on public.profiles to authenticated;

-- Gesperrte Konten können nichts schreiben (zusätzlich zur Prüfung im Server)
create or replace function private.not_banned() returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profiles where id = (select auth.uid()) and banned_until > now());
$$;
revoke all on function private.not_banned() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.not_banned() to authenticated;

drop policy if exists "thema anlegen" on public.forum_threads;
create policy "thema anlegen" on public.forum_threads for insert to authenticated
  with check ((select auth.uid()) = author_id and private.not_banned());
drop policy if exists "beitrag schreiben" on public.forum_posts;
create policy "beitrag schreiben" on public.forum_posts for insert to authenticated
  with check ((select auth.uid()) = author_id and private.not_banned());

-- Der Betreiber ist Admin (Konto "bmw")
update public.profiles set is_admin = true where username = 'bmw';
notify pgrst, 'reload schema';
