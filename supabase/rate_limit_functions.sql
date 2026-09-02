-- Phase 10: rate limiting for endpoints that call out to a paid provider
-- API on the app's own dime: key validation, sync, and the Claude agent
-- calls. A fixed-window counter per (subject, endpoint) key, checked and
-- incremented atomically in one upsert so concurrent requests can't race
-- past the limit.

create table rate_limits (
  key text primary key,           -- e.g. 'agent:<user_id>'
  window_start timestamptz not null default now(),
  count int not null default 0
);

alter table rate_limits enable row level security;
-- No policies: this table is only ever touched via check_rate_limit()
-- below, which runs as the function owner (service_role) regardless of
-- caller. Nothing here needs a per-user RLS policy.

create or replace function check_rate_limit(p_key text, p_max_requests int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into rate_limits (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update
    set
      window_start = case
        when rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
          then now()
        else rate_limits.window_start
      end,
      count = case
        when rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
          then 1
        else rate_limits.count + 1
      end
  returning count into v_count;

  return v_count <= p_max_requests;
end;
$$;

revoke all on function check_rate_limit(text, int, int) from public;
grant execute on function check_rate_limit(text, int, int) to service_role;
