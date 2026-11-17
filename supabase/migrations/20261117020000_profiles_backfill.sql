-- Konten, die vor dem Profil-Trigger angelegt wurden, bekommen ihr Profil nachträglich
-- (Benutzername aus der Registrierung). Ohne Profil zeigt das Forum "Melde dich an".
insert into public.profiles (id, username)
select u.id, u.raw_user_meta_data ->> 'username'
from auth.users u
where u.raw_user_meta_data ->> 'username' is not null
  and not exists (select 1 from public.profiles p where p.id = u.id)
on conflict do nothing;
