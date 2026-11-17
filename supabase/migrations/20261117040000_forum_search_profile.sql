-- Forum-Suche (Teilwörter, z. B. "getriebe" findet "Getriebeschaden"), Auto im Profil, Profilbild.

-- Suche: Trigramm-Indizes, damit ILIKE '%wort%' auch bei vielen Beiträgen schnell bleibt
create extension if not exists pg_trgm with schema extensions;
create index if not exists forum_threads_title_trgm on public.forum_threads using gin (title extensions.gin_trgm_ops);
create index if not exists forum_posts_body_trgm on public.forum_posts using gin (body extensions.gin_trgm_ops);

-- Profil: welches Auto man fährt, Pfad des Profilbilds (immer im eigenen Ordner)
alter table public.profiles add column if not exists car text check (char_length(car) between 2 and 60);
alter table public.profiles add column if not exists avatar_path text
  check (avatar_path ~ '^[0-9a-f-]{36}/avatar-[0-9]+\.(webp|jpg)$' and split_part(avatar_path, '/', 1) = id::text);

drop policy if exists "eigenes profil bearbeiten" on public.profiles;
create policy "eigenes profil bearbeiten" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
grant update (car, avatar_path) on public.profiles to authenticated;

-- Profilbilder: öffentlich lesbar, max. 300 KB, WebP oder JPEG (der Browser rechnet vorher auf 256 px um)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 307200, array['image/webp', 'image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 307200, allowed_mime_types = array['image/webp', 'image/jpeg'];

-- Hochladen, ersetzen, löschen nur im eigenen Ordner <user-id>/…
drop policy if exists "avatar lesen eigen" on storage.objects;
drop policy if exists "avatar hochladen" on storage.objects;
drop policy if exists "avatar ersetzen" on storage.objects;
drop policy if exists "avatar loeschen" on storage.objects;
create policy "avatar lesen eigen" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatar hochladen" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatar ersetzen" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatar loeschen" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
