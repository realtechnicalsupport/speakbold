-- ═══════════════════════════════════════════════════════════════════════════
-- ELO SYSTEM v2 — performance-based, score-aware
-- ═══════════════════════════════════════════════════════════════════════════
-- Changes:
--   1. Default ELO for new accounts:  0 → 1000   (lands them at Silver II)
--   2. Account floor:                 0 → 100    (protects against full grind-down)
--   3. Existing accounts below the floor get a one-time bump to STARTING_ELO
--      so v1 → v2 carry-over players don't feel demoted.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. New default for the elo column
ALTER TABLE public.profiles
  ALTER COLUMN elo SET DEFAULT 1000;

-- 2. One-time backfill: anyone still at or below the legacy 0 default
--    (or anyone below the new floor) starts at the v2 STARTING_ELO.
UPDATE public.profiles
SET elo = 1000
WHERE elo < 100;

-- 3. Replace the add_user_elo RPC with the new floor of 100.
--    Drop first to avoid signature/return-type conflicts.
DROP FUNCTION IF EXISTS public.add_user_elo(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.add_user_elo(user_id UUID, elo_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET elo = GREATEST(100, elo + elo_amount)
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.add_user_elo(UUID, INTEGER) TO authenticated;
