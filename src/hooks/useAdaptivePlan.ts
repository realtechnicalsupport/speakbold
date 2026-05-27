import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { generateAdaptivePlan } from "@/services/geminiService";
import type { AdaptivePlan, SkillProfile } from "@/lib/skillProfile";

const REGEN_SCORE_DELTA = 10; // points the focus skill must move to re-target

/**
 * Decide whether the stored plan is stale relative to the freshly-computed
 * profile. This is the adaptivity gate — it keeps us from burning an AI call
 * on every recompute, only regenerating when something material changed.
 */
function shouldRegenerate(
  storedProfile: SkillProfile | null,
  storedPlan: AdaptivePlan | null,
  next: SkillProfile
): boolean {
  if (!storedPlan || !storedProfile) return true;
  // Weakest skill changed → the plan's whole focus is wrong.
  const prevWeakest = storedProfile.weakest[0] ?? null;
  const nextWeakest = next.weakest[0] ?? null;
  if (prevWeakest !== nextWeakest) return true;
  // Focus skill moved a lot (improved or regressed) → refresh the drills.
  if (nextWeakest) {
    const prev = storedProfile.dimensions.find((d) => d.dimension === nextWeakest)?.average ?? 0;
    const cur = next.dimensions.find((d) => d.dimension === nextWeakest)?.average ?? 0;
    if (Math.abs(cur - prev) >= REGEN_SCORE_DELTA) return true;
  }
  // Graduated from cold start → we now have real data to plan against.
  if (storedProfile.coldStart && !next.coldStart) return true;
  return false;
}

export const useAdaptivePlan = (profile: SkillProfile | null) => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<AdaptivePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const storedProfileRef = useRef<SkillProfile | null>(null);
  const inFlight = useRef(false);

  // Load the persisted snapshot once per user.
  useEffect(() => {
    if (!user) {
      setPlan(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("skill_snapshots")
        .select("profile_json, plan_json")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const storedPlan = data?.plan_json as AdaptivePlan | undefined;
      if (storedPlan && Array.isArray(storedPlan.drills) && storedPlan.drills.length) {
        setPlan(storedPlan);
        storedProfileRef.current = (data?.profile_json as SkillProfile) ?? null;
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const regenerate = useCallback(
    async (force = false) => {
      if (!user || !profile || inFlight.current) return;
      if (!force && !shouldRegenerate(storedProfileRef.current, plan, profile)) return;

      inFlight.current = true;
      setGenerating(true);
      try {
        const newPlan = await generateAdaptivePlan(profile);
        setPlan(newPlan);
        storedProfileRef.current = profile;
        await supabase.from("skill_snapshots").upsert(
          {
            user_id: user.id,
            profile_json: profile,
            plan_json: newPlan,
            based_on_recording_count: profile.basedOnCount,
            generated_at: newPlan.generatedAt,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      } catch (e) {
        console.error("[useAdaptivePlan] regenerate failed", e);
      } finally {
        inFlight.current = false;
        setGenerating(false);
      }
    },
    [user, profile, plan]
  );

  // Auto-regenerate when the profile changes enough to matter.
  useEffect(() => {
    if (loading || !profile) return;
    regenerate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, loading]);

  return { plan, loading, generating, regenerate };
};
