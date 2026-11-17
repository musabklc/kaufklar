-- Öffentliche Ratgeber-Seiten aus der Recherche-Datenbank: lesbare Adresse je Fahrzeugtyp (/ratgeber/mazda-3-benzin-2-0l-2016-2018).
alter table public.model_research
  add column if not exists slug text generated always as (trim(both '-' from regexp_replace(lower(key), '[^a-z0-9]+', '-', 'g'))) stored;
create unique index if not exists model_research_slug on public.model_research (slug);
