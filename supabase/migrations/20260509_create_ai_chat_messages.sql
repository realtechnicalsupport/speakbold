-- Create ai_chat_messages table
CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert their own messages" 
  ON public.ai_chat_messages FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own messages" 
  ON public.ai_chat_messages FOR SELECT 
  USING (auth.uid() = user_id);

-- Index for efficient querying by user and time
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_time ON public.ai_chat_messages(user_id, created_at ASC);
