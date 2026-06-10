-- ─── peek_friend_invite ───────────────────────────────────────────────────────
-- Public SECURITY DEFINER function: returns the inviter's display_name for a
-- valid, unexpired, unclaimed token. Returns NULL for invalid / expired tokens.
-- Safe to call without authentication (signed-out landing page).
CREATE OR REPLACE FUNCTION public.peek_friend_invite(p_token TEXT)
RETURNS TABLE (inviter_display_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT p.display_name::TEXT
    FROM public.friend_invites fi
    JOIN public.profiles p ON p.id = fi.inviter_id
    WHERE fi.token = p_token
      AND fi.claimed_by IS NULL
      AND fi.expires_at > now()
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.peek_friend_invite(TEXT) TO anon, authenticated;

-- ─── claim_friend_invite ─────────────────────────────────────────────────────
-- Authenticated SECURITY DEFINER function:
--   1. Validates the token (unexpired, unclaimed, not inviting yourself).
--   2. Inserts an accepted friendship row (canonical ordering: min(a,b) = user_a).
--   3. Marks the invite as claimed.
-- Returns the inviter's display_name on success or raises an exception.
CREATE OR REPLACE FUNCTION public.claim_friend_invite(p_token TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inviter_id  UUID;
  v_display     TEXT;
  v_ua          UUID;
  v_ub          UUID;
BEGIN
  -- Validate token
  SELECT fi.inviter_id, p.display_name
  INTO v_inviter_id, v_display
  FROM public.friend_invites fi
  JOIN public.profiles p ON p.id = fi.inviter_id
  WHERE fi.token = p_token
    AND fi.claimed_by IS NULL
    AND fi.expires_at > now()
  LIMIT 1;

  IF v_inviter_id IS NULL THEN
    RAISE EXCEPTION 'invalid_or_expired_invite';
  END IF;

  IF v_inviter_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot_friend_yourself';
  END IF;

  -- Canonical ordering
  IF auth.uid() < v_inviter_id THEN
    v_ua := auth.uid();
    v_ub := v_inviter_id;
  ELSE
    v_ua := v_inviter_id;
    v_ub := auth.uid();
  END IF;

  -- Insert friendship (skip if already exists)
  INSERT INTO public.friendships (user_a, user_b, status, requested_by, accepted_at)
  VALUES (v_ua, v_ub, 'accepted', v_inviter_id, now())
  ON CONFLICT (user_a, user_b) DO UPDATE
    SET status = 'accepted', accepted_at = now();

  -- Mark invite claimed
  UPDATE public.friend_invites
  SET claimed_by = auth.uid(), claimed_at = now()
  WHERE token = p_token;

  RETURN v_display;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_friend_invite(TEXT) TO authenticated;
