-- ─── Why ──────────────────────────────────────────────────────────────────────
-- New accounts were being minted at a literal 1000 ELO because the `elo` column
-- carried `NOT NULL DEFAULT 1000` (set by 20260524_redo_elo_system). The
-- `handle_new_user` trigger inserts only (id, display_name), so every signup
-- fell to that default and instantly looked like a rated Silver II player.
--
-- The leaderboard hid them with a fragile `.neq("elo", 1000)` band-aid, but the
-- raw data was still wrong: a brand-new user genuinely has NO rating, and any
-- real player who happens to land on exactly 1000 vanished from the board.
--
-- Fix the source of truth: "unranked" is now a real NULL, not a sentinel number.
--   • New signups store NULL elo (truly unranked) until their first battle.
--   • ELO math still seeds from 1000 — both the edge function and the RPC below
--     COALESCE NULL → 1000 before computing a delta, so the first rated match
--     lands a new player in the usual Silver range.
--   • isRankedElo(null) === false on the client, so every surface shows
--     "Unranked" without relying on the brittle `!== 1000` check.

-- 1. Drop the NOT NULL constraint and the 1000 default so new rows are unranked.
ALTER TABLE public.profiles ALTER COLUMN elo DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN elo DROP DEFAULT;

-- 2. Backfill: any account still sitting at exactly 1000 that has NEVER played a
--    battle never earned that rating — reset it to NULL (genuinely unranked).
--    NOT EXISTS is NULL-safe (unlike NOT IN, which breaks on the NULL
--    opponent_id of AI battles).
UPDATE public.profiles p
SET elo = NULL
WHERE p.elo = 1000
  AND NOT EXISTS (
    SELECT 1 FROM public.arena_battles b
    WHERE b.challenger_id = p.id OR b.opponent_id = p.id
  );

-- 3. Make add_user_elo NULL-safe: seed an unranked player from 1000 before
--    applying the delta, then clamp at the floor of 0.
DROP FUNCTION IF EXISTS public.add_user_elo(UUID, INTEGER);
CREATE OR REPLACE FUNCTION public.add_user_elo(user_id UUID, elo_amount INTEGER)
RETURNS INTEGER AS $$
DECLARE
  new_elo INTEGER;
BEGIN
  UPDATE public.profiles
  SET elo = GREATEST(0, COALESCE(elo, 1000) + elo_amount)
  WHERE id = user_id
  RETURNING elo INTO new_elo;

  RETURN new_elo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.add_user_elo(UUID, INTEGER) TO authenticated;

NOTIFY pgrst, 'reload schema';
