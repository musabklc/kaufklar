-- Meine Garage: eigene Autos mit Terminen (HU, Service, Zahnriemen) und E-Mail-Erinnerung.
create table if not exists public.garage_cars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 80),
  year int check (year between 1950 and 2100),
  mileage_km int check (mileage_km between 0 and 3000000),
  hu_due date,
  service_due date,
  belt_due date,
  notes text check (char_length(notes) <= 300),
  -- nur der Server: welche Termine schon erinnert wurden ({"hu":"2027-05-01", ...})
  reminded jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists garage_cars_user on public.garage_cars (user_id);

alter table public.garage_cars enable row level security;
create policy "eigene garage lesen" on public.garage_cars for select to authenticated using ((select auth.uid()) = user_id);
create policy "eigene garage anlegen" on public.garage_cars for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "eigene garage aendern" on public.garage_cars for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "eigene garage loeschen" on public.garage_cars for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.garage_cars from anon, authenticated;
grant select, delete on public.garage_cars to authenticated;
grant insert (title, year, mileage_km, hu_due, service_due, belt_due, notes) on public.garage_cars to authenticated;
grant update (title, year, mileage_km, hu_due, service_due, belt_due, notes) on public.garage_cars to authenticated;
notify pgrst, 'reload schema';
