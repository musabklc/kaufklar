-- Forum: Fotos in Beiträgen (max. 3, nur im eigenen Ordner), Beiträge bearbeiten, Antworten als "hilfreich" markieren.

create or replace function private.forum_paths_ok(paths text[], uid uuid) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(bool_and(p ~ ('^' || uid::text || '/[0-9]+-[0-9]\.(jpg|webp)$')), true) from unnest(paths) as p;
$$;
grant execute on function private.forum_paths_ok(text[], uuid) to anon, authenticated;

alter table public.forum_posts add column if not exists image_paths text[] not null default '{}';
alter table public.forum_posts drop constraint if exists forum_posts_images_check;
alter table public.forum_posts add constraint forum_posts_images_check
  check (cardinality(image_paths) <= 3 and private.forum_paths_ok(image_paths, author_id));
grant update (body, edited_at, image_paths) on public.forum_posts to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('forum', 'forum', true, 1572864, array['image/jpeg', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 1572864, allowed_mime_types = array['image/jpeg', 'image/webp'];

drop policy if exists "forumbild lesen eigen" on storage.objects;
drop policy if exists "forumbild hochladen" on storage.objects;
drop policy if exists "forumbild loeschen" on storage.objects;
create policy "forumbild lesen eigen" on storage.objects for select to authenticated
  using (bucket_id = 'forum' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "forumbild hochladen" on storage.objects for insert to authenticated
  with check (bucket_id = 'forum' and (storage.foldername(name))[1] = (select auth.uid())::text and private.not_banned());
create policy "forumbild loeschen" on storage.objects for delete to authenticated
  using (bucket_id = 'forum' and (storage.foldername(name))[1] = (select auth.uid())::text);

create table if not exists public.forum_helpful (
  post_id bigint not null references public.forum_posts (id) on delete cascade,
  -- auf auth.users, nicht profiles: eine zweite Verbindung posts<->profiles macht author:profiles(...) in PostgREST mehrdeutig
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.forum_helpful enable row level security;
create policy "hilfreich lesen" on public.forum_helpful for select to anon, authenticated using (true);
-- nur fremde Beiträge, nur im eigenen Namen, nicht gesperrt
create policy "hilfreich markieren" on public.forum_helpful for insert to authenticated
  with check ((select auth.uid()) = user_id and private.not_banned()
    and not exists (select 1 from public.forum_posts p where p.id = post_id and p.author_id = (select auth.uid())));
create policy "hilfreich zuruecknehmen" on public.forum_helpful for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.forum_helpful from anon, authenticated;
grant select on public.forum_helpful to anon, authenticated;
grant insert (post_id), delete on public.forum_helpful to authenticated;
notify pgrst, 'reload schema';
