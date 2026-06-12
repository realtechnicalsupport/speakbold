-- ============================================================================
--  SpeakBold — remove leaderboard demo seed   (run in the Supabase SQL Editor)
-- ============================================================================
--  Deletes every seeded demo account created by scripts/seed-leaderboard.sql.
--  profiles (and any other user-owned rows) are removed automatically via the
--  ON DELETE CASCADE on auth.users(id). Real accounts are never matched — the
--  filter is the unique seed_<uuid>@speakbold.demo email pattern.
--
--  Run as: Supabase Dashboard → SQL Editor → paste → Run.
-- ============================================================================

BEGIN;

-- Show what will be removed (and confirm none are real accounts).
SELECT count(*) AS seed_accounts_to_delete
FROM auth.users
WHERE email LIKE 'seed\_%@speakbold.demo';

DELETE FROM auth.users
WHERE email LIKE 'seed\_%@speakbold.demo';

COMMIT;
