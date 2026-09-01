-- Who may delete a match.
--
-- Edit the email below and run the whole file in the Supabase SQL Editor. Every
-- member logs matches and corrects scores; only an admin can delete one
-- outright. Set v_is_admin to false to take it away again.
--
-- The person must already be on the allowlist -- run add-login.sql first.

set search_path = public, extensions;

do $$
declare
  -- ----------------------------------------------------------------- edit me
  v_email    text    := 'first.player@example.com';
  v_is_admin boolean := true;
  -- -------------------------------------------------------------------------
begin
  v_email := lower(btrim(v_email));

  update public.app_members
     set is_admin = v_is_admin
   where email = v_email;

  if not found then
    raise exception '% is not on the access list. Run add-login.sql for them first.', v_email;
  end if;

  if v_is_admin then
    raise notice '% can now delete matches. Nobody else can.', v_email;
  else
    raise notice '% can no longer delete matches.', v_email;
  end if;
end;
$$;
