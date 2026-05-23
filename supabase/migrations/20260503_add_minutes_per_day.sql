-- Add minutes_per_day column to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS minutes_per_day INTEGER DEFAULT 5;
