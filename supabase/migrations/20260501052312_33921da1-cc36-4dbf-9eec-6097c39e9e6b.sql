
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Custom prompts (user authored)
CREATE TABLE public.custom_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy','Medium','Hard')),
  text TEXT NOT NULL,
  framework TEXT NOT NULL,
  points JSONB NOT NULL DEFAULT '[]'::jsonb,
  example JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_id)
);
ALTER TABLE public.custom_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cp_select_own" ON public.custom_prompts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cp_insert_own" ON public.custom_prompts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cp_update_own" ON public.custom_prompts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "cp_delete_own" ON public.custom_prompts FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER cp_updated_at BEFORE UPDATE ON public.custom_prompts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Built-in prompt overrides (id like 'builtin:Easy:0')
CREATE TABLE public.prompt_overrides (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  builtin_id TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy','Medium','Hard')),
  prompt JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, builtin_id)
);
ALTER TABLE public.prompt_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "po_select_own" ON public.prompt_overrides FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "po_insert_own" ON public.prompt_overrides FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "po_update_own" ON public.prompt_overrides FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "po_delete_own" ON public.prompt_overrides FOR DELETE USING (auth.uid() = user_id);

-- Disabled prompt ids (built-in or custom client_id)
CREATE TABLE public.disabled_prompts (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, prompt_id)
);
ALTER TABLE public.disabled_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dp_select_own" ON public.disabled_prompts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "dp_insert_own" ON public.disabled_prompts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dp_delete_own" ON public.disabled_prompts FOR DELETE USING (auth.uid() = user_id);

-- Recordings (audio in storage, metadata here)
CREATE TABLE public.recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  prompt_text TEXT,
  difficulty TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  target_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rec_select_own" ON public.recordings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rec_insert_own" ON public.recordings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rec_delete_own" ON public.recordings FOR DELETE USING (auth.uid() = user_id);

-- Streaks (one row per user)
CREATE TABLE public.streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  count INTEGER NOT NULL DEFAULT 0,
  last_day DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "st_select_own" ON public.streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "st_insert_own" ON public.streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "st_update_own" ON public.streaks FOR UPDATE USING (auth.uid() = user_id);

-- Storage bucket for audio (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('recordings', 'recordings', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "rec_storage_select_own" ON storage.objects FOR SELECT
  USING (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "rec_storage_insert_own" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "rec_storage_delete_own" ON storage.objects FOR DELETE
  USING (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);
