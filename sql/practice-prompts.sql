-- Run this in Supabase SQL Editor to create tables and seed prompts

-- Create practice_prompts table (pre-built library)
CREATE TABLE IF NOT EXISTS practice_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  category TEXT,
  focus_area TEXT,
  content TEXT NOT NULL,
  difficulty TEXT DEFAULT 'standard',
  title TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create user_practice_plans table
CREATE TABLE IF NOT EXISTS user_practice_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_id UUID NOT NULL,
  is_custom BOOLEAN DEFAULT FALSE,
  plan_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE practice_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_practice_plans ENABLE ROW LEVEL SECURITY;

-- Policy for practice_prompts (anyone can read)
DROP POLICY IF EXISTS "Anyone can read prompts" ON practice_prompts;
CREATE POLICY "Anyone can read prompts" ON practice_prompts FOR SELECT USING (true);

-- Policy for user_practice_plans
DROP POLICY IF EXISTS "Users manage own plans" ON user_practice_plans;
CREATE POLICY "Users manage own plans" ON user_practice_plans FOR ALL USING (auth.uid() = user_id);

-- Seed with pre-built prompts (70+ prompts for various event types)
INSERT INTO practice_prompts (event_type, category, focus_area, content, difficulty, title) VALUES
-- INTERVIEW - Behavioral
('interview', 'behavioral', 'confidence', 'Tell me about a time you failed at something. What did you learn?', 'standard', 'Failure & Learning'),
('interview', 'behavioral', 'structure', 'Describe a time you had a conflict with a coworker. How did you handle it?', 'standard', 'Conflict Resolution'),
('interview', 'behavioral', 'stories', 'Tell me about a time you went above and beyond for a customer or colleague.', 'standard', 'Going Above & Beyond'),
('interview', 'behavioral', 'confidence', 'What is your greatest strength and how does it help you at work?', 'standard', 'Strengths'),
('interview', 'behavioral', 'structure', 'What is your greatest weakness and how are you working to improve it?', 'standard', 'Weaknesses'),
('interview', 'behavioral', 'answers', 'Tell me about a time you had to meet a tight deadline. How did you succeed?', 'standard', 'Time Management'),
('interview', 'behavioral', 'stories', 'Describe a time you convinced someone to see things your way.', 'standard', 'Persuasion'),
('interview', 'behavioral', 'confidence', 'Tell me about a time you received difficult feedback. How did you respond?', 'standard', 'Receiving Feedback'),
('interview', 'behavioral', 'structure', 'Describe a time you had to learn something quickly. How did you do it?', 'standard', 'Quick Learning'),
('interview', 'behavioral', 'stories', 'Tell me about a achievement you''re most proud of.', 'standard', 'Proud Achievement'),

-- INTERVIEW - Technical
('interview', 'technical', 'structure', 'Walk me through a complex project you worked on. What was your role?', 'standard', 'Complex Project'),
('interview', 'technical', 'answers', 'Describe a technical challenge you faced and how you solved it.', 'standard', 'Technical Challenge'),
('interview', 'technical', 'stories', 'Tell me about a time you had to debug a difficult problem.', 'standard', 'Debugging'),
('interview', 'technical', 'structure', 'Explain a technical concept to me as if I''m a 5-year-old.', 'standard', 'Simple Explanation'),
('interview', 'technical', 'confidence', 'What tools or technologies are you most skilled in? Give me an example.', 'standard', 'Tech Skills'),

-- PRESENTATION
('presentation', 'introductions', 'confidence', 'Introduce yourself in 30 seconds as if meeting your dream client.', 'standard', '30-Second Intro'),
('presentation', 'introductions', 'structure', 'Give a 60-second pitch about your favorite product or service.', 'standard', 'Product Pitch'),
('presentation', 'storytelling', 'stories', 'Share a compelling story about how you got into your field.', 'standard', 'Origin Story'),
('presentation', 'storytelling', 'stories', 'Tell a personal story that taught you an important life lesson.', 'standard', 'Life Lesson Story'),
('presentation', 'persuasion', 'confidence', 'Convince me to try your favorite hobby in 60 seconds.', 'standard', 'Hobby Pitch'),
('presentation', 'persuasion', 'structure', 'Present a solution to a common problem you see in daily life.', 'standard', 'Problem Solution'),
('presentation', 'qa', 'confidence', 'What is the most important skill for success? Answer in 30 seconds.', 'standard', 'Quick Answer'),

