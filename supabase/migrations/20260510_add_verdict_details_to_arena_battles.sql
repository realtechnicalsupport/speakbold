-- Add detailed verdict columns to arena_battles
ALTER TABLE public.arena_battles 
ADD COLUMN IF NOT EXISTS strengths text,
ADD COLUMN IF NOT EXISTS opp_strengths text,
ADD COLUMN IF NOT EXISTS opp_feedback text,
ADD COLUMN IF NOT EXISTS example_speech text;

-- Update RLS if needed (already broad enough)
