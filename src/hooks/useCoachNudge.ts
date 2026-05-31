import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSyncedStreak } from "@/hooks/useRecordings";
import { getSkillProfileFor } from "@/lib/coachContext";
import type { SkillProfile } from "@/lib/skillProfile";

export interface CoachNudge {
  id: string;
  type: "activation" | "streak" | "stale" | "weakest";
  message: string;
  ctaLabel: string;
  dimension?: string;
}

const todayKey = () => new Date().toISOString().slice(0, 10);

// Highest-priority applicable nudge, or null. Purely from the user's data — no
// guessing, no nagging.
function pickNudge(profile: SkillProfile, streak: number, practicedToday: boolean): CoachNudge | null {
  // 1. Fresh account → activate the coach.
  if (profile.basedOnCount === 0) {
    return {
      id: "activation",
      type: "activation",
      message: "Record one 60-second drill and I'll map your speaking across 6 skills.",
      ctaLabel: "Try a drill",
    };
  }
  // 2. Streak alive but not practiced today → protect it.
  if (streak > 0 && !practicedToday) {
    return {
      id: "streak",
      type: "streak",
      message: `Your ${streak}-day streak is still alive — a quick drill keeps it going.`,
      ctaLabel: "Keep my streak",
    };
  }
  // 3. A measured skill has gone stale → freshen it.
  const stale = profile.dimensions.find((d) => d.sampleCount > 0 && d.stale && d.dimension !== "delivery");
  if (stale) {
    return {
      id: `stale-${stale.dimension}`,
      type: "stale",
      message: `Your ${stale.label} hasn't had a workout in a while. Sharpen it?`,
      ctaLabel: `Drill ${stale.label}`,
      dimension: stale.dimension,
    };
  }
  // 4. Otherwise nudge toward the weakest skill.
  const weakestKey = profile.weakest.find((d) => d !== "delivery");
  const weakest = weakestKey ? profile.dimensions.find((d) => d.dimension === weakestKey) : null;
  if (weakest && weakest.sampleCount > 0) {
    return {
      id: `weakest-${weakest.dimension}`,
      type: "weakest",
      message: `${weakest.label} is your lowest skill right now (${weakest.average}). Want a targeted drill?`,
      ctaLabel: `Drill ${weakest.label}`,
      dimension: weakest.dimension,
    };
  }
  return null;
}

/**
 * Computes ONE gentle proactive nudge, at most once per browser session, and no
 * more than once per nudge-type per day. Intentionally conservative — the goal
 * is a helpful tap, never a pest. The consumer only renders it when the chat FAB
 * is already visible (so it's auto-suppressed during drills / when chat is open).
 */
export function useCoachNudge({ enabled, pathname }: { enabled: boolean; pathname: string }) {
  const { user } = useAuth();
  const { count: streak, practicedToday } = useSyncedStreak();
  const [nudge, setNudge] = useState<CoachNudge | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (!enabled || !user) return;
    // The coach hub already shows all this — don't nudge on top of it.
    if (pathname.startsWith("/lab")) return;
    if (attempted.current) return;
    if (sessionStorage.getItem("speakbold:nudge:attempted") === "1") return;

    let cancelled = false;
    const t = window.setTimeout(async () => {
      attempted.current = true;
      try { sessionStorage.setItem("speakbold:nudge:attempted", "1"); } catch { /* private mode */ }
      try {
        const profile = await getSkillProfileFor(user.id);
        if (cancelled) return;
        const candidate = pickNudge(profile, streak, practicedToday);
        if (!candidate) return;
        // Don't repeat the same type more than once a day.
        const key = `speakbold:nudge:${user.id}:${candidate.type}`;
        if (localStorage.getItem(key) === todayKey()) return;
        try { localStorage.setItem(key, todayKey()); } catch { /* private mode */ }
        if (!cancelled) setNudge(candidate);
      } catch { /* silent — a nudge is never worth an error */ }
    }, 4500); // let the user settle before surfacing anything

    return () => { cancelled = true; window.clearTimeout(t); };
  }, [enabled, user?.id, pathname, streak, practicedToday]);

  return { nudge, dismiss: () => setNudge(null) };
}
