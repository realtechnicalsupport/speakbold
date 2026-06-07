-- Lightweight product-analytics sink for the activation funnel. The new-user
-- experience was instrumented (council recommendation: "measure before you cut")
-- so onboarding changes can be evaluated against real activation/retention data
-- instead of guesses. This is a write-only event log:
--   • Anonymous landing-page events (the no-signup trial) insert with user_id NULL
--     and a client-generated anon_id, so the pre-signup funnel is measurable too.
--   • Authed events attribute to auth.uid().
-- Clients can INSERT but never SELECT — analytics is queried server-side / via the
-- service role, so one visitor can't read another's events.

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,  -- NULL for anonymous
  anon_id text,                                                -- stable per-browser id
  event text NOT NULL,                                         -- funnel event name
  props jsonb NOT NULL DEFAULT '{}'::jsonb,                    -- arbitrary event payload
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or authed) may log an event. Authed users can only attribute to
-- themselves; anonymous events carry a NULL user_id.
DO $$ BEGIN
  CREATE POLICY "analytics_events insert any" ON public.analytics_events
    FOR INSERT WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- No SELECT policy on purpose: with RLS enabled and no SELECT policy, clients
-- cannot read the table. Query it from the dashboard / service role only.

CREATE INDEX IF NOT EXISTS idx_analytics_events_event ON public.analytics_events(event, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user  ON public.analytics_events(user_id, created_at DESC);

NOTIFY pgrst, 'reload schema';
