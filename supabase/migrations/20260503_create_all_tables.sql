-- Create profiles table for leaderboard and XP
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0
);

-- Enable Row Level Security on profiles
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

-- Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Index for faster leaderboard queries
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

-- Function to add XP to a user
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

-- Create custom_prompts table
CREATE TABLE IF NOT EXISTS custom_prompts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  text TEXT NOT NULL,
  framework TEXT,
  points JSONB DEFAULT '[]'::jsonb,
  example JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, client_id)
);

ALTER TABLE custom_prompts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own custom prompts" ON custom_prompts;
  DROP POLICY IF EXISTS "Users can manage own custom prompts" ON custom_prompts;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

CREATE POLICY "Users can view own custom prompts"
  ON custom_prompts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own custom prompts"
  ON custom_prompts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create prompt_overrides table
CREATE TABLE IF NOT EXISTS prompt_overrides (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  builtin_id TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  prompt JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, builtin_id)
);

ALTER TABLE prompt_overrides ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own overrides" ON prompt_overrides;
  DROP POLICY IF EXISTS "Users can manage own overrides" ON prompt_overrides;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

CREATE POLICY "Users can view own overrides"
  ON prompt_overrides FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own overrides"
  ON prompt_overrides FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create disabled_prompts table
CREATE TABLE IF NOT EXISTS disabled_prompts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prompt_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, prompt_id)
);

ALTER TABLE disabled_prompts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own disabled prompts" ON disabled_prompts;
  DROP POLICY IF EXISTS "Users can manage own disabled prompts" ON disabled_prompts;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

CREATE POLICY "Users can view own disabled prompts"
  ON disabled_prompts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own disabled prompts"
  ON disabled_prompts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions to authenticated users
GRANT SELECT ON profiles TO authenticated;
GRANT UPDATE(xp) ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON custom_prompts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON prompt_overrides TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON disabled_prompts TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE custom_prompts_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE prompt_overrides_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE disabled_prompts_id_seq TO authenticated;
