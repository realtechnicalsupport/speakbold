CREATE TABLE IF NOT EXISTS public.pathway_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pathway_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own pathway progress" ON public.pathway_progress;

CREATE POLICY "Users can manage own pathway progress"
  ON public.pathway_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.pathway_progress TO authenticated;
