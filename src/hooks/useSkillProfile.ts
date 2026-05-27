import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { computeSkillProfile, type SkillProfile, type ScoredFeedback } from "@/lib/skillProfile";

/** Dispatched by RecordingFeedback after new feedback is generated. */
export const FEEDBACK_SAVED_EVENT = "speakbold:feedback-saved";

export const useSkillProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<SkillProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: fb } = await supabase
        .from("recording_feedback")
        .select("scores, created_at, summary")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);

      // Drop invalid attempts (no meaningful speech).
      const valid: ScoredFeedback[] = (fb || [])
        .filter((r: any) => !String(r?.summary ?? "").startsWith("[INVALID]"))
        .map((r: any) => ({ scores: r.scores ?? {}, created_at: r.created_at }));

      const { data: prof } = await supabase
        .from("profiles")
        .select("weaknesses")
        .eq("id", user.id)
        .maybeSingle();
      const weaknesses: string[] = (prof as any)?.weaknesses ?? [];

      setProfile(computeSkillProfile(valid, weaknesses));
    } catch (err) {
      console.error("[useSkillProfile] failed to compute profile", err);
      setProfile(null);
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

  return { profile, loading, refresh };
};
