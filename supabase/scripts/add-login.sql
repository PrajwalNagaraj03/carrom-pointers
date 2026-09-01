-- Add one person who can sign in.
--
-- Edit the three values below, then run the whole file in the Supabase SQL
-- Editor. Run it once per person.
--
-- It does both halves in one transaction: the allowlist row in app_members
-- (which decides what they can see) and the login in auth.users (which proves
-- who they are). Doing it by hand in the dashboard means getting that order
-- right; here you cannot get it wrong.
--
-- The email only has to LOOK like an email. Nothing is ever sent to it, so
-- prajwal@carrom.local is a perfectly good sign-in name.

set search_path = public, extensions;

do $$
declare
  -- ----------------------------------------------------------------- edit me
  v_email        text := 'first.player@example.com';
  v_display_name text := 'First Player';
  v_password     text := 'change-this-password';
  -- -------------------------------------------------------------------------

  v_user_id uuid := gen_random_uuid();
begin
  v_email := lower(btrim(v_email));

  if length(v_password) < 8 then
    raise exception 'Pick a password of at least 8 characters.';
  end if;

  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'A login for % already exists. Use reset-password.sql to change it.', v_email;
  end if;

  -- Who is allowed to see anything. Every RLS policy reads this table.
  insert into public.app_members (email, display_name)
  values (v_email, nullif(btrim(v_display_name), ''))
  on conflict (email) do update set display_name = excluded.display_name;

  -- The login itself. bcrypt via pgcrypto -- the plaintext is never stored.
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  )
  values (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_email,
    crypt(v_password, gen_salt('bf')),
    now(),                                   -- confirmed, so no email is sent
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('display_name', v_display_name),
    now(),
    now()
  );

  -- GoTrue expects a matching identity row; without it, sign-in misbehaves.
  insert into auth.identities (
    id, user_id, provider, provider_id, identity_data,
    last_sign_in_at, created_at, updated_at
  )
  values (
    gen_random_uuid(),
    v_user_id,
    'email',
    v_user_id::text,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
    now(),
    now(),
    now()
  );

  raise notice 'Added % -- they can sign in now and change their password at /account.', v_email;
end;
$$;
