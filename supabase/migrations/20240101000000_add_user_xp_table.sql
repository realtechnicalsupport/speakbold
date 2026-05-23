-- Create user_xp table for XP system
CREATE TABLE IF NOT EXISTS user_xp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_xp_user_id ON user_xp(user_id);
CREATE INDEX IF NOT EXISTS idx_user_xp_total_xp ON user_xp(total_xp DESC);

-- Enable RLS
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view all XP data" 
  ON user_xp FOR SELECT 
  USING (true);

CREATE POLICY "Users can update their own XP" 
  ON user_xp FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own XP" 
  ON user_xp FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_user_xp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS user_xp_updated_at_trigger ON user_xp;
CREATE TRIGGER user_xp_updated_at_trigger
  BEFORE UPDATE ON user_xp
  FOR EACH ROW
  EXECUTE FUNCTION update_user_xp_updated_at();
