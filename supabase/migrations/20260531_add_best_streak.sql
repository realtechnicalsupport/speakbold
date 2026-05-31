-- Persist each user's longest-ever streak server-side.
-- Previously "best streak" lived only in localStorage (device-local, resets on
-- browser clear) — which made it dishonest as a headline stat and impossible to
-- compare against friends. This moves it into the streaks table.
--
-- Apply in the Supabase SQL editor BEFORE deploying the matching client change,
-- otherwise markPracticed()'s upsert (which now writes best_count) will fail.

ALTER TABLE public.streaks
  ADD COLUMN IF NOT EXISTS best_count integer NOT NULL DEFAULT 0;

-- Backfill: nobody's best should be lower than their current streak.
UPDATE public.streaks
  SET best_count = GREATEST(best_count, count)
  WHERE best_count < count;

NOTIFY pgrst, 'reload schema';
