-- Unified skill-signal log so the AI Coach can learn from EVERY practice
-- surface — impromptu drills, pathway lessons, arena battles, etc. — not just
-- standalone recordings. `recording_feedback` can't serve this because it's
-- hard-tied to an uploaded recording (recording_id NOT NULL); most surfaces
-- score without persisting audio. Each row carries a partial 6-dimension score
-- (same shape as recording_feedback.scores); computeSkillProfile already merges
-- partial dimensions across rows.

CREATE TABLE IF NOT EXISTS public.skill_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL,                          -- 'impromptu' | 'pathway' | 'arena' | 'recording' | ...
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,      -- partial { dimension: 0-100 }
  overall integer,                               -- headline score, for convenience
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,         -- topic/lesson/mode/opponent etc.
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.skill_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "skill_events select own" ON public.skill_events
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "skill_events insert own" ON public.skill_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_skill_events_user ON public.skill_events(user_id, created_at DESC);

NOTIFY pgrst, 'reload schema';
