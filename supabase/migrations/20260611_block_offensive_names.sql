-- ─── Why ──────────────────────────────────────────────────────────────────────
-- 20260610 made display names XSS/garbage-safe but did nothing about *offensive*
-- names — slurs / strong profanity a troll could set to deface the leaderboard,
-- arena lobby, and friends lists during the public competition demo. The client
-- now blocks these at signup (lib/displayName.ts), but the anon key can write to
-- profiles directly and signup metadata is attacker-controllable, so the durable
-- guardrail has to live in the DB.
--
-- We NEUTRALISE rather than reject: an offensive name collapses to NULL, and the
-- app falls back to a generic "User …" label. Rejecting would break the signup
-- path (handle_new_user's INSERT would fail and strand the auth user).
--
-- Matching mirrors lib/displayName.ts and is deliberately tuned to avoid the
-- "Scunthorpe problem":
--   • de-leet first (0→o, 4→a, @→a, …) so spacing/leet evasion is caught;
--   • SLURS  → matched against a letters-only "collapsed" form (substring).
--     Only collision-safe terms (never inside real names) go here.
--   • PROFANITY + collision-prone slurs → matched as WHOLE WORDS only, so
--     "Cassandra" (ass), "Michelle" (hell), "Fagan" (fag), "Spicer" (spic),
--     "raccoon" (coon), "Van Dyke" (dyke), "Pakistani" (paki) all survive.

-- 1. Offensive-name detector.
CREATE OR REPLACE FUNCTION public.is_offensive_name(raw text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  deleeted  text;
  collapsed text;
BEGIN
  IF raw IS NULL THEN RETURN false; END IF;

  -- de-leet: same map as the client (from/to strings are equal length).
  deleeted  := translate(lower(raw), '01345789@$!|', 'oieastbgasii');
  collapsed := regexp_replace(deleeted, '[^a-z]', '', 'g');

  -- Slurs: collision-safe, matched anywhere in the collapsed form.
  IF collapsed ~ '(nigger|nigga|faggot|retard|chink|wetback|tranny|raghead|beaner)' THEN
    RETURN true;
  END IF;

  -- Strong profanity + collision-prone slurs: whole words only (\m…\M = word
  -- boundaries), so legitimate names that merely contain the substring survive.
  IF deleeted ~ '\m(fuck|fucker|fucking|shit|bitch|cunt|ass|asshole|dick|pussy|bastard|whore|slut|cock|wank|nazi|rape|rapist|pedo|pedophile|fag|coon|spic|kike|gook|paki|dyke)\M' THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 2. Fold the gate into the existing sanitiser. Everything else is unchanged
--    (angle-bracket strip, control chars, whitespace collapse, length cap) —
--    we just add a final offensive-name check that nulls the name out. The
--    profiles trigger AND handle_new_user already call this function, so this
--    one redefinition covers both the form-write and signup-metadata paths.
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

  cleaned := regexp_replace(raw, '[<>]', '', 'g');
  cleaned := regexp_replace(cleaned, '[[:cntrl:]]', '', 'g');
  cleaned := regexp_replace(cleaned, '\s+', ' ', 'g');
  cleaned := btrim(cleaned);
  cleaned := left(cleaned, 32);

  -- Must retain at least one letter or digit, else it isn't a real name.
  IF cleaned !~ '[[:alnum:]]' THEN
    RETURN NULL;
  END IF;

  -- Offensive → no name (downstream shows a generic "User …" label).
  IF public.is_offensive_name(cleaned) THEN
    RETURN NULL;
  END IF;

  RETURN cleaned;
END;
$$;

-- 3. Scrub any offensive rows already in the table.
UPDATE public.profiles
SET display_name = NULL
WHERE display_name IS NOT NULL
  AND public.is_offensive_name(display_name);
