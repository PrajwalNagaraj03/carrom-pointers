-- Seed data. Replace the placeholders before running this.
--
-- The three emails below are the ONLY accounts that will ever be able to sign
-- in: the trigger in 0003_security.sql rejects any other Google account at
-- signup, and RLS hides every row from anyone not listed here.

insert into public.app_members (email, display_name) values
  ('first.player@example.com',  'First Player'),
  ('second.player@example.com', 'Second Player'),
  ('third.player@example.com',  'Third Player')
on conflict (email) do nothing;

-- Players do not need to be members -- add anyone you play against.
insert into public.players (name) values
  ('First Player'),
  ('Second Player'),
  ('Third Player')
on conflict do nothing;

insert into public.seasons (name, started_on) values
  ('Season 1', current_date)
on conflict do nothing;
