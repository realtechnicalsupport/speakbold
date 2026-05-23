-- Create arena_battles table for shared history and synchronized judging
CREATE TABLE IF NOT EXISTS public.arena_battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  gamemode text NOT NULL,
  challenger_score integer,
  opponent_score integer,
  verdict text,
  winner_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.arena_battles ENABLE ROW LEVEL SECURITY;

-- Allow users to see battles they participated in
CREATE POLICY "Users can view their own battles" 
  ON public.arena_battles FOR SELECT 
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- Allow participants to record results
CREATE POLICY "Participants can manage battle results" 
  ON public.arena_battles FOR ALL
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id)
  WITH CHECK (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- Grant permissions
GRANT ALL ON public.arena_battles TO authenticated;
