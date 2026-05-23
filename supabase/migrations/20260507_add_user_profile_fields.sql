
-- Add strengths and weaknesses columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS strengths JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS weaknesses JSONB DEFAULT '[]'::jsonb;
