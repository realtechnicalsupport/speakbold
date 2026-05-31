-- Persist "the user has resolved the Pathway placement gate" (took the test or
-- skipped) server-side, so it follows them across devices/browsers instead of
-- living only in localStorage. Without this, a user who skipped on one device
-- would see the placement gate again on another.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS placement_done boolean NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';
