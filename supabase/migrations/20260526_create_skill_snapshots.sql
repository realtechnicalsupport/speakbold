-- Create skill_snapshots table: one row per user holding their computed skill
-- profile and the adaptive practice plan derived from it. Upserted on user_id.
CREATE TABLE IF NOT EXISTS public.skill_snapshots (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  plan_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  based_on_recording_count integer NOT NULL DEFAULT 0,
  generated_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.skill_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies: a user can only read/write their own snapshot
CREATE POLICY "Users can view their own skill snapshot"
  ON public.skill_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own skill snapshot"
  ON public.skill_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own skill snapshot"
  ON public.skill_snapshots FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own skill snapshot"
  ON public.skill_snapshots FOR DELETE
  USING (auth.uid() = user_id);
