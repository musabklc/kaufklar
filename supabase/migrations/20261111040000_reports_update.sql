-- Nachprüfung wartender Meldungen (KI war beim Eingang ausgelastet) braucht Update-Recht.
grant update on table public.problem_reports to service_role;
