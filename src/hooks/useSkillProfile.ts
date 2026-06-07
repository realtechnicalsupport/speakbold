import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  computeSkillProfile,
  computeGrowth,
  type SkillProfile,
  type GrowthReport,
  type ScoredFeedback,
} from "@/lib/skillProfile";

/** Dispatched by RecordingFeedback after new feedback is generated. */
export const FEEDBACK_SAVED_EVENT = "speakbold:feedback-saved";

export const useSkillProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<SkillProfile | null>(null);
  const [growth, setGrowth] = useState<GrowthReport | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setGrowth(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // The Coach learns from EVERY surface: standalone recordings
      // (recording_feedback) PLUS drills/arena/free-practice (skill_events).
      // Both carry the same partial-dimension `scores` shape.
      const [fbRes, evRes, profRes] = await Promise.all([
        supabase
          .from("recording_feedback")
          .select("scores, created_at, summary")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(40),
        (supabase as any)
          .from("skill_events")
          .select("scores, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(60),
        supabase.from("profiles").select("weaknesses").eq("id", user.id).maybeSingle(),
      ]);

      // Drop invalid recording attempts (no meaningful speech).
      const fromRecordings: ScoredFeedback[] = (fbRes.data || [])
        .filter((r: any) => !String(r?.summary ?? "").startsWith("[INVALID]"))
        .map((r: any) => ({ scores: r.scores ?? {}, created_at: r.created_at }));

      // skill_events table may not exist yet (pre-migration) → evRes.error.
      const fromEvents: ScoredFeedback[] = (evRes.data || [])
        .map((r: any) => ({ scores: r.scores ?? {}, created_at: r.created_at }));

      const merged = [...fromRecordings, ...fromEvents];
      const weaknesses: string[] = (profRes.data as any)?.weaknesses ?? [];

      setProfile(computeSkillProfile(merged, weaknesses));
      // Growth uses the FULL merged history (not the rolling-10 window) so the
      // baseline is the genuine first session.
      setGrowth(computeGrowth(merged));
    } catch (err) {
      console.error("[useSkillProfile] failed to compute profile", err);
      setProfile(null);
      setGrowth(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Recompute whenever new feedback lands (the adaptivity trigger).
  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener(FEEDBACK_SAVED_EVENT, handler);
    return () => window.removeEventListener(FEEDBACK_SAVED_EVENT, handler);
  }, [refresh]);

  return { profile, growth, loading, refresh };
};
