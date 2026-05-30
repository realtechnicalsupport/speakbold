-- ─── friendships ─────────────────────────────────────────────────────────────
-- One canonical row per pair. user_a < user_b enforced by CHECK.
CREATE TABLE IF NOT EXISTS public.friendships (
  user_a       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at  TIMESTAMPTZ,
  PRIMARY KEY (user_a, user_b),
  CHECK (user_a < user_b)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_friendships_user_a ON public.friendships(user_a) WHERE status = 'accepted';
CREATE INDEX IF NOT EXISTS idx_friendships_user_b ON public.friendships(user_b) WHERE status = 'accepted';
CREATE INDEX IF NOT EXISTS idx_friendships_pending ON public.friendships(user_b, requested_by) WHERE status = 'pending';

CREATE POLICY "friendships_select_own" ON public.friendships
  FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "friendships_insert_self" ON public.friendships
  FOR INSERT WITH CHECK (
    auth.uid() = requested_by
    AND (auth.uid() = user_a OR auth.uid() = user_b)
  );

CREATE POLICY "friendships_update_accept" ON public.friendships
  FOR UPDATE
  USING (auth.uid() = user_a OR auth.uid() = user_b)
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "friendships_delete_either" ON public.friendships
  FOR DELETE USING (auth.uid() = user_a OR auth.uid() = user_b);

-- ─── friend_invites ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.friend_invites (
  token       TEXT PRIMARY KEY,
  inviter_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claimed_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at  TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days')
);

ALTER TABLE public.friend_invites ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_friend_invites_inviter ON public.friend_invites(inviter_id);

CREATE POLICY "friend_invites_select_own" ON public.friend_invites
  FOR SELECT USING (auth.uid() = inviter_id OR auth.uid() = claimed_by);

CREATE POLICY "friend_invites_insert_self" ON public.friend_invites
  FOR INSERT WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "friend_invites_delete_own" ON public.friend_invites
  FOR DELETE USING (auth.uid() = inviter_id);

-- ─── Extend streaks RLS so friends can read each other's streaks ─────────────
DROP POLICY IF EXISTS "st_select_own" ON public.streaks;

CREATE POLICY "st_select_self_or_friend" ON public.streaks
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.user_a = auth.uid() AND f.user_b = user_id)
          OR (f.user_b = auth.uid() AND f.user_a = user_id)
        )
    )
  );

-- ─── last_active_at on profiles ───────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON public.profiles(last_active_at DESC);
