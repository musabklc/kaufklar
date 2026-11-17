-- Privat oder Händler je Vergleichsangebot (Marktcheck)
alter table public.price_observations add column if not exists seller text check (seller in ('privat', 'gewerblich'));
