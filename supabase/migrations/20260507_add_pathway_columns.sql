
-- Add pathway columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pathway_progress JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS pathway_selection TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.pathway_progress IS 'Stores the completion status of each lesson in the pathway';
COMMENT ON COLUMN public.profiles.pathway_selection IS 'Stores the user focus selected during onboarding (vocal, interviews, or impromptu)';
