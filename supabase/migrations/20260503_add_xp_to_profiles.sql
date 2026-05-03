-- Add xp column to profiles table for confident-stage-glow integration
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0;

-- Create index for faster leaderboard queries
CREATE INDEX IF NOT EXISTS idx_profiles_xp ON profiles(xp DESC);

-- Enable RLS on xp column (profiles table should already have RLS)
-- Users can view all profiles (xp is public)
-- Users can only update their own xp
DROP POLICY IF EXISTS "Users can update their own xp" ON profiles;
CREATE POLICY "Users can update their own xp"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create function to add XP to a user
CREATE OR REPLACE FUNCTION add_user_xp(user_id UUID, xp_amount INTEGER)
RETURNS INTEGER AS $$
DECLARE
  new_xp INTEGER;
BEGIN
  UPDATE profiles
  SET xp = xp + xp_amount
  WHERE id = user_id
  RETURNING xp INTO new_xp;

  RETURN new_xp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
