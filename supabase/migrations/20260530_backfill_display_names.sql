-- ─── Why ──────────────────────────────────────────────────────────────────────
-- Friend search matches on profiles.display_name via ILIKE, which can never
-- match a NULL value. Accounts created without writing a display_name (notably
-- Google OAuth signups) had display_name = NULL and were invisible to search.
-- There was also no trigger creating / populating a profiles row on signup, so
-- some users had no profiles row at all.

-- 1. Backfill missing profile rows from auth.users.
INSERT INTO public.profiles (id, display_name)
SELECT
  u.id,
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'display_name', ''),
    NULLIF(u.raw_user_meta_data->>'full_name', ''),
    NULLIF(u.raw_user_meta_data->>'name', ''),
    split_part(u.email, '@', 1)
  )
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 2. Backfill display_name for existing rows where it is NULL/blank.
UPDATE public.profiles p
SET display_name = COALESCE(
      NULLIF(u.raw_user_meta_data->>'display_name', ''),
      NULLIF(u.raw_user_meta_data->>'full_name', ''),
      NULLIF(u.raw_user_meta_data->>'name', ''),
      split_part(u.email, '@', 1)
    ),
    updated_at = now()
FROM auth.users u
WHERE u.id = p.id
  AND (p.display_name IS NULL OR p.display_name = '');

-- 3. Trigger: every new auth user gets a profiles row with a display_name so
--    they're searchable from the moment they sign up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO UPDATE
    SET display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
