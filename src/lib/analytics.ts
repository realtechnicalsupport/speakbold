import { supabase } from "@/integrations/supabase/client";

// ─────────────────────────────────────────────────────────────────────────────
// Activation-funnel analytics — a deliberately thin, fire-and-forget shim.
//
// Council mandate ("measure before you cut"): instrument the new-user funnel so
// onboarding changes can be judged on real activation/retention, not vibes.
//
// Design rules:
//   • NEVER throws, NEVER blocks the UI, NEVER awaits in the caller's path.
//   • Safe if the `analytics_events` table doesn't exist yet (migration unapplied)
//     — the insert simply errors server-side and we swallow it.
//   • Works for anonymous visitors (landing trial) via a stable per-browser id,
//     and attributes to the user once signed in.
//
// Query it from the Supabase dashboard / service role (clients can't SELECT).
// ─────────────────────────────────────────────────────────────────────────────

const ANON_KEY = "speakbold_anon_id";

/** Stable per-browser id so the pre-signup funnel can be stitched together. */
function getAnonId(): string {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id =
        (typeof crypto !== "undefined" && crypto.randomUUID?.()) ||
        `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return "anon-unknown";
  }
}

/** The canonical activation-funnel events. String fallback is allowed for
 *  ad-hoc events, but prefer this union so the funnel stays consistent. */
export type AnalyticsEvent =
  // Pre-signup landing trial
  | "trial_started"
  | "trial_completed"
  | "trial_signup_click"
  // Account
  | "signup"
  // Onboarding (post-signup)
  | "onboarding_shown"
  | "onboarding_goal_selected"
  | "onboarding_skipped"
  // Placement (now non-blocking)
  | "placement_shown"
  | "placement_taken"
  | "placement_skipped"
  // Core aha
  | "drill_started"
  | "drill_completed"
  // Body-language camera (earned upgrade)
  | "camera_requested"
  | "camera_granted";

/**
 * Log a funnel event. Fire-and-forget — call it and move on.
 *
 * @example track("trial_completed", { wpm: 142, fillers: 3 })
 */
export function track(event: AnalyticsEvent | string, props: Record<string, unknown> = {}): void {
  void (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id ?? null;
      await supabase.from("analytics_events").insert({
        event,
        props,
        anon_id: getAnonId(),
        user_id: userId,
      });
    } catch {
      /* analytics must never affect UX — swallow everything */
    }
  })();
}
