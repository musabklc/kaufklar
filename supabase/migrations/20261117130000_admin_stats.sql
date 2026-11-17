-- Kennzahlen für das Admin-Dashboard in einer Abfrage (Summen in der Datenbank statt Zeilen über die API).
-- Nur der Server (Secret Key) darf sie aufrufen; die Seite prüft zusätzlich profiles.is_admin.

create or replace function public.admin_stats(p_since timestamptz) returns jsonb
language sql stable security definer set search_path = '' as $$
  with ev as (select * from public.usage_events where at >= p_since)
  select jsonb_build_object(
    'users', (select count(*) from auth.users),
    'new_users', (select count(*) from auth.users where created_at >= p_since),
    'analyses', (select count(*) from ev where kind = 'analyze'),
    'analyses_with_ai', (select count(*) from ev where kind = 'analyze' and ok),
    'analyses_ms', (select round(avg(ms)) from ev where kind = 'analyze'),
    'extracts', (select count(*) from ev where kind = 'extract'),
    'extracts_failed', (select count(*) from ev where kind = 'extract' and not ok),
    'ai_calls', (select count(*) from ev where kind = 'ai'),
    'ai_failed', (select count(*) from ev where kind = 'ai' and not ok),
    'models', (
      select coalesce(jsonb_agg(m order by m->>'model'), '[]'::jsonb) from (
        select jsonb_build_object('model', model, 'calls', count(*), 'failed', count(*) filter (where not ok),
          'input_tokens', coalesce(sum(input_tokens), 0), 'output_tokens', coalesce(sum(output_tokens), 0)) as m
        from ev where kind = 'ai' group by model
      ) x
    ),
    'paid', (select count(*) from public.payments where status = 'bezahlt' and paid_at >= p_since),
    'revenue_cents', (select coalesce(sum(amount_cents), 0) from public.payments where status = 'bezahlt' and paid_at >= p_since),
    'checkouts', (select count(*) from public.payments where created_at >= p_since),
    'daily', (
      select coalesce(jsonb_agg(d order by d->>'day'), '[]'::jsonb) from (
        select jsonb_build_object('day', (at at time zone 'Europe/Berlin')::date, 'analyses', count(*) filter (where kind = 'analyze'),
          'failed', count(*) filter (where kind = 'analyze' and not ok) + count(*) filter (where kind = 'extract' and not ok)) as d
        from ev group by (at at time zone 'Europe/Berlin')::date
      ) y
    ),
    'errors', (
      select coalesce(jsonb_agg(e), '[]'::jsonb) from (
        select at, kind, op, model, error from ev where not ok and error is not null order by at desc limit 15
      ) e
    )
  );
$$;
revoke execute on function public.admin_stats(timestamptz) from public, anon, authenticated;
grant execute on function public.admin_stats(timestamptz) to service_role;
