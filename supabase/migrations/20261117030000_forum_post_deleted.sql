-- Beitrag gelöscht: Zähler runterzählen; Thema ohne Beiträge verschwindet mit
create or replace function private.forum_post_deleted() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.forum_threads set post_count = greatest(post_count - 1, 0) where id = old.thread_id;
  delete from public.forum_threads where id = old.thread_id and post_count = 0;
  return old;
end $$;
drop trigger if exists forum_post_deleted on public.forum_posts;
create trigger forum_post_deleted after delete on public.forum_posts
  for each row execute function private.forum_post_deleted();
revoke all on function private.forum_post_deleted() from public, anon, authenticated;

-- Bestehende Zähler einmal korrigieren
update public.forum_threads t set post_count = (select count(*) from public.forum_posts p where p.thread_id = t.id);
