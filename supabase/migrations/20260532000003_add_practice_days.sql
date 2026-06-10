-- Single source of truth for "which days did the user practice".
-- Previously the streak COUNT lived in `streaks` while the profile's 7-day
-- activity chart was derived from the `recordings` table — two different
-- sources that disagreed whenever a Pathway drill or daily challenge bumped the
-- streak without creating a recording. This table is written by markPracticed()
-- (the same call that moves the streak), so the chart and the streak now agree.

CREATE TABLE IF NOT EXISTS public.practice_days (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  PRIMARY KEY (user_id, day)
);

ALTER TABLE public.practice_days ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "practice_days select own" ON public.practice_days
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "practice_days insert own" ON public.practice_days
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill historical practice days from existing recordings so returning
-- users don't see an empty chart after the switchover.
INSERT INTO public.practice_days (user_id, day)
  SELECT DISTINCT user_id, created_at::date FROM public.recordings
  ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
