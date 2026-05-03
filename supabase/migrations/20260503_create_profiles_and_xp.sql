-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (ignore errors if they don't exist)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Policies: Users can view all profiles
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create index for faster leaderboard queries
CREATE INDEX IF NOT EXISTS idx_profiles_xp ON profiles(xp DESC);

-- Function to handle new user creation (trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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
