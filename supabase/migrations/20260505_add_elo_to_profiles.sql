-- Add elo column to profiles table starting at 0
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS elo INTEGER NOT NULL DEFAULT 0;

-- Create index for elo based leaderboard
CREATE INDEX IF NOT EXISTS idx_profiles_elo ON public.profiles(elo DESC);