-- IMPROMPTU - Opinions
('impromptu', 'opinions', 'confidence', 'Is artificial intelligence going to help or hurt humanity more?', 'standard', 'AI & Humanity'),
('impromptu', 'opinions', 'structure', 'Should social media be regulated? Present both sides.', 'standard', 'Social Media'),
('impromptu', 'opinions', 'confidence', 'Is it better to be a specialist or a generalist?', 'standard', 'Specialist vs Generalist'),
('impromptu', 'opinions', 'answers', 'What does success mean to you?', 'standard', 'Success Definition'),
('impromptu', 'opinions', 'structure', 'Is it better to work alone or in a team?', 'standard', 'Solo vs Team'),
('impromptu', 'opinions', 'confidence', 'Should education be free?', 'standard', 'Free Education'),
('impromptu', 'opinions', 'structure', 'Is remote work better than office work?', 'standard', 'Remote Work'),
('impromptu', 'opinions', 'answers', 'What is the most important invention of the last 100 years?', 'standard', 'Important Invention'),
('impromptu', 'opinions', 'confidence', 'Should companies prioritize profit or purpose?', 'standard', 'Profit vs Purpose'),
('impromptu', 'opinions', 'structure', 'Is luck or skill more important for success?', 'standard', 'Luck vs Skill'),

-- IMPROMPTU - Experiences
('impromptu', 'experiences', 'stories', 'Describe a turning point in your life.', 'standard', 'Turning Point'),
('impromptu', 'experiences', 'stories', 'Tell me about a person who greatly influenced you.', 'standard', 'Influential Person'),
('impromptu', 'experiences', 'confidence', 'What is a skill you''d like to learn and why?', 'standard', 'Skill to Learn'),
('impromptu', 'experiences', 'structure', 'Describe your perfect day from start to finish.', 'standard', 'Perfect Day'),
('impromptu', 'experiences', 'answers', 'What is something you believed strongly in the past but now disagree with?', 'standard', 'Changed Belief'),

-- CONFERENCE
('conference', 'keynote', 'confidence', 'Open a conference with an inspiring 2-minute welcome.', 'standard', 'Conference Welcome'),
('conference', 'keynote', 'stories', 'Share the story behind your company or organization.', 'standard', 'Origin Story'),
('conference', 'keynote', 'structure', 'Present your vision for the industry in the next 10 years.', 'standard', 'Industry Vision'),
('conference', 'panel', 'answers', 'Answer: What trend will shape our industry in 2025?', 'standard', 'Trend Question'),
('conference', 'panel', 'confidence', 'Respond to: What''s your biggest professional regret?', 'standard', 'Regret Question'),
('conference', 'toast', 'stories', 'Give a 60-second toast for a colleague''s retirement.', 'standard', 'Retirement Toast'),

-- WEDDING
('wedding', 'speech', 'stories', 'Introduce the couple and how you know them in 60 seconds.', 'standard', 'Intro the Couple'),
('wedding', 'speech', 'stories', 'Share a funny story about one of the spouses.', 'standard', 'Funny Story'),
('wedding', 'speech', 'structure', 'Give a heartfelt wish for the couple''s future.', 'standard', 'Heartfelt Wish'),
('wedding', 'speech', 'confidence', 'Lead the crowd in a toast to love and happiness.', 'standard', 'Love Toast'),
('wedding', 'speech', 'stories', 'Describe what makes their relationship special.', 'standard', 'Special Connection');

-- Add display_name column to user_xp if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_xp' AND column_name = 'display_name') THEN
    ALTER TABLE user_xp ADD COLUMN display_name TEXT;
  END IF;
END $$;