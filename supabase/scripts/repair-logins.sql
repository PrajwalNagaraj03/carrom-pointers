-- Fix logins that were created by SQL before the blanking step existed.
--
-- Symptom this cures: the password is definitely right, but signing in always
-- says it is wrong. Underneath, GoTrue is failing with a 500 "Database error
-- querying schema" because it reads these columns into non-nullable Go strings
-- and a hand-inserted row left them NULL.
--
-- Safe to run more than once, and safe on users created through the dashboard
-- (it only touches columns that are actually NULL).

set search_path = public, extensions;

do $$
declare
  v_column text;
  v_fixed  integer;
  v_total  integer := 0;
begin
  for v_column in
    select column_name
      from information_schema.columns
     where table_schema = 'auth'
       and table_name = 'users'
       and is_nullable = 'YES'
       and data_type in ('character varying', 'text')
       and column_name in (
             'confirmation_token', 'recovery_token', 'email_change',
             'email_change_token_new', 'email_change_token_current',
             'phone_change', 'phone_change_token', 'reauthentication_token'
           )
  loop
    execute format('update auth.users set %I = %L where %I is null', v_column, '', v_column);
    get diagnostics v_fixed = row_count;

    if v_fixed > 0 then
      raise notice 'blanked % NULL value(s) in auth.users.%', v_fixed, v_column;
      v_total := v_total + v_fixed;
    end if;
  end loop;

  if v_total = 0 then
    raise notice 'Nothing to repair -- no NULLs in those columns. If sign-in still fails, the password really is wrong: use reset-password.sql.';
  else
    raise notice 'Repaired % value(s). Try signing in again.', v_total;
  end if;
end;
$$;
