-- Add onboarding and tutorial tracking columns to profiles.
-- These columns are referenced by AuthContext and OnboardingModal but were
-- previously missing from migrations (added directly via Supabase dashboard).
-- Using ADD COLUMN IF NOT EXISTS so this is safe to apply to existing databases.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_done BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tutorial_done   BOOLEAN NOT NULL DEFAULT false;
