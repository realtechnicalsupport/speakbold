-- ─── Why ──────────────────────────────────────────────────────────────────────
-- The profiles table had been polluted with stored-XSS-style display names —
-- `<img src=x onerror=…>`, `<span style=…>HELLO</span>`, raw `<h1>` markup, etc.
-- React escapes these on render so they were never *executed*, but they made the
-- leaderboard / friends lists unreadable and are a latent risk if any surface
-- ever renders a name as HTML. The client now validates names (lib/displayName),
-- but the anon key can write to profiles directly and the signup path pulls the
-- name from attacker-controllable auth metadata — so the durable guardrail must
-- live in the database.
--
-- Strategy: a SECURITY-relevant sanitiser applied by a BEFORE INSERT/UPDATE
-- trigger on profiles, plus the same sanitiser folded into handle_new_user() so
-- the signup-metadata path is covered too. We *sanitise* rather than reject so a
-- messy-but-human name still lands; only the dangerous characters are stripped.

-- 1. Sanitiser: kill angle brackets (the HTML/script sigils) and control chars,
--    collapse whitespace, trim, and cap length. Returns NULL when nothing
--    usable remains (treated as "no name" / unranked downstream).
CREATE OR REPLACE FUNCTION public.sanitize_display_name(raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned text;
BEGIN
  IF raw IS NULL THEN
    RETURN NULL;
  END IF;

  -- Strip angle brackets entirely (defuses `<img …>`, `<script>`, `<h1>` …),
  -- then remove ASCII control characters, then collapse internal whitespace.
  cleaned := regexp_replace(raw, '[<>]', '', 'g');
  cleaned := regexp_replace(cleaned, '[[:cntrl:]]', '', 'g');
  cleaned := regexp_replace(cleaned, '\s+', ' ', 'g');
  cleaned := btrim(cleaned);
  cleaned := left(cleaned, 32);

  -- Must retain at least one letter or digit, else it isn't a real name.
  IF cleaned !~ '[[:alnum:]]' THEN
    RETURN NULL;
  END IF;

  RETURN cleaned;
END;
$$;

-- 2. Trigger on profiles — covers form writes AND direct anon-key API writes.
CREATE OR REPLACE FUNCTION public.profiles_sanitize_name()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.display_name := public.sanitize_display_name(NEW.display_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sanitize_name_trg ON public.profiles;
CREATE TRIGGER profiles_sanitize_name_trg
  BEFORE INSERT OR UPDATE OF display_name ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_sanitize_name();

-- 3. Re-define handle_new_user() to sanitise the name pulled from auth metadata
--    at signup (raw_user_meta_data is attacker-controllable on self-signup).
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
    public.sanitize_display_name(
      COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
        NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
        NULLIF(NEW.raw_user_meta_data->>'name', ''),
        split_part(NEW.email, '@', 1)
      )
    )
  )
  ON CONFLICT (id) DO UPDATE
    SET display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name);
  RETURN NEW;
END;
$$;

-- 4. Clean up the existing polluted rows in place.
UPDATE public.profiles
SET display_name = public.sanitize_display_name(display_name)
WHERE display_name ~ '[<>]'
   OR display_name ~ '[[:cntrl:]]';
