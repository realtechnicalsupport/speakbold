-- Create recording_feedback table for AI feedback storage
CREATE TABLE IF NOT EXISTS public.recording_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id uuid NOT NULL UNIQUE REFERENCES public.recordings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  transcript text,
  summary text NOT NULL,
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  improvements jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_drill text,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.recording_feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own recording feedback" 
  ON public.recording_feedback FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recording feedback" 
  ON public.recording_feedback FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recording feedback" 
  ON public.recording_feedback FOR DELETE 
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_recording_feedback_user ON public.recording_feedback(user_id, created_at DESC);

-- Add index on recording_id for lookups
CREATE INDEX idx_recording_feedback_recording ON public.recording_feedback(recording_id);