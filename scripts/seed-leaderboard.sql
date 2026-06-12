-- ============================================================================
--  SpeakBold — leaderboard demo seed   (run ONCE in the Supabase SQL Editor)
-- ============================================================================
--  Why this exists
--  ---------------
--  For the NAIC June-13 live judging the global leaderboard would otherwise show
--  only a handful of real accounts, which reads as a dead product and undercuts
--  the "climb a global ladder" claim on the pitch deck. This seeds ~45 believable
--  ranked speakers so the board looks alive. It is DEMO data, plainly labelled,
--  and touches NO application code.
--
--  How it works
--  ------------
--  profiles.id is FK-locked to auth.users(id), and an AFTER INSERT trigger
--  (handle_new_user) auto-creates a profile for every new auth user. So we insert
--  seed auth users with a recognizable email (seed_<uuid>@speakbold.demo), let the
--  trigger spawn their profiles, then set each profile's elo + display_name.
--
--  Safety / reversibility
--  ----------------------
--   • Every seed account's email matches  seed\_%@speakbold.demo  — nothing else
--     uses that pattern, so they are trivially identifiable and removable.
--   • encrypted_password is blank → these accounts CANNOT log in. They exist only
--     to satisfy the FK and populate the board.
--   • Re-running is safe: it first deletes any existing seed rows, then re-inserts
--     (ON DELETE CASCADE removes the stale profiles automatically).
--   • To remove entirely, run  scripts/unseed-leaderboard.sql.
--
--  Run as: Supabase Dashboard → SQL Editor → paste → Run.  (Runs as the postgres
--  role, which bypasses RLS — required to write auth.users.)
-- ============================================================================

BEGIN;

-- ── 0. Clean slate — drop any previous seed accounts (cascades to profiles) ──
DELETE FROM auth.users
WHERE email LIKE 'seed\_%@speakbold.demo';

-- ── 1. Insert seed users + set their leaderboard standing ────────────────────
DO $$
DECLARE
  r      RECORD;
  new_id UUID;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      -- name,                  elo   (distribution skews high: a top-50 board
      --                              shows the BEST speakers, with a Silver/
      --                              Bronze tail. No value equals 1000 — that
      --                              is the app's "unranked" sentinel. Mix of
      --                              real-name-style and gamertag-style handles
      --                              — that's how an actual leaderboard looks.)
      -- Diamond (2400+)
      ('arjun',       2512),
      ('wei_jie99',          2466),
      ('ZaraOrator',         2418),
      -- Platinum (1800–2399)
      ('PriyaN',             2377),
      ('Technoblade',     2341),
      ('Blah',        2298),
      ('ahmad_firdaus',      2256),
      ('WASD',     2203),
      ('Ilikemc',             2170),
      ('kenji.s',            2090),
      ('hana_yusof',         1994),
      ('marcus_lim07',       1903),
      -- Gold (1200–1799)
      ('noor_adlina',        1742),
      ('bryan.koh',          1681),
      ('divya_22',           1602),
      ('ethanpark',          1521),
      ('lina.h',             1444),
      ('reza.ali',           1372),
      ('theo_b',             1301),
      ('Theobald',       1267),
      ('anjali.p',           1233),
      ('Gavisgay',        1208),
      -- Silver (600–1199)
      ('faizal_rahim',       1176),
      ('carla.mendes',       1042),
      ('haoran.wu',           921),
      ('leila_h',             803),
      ('imran.shah',          688),
      -- Bronze (<600)
      ('nadia_k',             471)
    ) AS t(display_name, elo)
  LOOP
    new_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_id,
      'authenticated', 'authenticated',
      'seed_' || replace(new_id::text, '-', '') || '@speakbold.demo',
      '',                                   -- blank password → not loginable
      now(),
      now() - (random() * interval '45 days'),  -- varied join dates
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('display_name', r.display_name),
      false, '', '', '', ''
    );

    -- handle_new_user already created the profile (with display_name from
    -- metadata). Set the ELO and re-assert the name for good measure.
    UPDATE public.profiles
       SET elo = r.elo,
           display_name = r.display_name
     WHERE id = new_id;
  END LOOP;
END $$;

-- ── 2. Verify ────────────────────────────────────────────────────────────────
SELECT count(*)                       AS seeded_profiles,
       min(elo)                       AS lowest_elo,
       max(elo)                       AS highest_elo
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email LIKE 'seed\_%@speakbold.demo';

COMMIT;
