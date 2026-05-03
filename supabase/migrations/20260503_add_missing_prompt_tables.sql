-- Create custom_prompts table (for user-created prompts)
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

-- Create prompt_overrides table (for modified built-in prompts)
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

-- Create disabled_prompts table (for hidden prompts)
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

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON custom_prompts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON prompt_overrides TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON disabled_prompts TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE custom_prompts_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE prompt_overrides_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE disabled_prompts_id_seq TO authenticated;
