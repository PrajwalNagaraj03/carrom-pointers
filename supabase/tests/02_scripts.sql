-- Runs the files in supabase/scripts verbatim, as shipped, against the
-- throwaway database. Proves the SQL is valid, that a login and its identity
-- row are created together, that the stored hash verifies the password, and
-- that re-running the add script refuses rather than duplicating.
--
-- What it cannot prove: that GoTrue's own schema still matches the stub in
-- 00_supabase_stubs.sql. The dashboard remains the guaranteed-supported path.

\set ON_ERROR_STOP on

\echo '== add-login.sql creates an allowlist row, a user and an identity'
\i supabase/scripts/add-login.sql

do $$
declare
  v_user auth.users%rowtype;
  v_identity_count integer;
begin
  select * into v_user from auth.users where email = 'first.player@example.com';
  assert found, 'FAIL: add-login.sql created no user';
  assert v_user.email_confirmed_at is not null, 'FAIL: the user should be pre-confirmed';
  assert v_user.role = 'authenticated', 'FAIL: role should be authenticated';

  assert exists (select 1 from public.app_members where email = 'first.player@example.com'),
    'FAIL: add-login.sql did not add the allowlist row';

  -- The allowlist row is what puts them on the board; there is no separate step.
  assert exists (
    select 1 from public.players
     where member_email = 'first.player@example.com' and name = 'First Player'
  ), 'FAIL: adding a login did not create the player';

  select count(*) into v_identity_count from auth.identities where user_id = v_user.id;
  assert v_identity_count = 1, format('FAIL: expected 1 identity row, got %s', v_identity_count);

  -- The plaintext is not stored; the hash verifies it.
  assert v_user.encrypted_password <> 'change-this-password',
    'FAIL: the password was stored in plaintext';
  assert v_user.encrypted_password = crypt('change-this-password', v_user.encrypted_password),
    'FAIL: the stored hash does not verify the password';

  -- The columns GoTrue cannot read as NULL. Leaving any of these null is what
  -- makes sign-in fail with a 500 that looks like a wrong password.
  assert v_user.confirmation_token is not null, 'FAIL: confirmation_token left NULL';
  assert v_user.recovery_token is not null, 'FAIL: recovery_token left NULL';
  assert v_user.email_change is not null, 'FAIL: email_change left NULL';
  assert v_user.email_change_token_new is not null, 'FAIL: email_change_token_new left NULL';
  assert v_user.email_change_token_current is not null, 'FAIL: email_change_token_current left NULL';
  assert v_user.phone_change is not null, 'FAIL: phone_change left NULL';
  assert v_user.phone_change_token is not null, 'FAIL: phone_change_token left NULL';
  assert v_user.reauthentication_token is not null, 'FAIL: reauthentication_token left NULL';
end;
$$;

\echo '== repair-logins.sql fixes a login created before that blanking existed'
update auth.users
   set confirmation_token = null,
       recovery_token = null,
       reauthentication_token = null
 where email = 'first.player@example.com';

\i supabase/scripts/repair-logins.sql

do $$
declare v_user auth.users%rowtype;
begin
  select * into v_user from auth.users where email = 'first.player@example.com';
  assert v_user.confirmation_token = '', 'FAIL: repair left confirmation_token NULL';
  assert v_user.recovery_token = '', 'FAIL: repair left recovery_token NULL';
  assert v_user.reauthentication_token = '', 'FAIL: repair left reauthentication_token NULL';
  -- Repair must not disturb the password.
  assert v_user.encrypted_password = crypt('change-this-password', v_user.encrypted_password),
    'FAIL: repair changed the password hash';
end;
$$;

\echo '== reset-password.sql changes the hash, and only the new password verifies'
select set_config('carrom.old_hash', encrypted_password, false)
  from auth.users where email = 'first.player@example.com' \gset discard_

\i supabase/scripts/reset-password.sql

do $$
declare v_new text;
begin
  select encrypted_password into v_new from auth.users where email = 'first.player@example.com';
  assert v_new <> current_setting('carrom.old_hash'), 'FAIL: the hash did not change';
  assert v_new = crypt('a-new-password', v_new), 'FAIL: the new password does not verify';
  assert v_new <> crypt('change-this-password', v_new), 'FAIL: the old password still works';
end;
$$;

\echo '== set-admin.sql hands over the right to delete a match'
\i supabase/scripts/set-admin.sql

do $$
begin
  assert (select is_admin from public.app_members where email = 'first.player@example.com'),
    'FAIL: set-admin.sql did not set is_admin';
end;
$$;

\echo '== list-logins.sql runs and reports the login'
\i supabase/scripts/list-logins.sql

\echo '== an email that is not allowlisted cannot be given a login'
do $$
begin
  begin
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                            created_at, updated_at)
    values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated',
            'authenticated', 'gatecrasher@example.com', crypt('whatever', gen_salt('bf')),
            now(), '{}'::jsonb, '{}'::jsonb, now(), now());
    raise exception 'FAIL: an unlisted email got a login';
  exception when insufficient_privilege then
    raise notice 'ok: signup trigger still guards direct inserts';
  end;
end;
$$;

-- Re-running the add script must refuse. The error is expected, so stop-on-error
-- is lifted just for this one run and restored straight after.
\echo '== running add-login.sql a second time refuses instead of duplicating'
\set ON_ERROR_STOP off
\i supabase/scripts/add-login.sql
\set ON_ERROR_STOP on

do $$
declare v_count integer;
begin
  select count(*) into v_count from auth.users where email = 'first.player@example.com';
  assert v_count = 1, format('FAIL: expected 1 login, found %s', v_count);
end;
$$;

\echo '== script assertions passed'
