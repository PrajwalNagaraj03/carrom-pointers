-- Points can go negative.
--
-- Pocketing the striker, sinking the queen without covering it -- a board can
-- leave you worse off than you started, and the score sheet should be able to
-- say so. The bound stays symmetric so a typo is still caught.

alter table public.match_players
  drop constraint match_players_points_in_range,
  add constraint match_players_points_in_range check (points between -999 and 999);
