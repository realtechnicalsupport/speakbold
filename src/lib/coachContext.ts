import { supabase } from "@/integrations/supabase/client";
import { computeSkillProfile, type SkillProfile, type ScoredFeedback } from "./skillProfile";
import { getRankFromElo } from "@/hooks/arenaUtils";

/**
 * Recompute the live skill profile for a user from every signal source
 * (recording_feedback + skill_events) — same merge the Coach hub uses. Shared
 * so the chat assistant and the "start a drill from chat" action both work off
 * the user's real performance.
 */
export async function getSkillProfileFor(userId: string): Promise<SkillProfile> {
  const [fbRes, evRes, profRes] = await Promise.all([
    supabase
      .from("recording_feedback")
      .select("scores, created_at, summary")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(40),
    (supabase as any)
      .from("skill_events")
      .select("scores, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase.from("profiles").select("weaknesses").eq("id", userId).maybeSingle(),
  ]);

  const fromRecordings: ScoredFeedback[] = (fbRes.data || [])
    .filter((r: any) => !String(r?.summary ?? "").startsWith("[INVALID]"))
    .map((r: any) => ({ scores: r.scores ?? {}, created_at: r.created_at }));
  const fromEvents: ScoredFeedback[] = (evRes.data || []).map((r: any) => ({
    scores: r.scores ?? {},
    created_at: r.created_at,
  }));
  const weaknesses: string[] = (profRes.data as any)?.weaknesses ?? [];

  return computeSkillProfile([...fromRecordings, ...fromEvents], weaknesses);
}

/** A compact, human-readable snapshot of the user's state for the chat prompt. */
export interface CoachContext {
  pathname: string;
  userName: string;
  coldStart: boolean;
  sessionsAnalyzed: number;
  overall: number;
  weakest: string[];
  strongest: string[];
  skills: string[]; // "Clarity 58 (declining)"
  streak: number;
  bestStreak: number;
  rank: string | null;
  planFocus: string | null;
  planHeadline: string | null;
  lastFeedback: string | null;
}

export async function buildCoachContext(
  userId: string,
  pathname: string,
  userName: string,
): Promise<CoachContext> {
  const [profile, streakRes, profRes, snapRes, lastFbRes] = await Promise.all([
    getSkillProfileFor(userId),
    supabase.from("streaks").select("count, best_count").eq("user_id", userId).maybeSingle(),
    supabase.from("profiles").select("elo").eq("id", userId).maybeSingle(),
    (supabase as any).from("skill_snapshots").select("plan_json").eq("user_id", userId).maybeSingle(),
    supabase
      .from("recording_feedback")
      .select("summary, improvements, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const labelOf = (dim: string) => profile.dimensions.find((x) => x.dimension === dim)?.label ?? dim;
  const elo = (profRes.data as any)?.elo ?? null;
  const rank = elo != null ? getRankFromElo(elo) : null;
  const plan = (snapRes.data as any)?.plan_json ?? null;
  const lastFb = lastFbRes.data?.[0] as any;
  const improvements = Array.isArray(lastFb?.improvements) ? lastFb.improvements.slice(0, 2) : [];

  return {
    pathname,
    userName,
    coldStart: profile.coldStart,
    sessionsAnalyzed: profile.basedOnCount,
    overall: profile.overallAverage,
    weakest: profile.weakest.map(labelOf),
    strongest: profile.strongest.map(labelOf),
    skills: profile.dimensions
      .filter((d) => d.sampleCount > 0)
      .map((d) => `${d.label} ${d.average} (${d.trend})`),
    streak: streakRes.data?.count ?? 0,
    bestStreak: (streakRes.data as any)?.best_count ?? 0,
    rank: rank ? `${rank.name} ${rank.tier}` : null,
    planFocus: plan?.focusLabel ?? null,
    planHeadline: plan?.headline ?? null,
    lastFeedback: improvements.length ? improvements.join("; ") : lastFb?.summary ?? null,
  };
}
