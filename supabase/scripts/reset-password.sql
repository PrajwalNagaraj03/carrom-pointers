-- Reset someone's password when they have forgotten it.
--
-- Normally nobody needs this: each person changes their own password at
-- /account in the app. This is the way back in when they cannot.
--
-- Edit the two values, then run the whole file in the SQL Editor.

set search_path = public, extensions;

do $$
declare
  -- ----------------------------------------------------------------- edit me
  v_email        text := 'first.player@example.com';
  v_new_password text := 'a-new-password';
  -- -------------------------------------------------------------------------
begin
  v_email := lower(btrim(v_email));

  if length(v_new_password) < 8 then
    raise exception 'Pick a password of at least 8 characters.';
  end if;

  update auth.users
     set encrypted_password = crypt(v_new_password, gen_salt('bf')),
         updated_at = now()
   where lower(email) = v_email;

  if not found then
    raise exception 'No login found for %.', v_email;
  end if;

  raise notice 'Password reset for %. Tell them to change it at /account.', v_email;
end;
$$;
