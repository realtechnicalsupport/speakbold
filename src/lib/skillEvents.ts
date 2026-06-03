import { supabase } from "@/integrations/supabase/client";
import { FEEDBACK_SAVED_EVENT } from "@/hooks/useSkillProfile";
import type { DimScores } from "./skillScoring";

export type SkillSource =
  | "impromptu"
  | "pathway"
  | "arena"
  | "recording"
  | "coach"
  | "interview"
  | "public-speaking"
  | "body-language";

/**
 * Persist one skill signal so the Coach learns from this session. Fire-and-forget
 * — never block or fail the surface that called it. Dispatches the
 * feedback-saved event so an open Coach view recomputes immediately.
 */
export async function logSkillEvent(opts: {
  userId: string | undefined | null;
  source: SkillSource;
  scores: DimScores;
  overall?: number | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    if (!opts.userId) return;
    const scores = opts.scores ?? {};
    if (Object.keys(scores).length === 0) return;
    const { error } = await supabase.from("skill_events").insert({
      user_id: opts.userId,
      source: opts.source,
      scores,
      overall: opts.overall ?? null,
      meta: opts.meta ?? {},
    });
    if (error) {
      console.warn("[skillEvents] insert failed", error.message);
      return;
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(FEEDBACK_SAVED_EVENT));
    }
  } catch (e) {
    console.warn("[skillEvents] log error", e);
  }
}
