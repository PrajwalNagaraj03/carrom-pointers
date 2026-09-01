-- Who can sign in, and who is on the allowlist. Run as-is.
--
-- A row with "allowlisted: no" can authenticate but will see nothing, because
-- every RLS policy checks app_members. A row with "login: no" is allowed but
-- has no password yet -- run add-login.sql for them.

select
  coalesce(u.email, m.email)                as email,
  m.display_name,
  case when m.email is null then 'no' else 'yes' end as allowlisted,
  case when u.id   is null then 'no' else 'yes' end as login,
  u.last_sign_in_at
from public.app_members m
full outer join auth.users u on lower(u.email) = m.email
order by 1;
