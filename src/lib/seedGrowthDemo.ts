import { supabase } from "@/integrations/supabase/client";
import { DIMENSIONS } from "@/lib/skillProfile";

/**
 * Seeds a rising practice history for the current account so the GrowthReport
 * (proof-of-learning) renders a real improvement curve immediately — for the
 * kiosk/demo account a judge will open. Writes to `skill_events`, which
 * useSkillProfile already reads, so no special-casing downstream.
 *
 * Usage (console, while logged into the DEMO account):  seedGrowthDemo()
 *
 * Idempotent-ish: skill_events has no DELETE policy (insert/select only), so we
 * refuse to run if a previous seed is already present rather than doubling it.
 * Use a fresh demo account to re-seed.
 */

// baseline → latest per dimension over SESSIONS sessions. Delivery (body
// language) and clarity climb the most — those are the differentiators we want
// the curve to show off.
const SEED_CURVE: Record<(typeof DIMENSIONS)[number], [number, number]> = {
  content_quality: [52, 80],
  structure: [48, 78],
  clarity: [45, 88],
  pace: [55, 76],
  delivery: [40, 82],
  confidence: [47, 85],
};

const SESSIONS = 6;
const DAYS_BETWEEN = 4; // spread the history across ~3 weeks
const SOURCES = ["impromptu", "pathway", "body-language", "arena", "impromptu", "pathway"];

function lerpRound(from: number, to: number, t: number): number {
  return Math.round(from + (to - from) * t);
}

export async function seedGrowthDemo(): Promise<void> {
  const { data: auth } = await supabase.auth.getSession();
  const uid = auth.session?.user?.id;
  if (!uid) {
    console.error("[seedGrowthDemo] Must be logged in (use the demo account).");
    return;
  }

  // Refuse to double-seed (no DELETE policy to clean up afterwards).
  const { data: existing } = await (supabase as any)
    .from("skill_events")
    .select("id, meta")
    .eq("user_id", uid)
    .limit(200);
  const alreadySeeded = (existing ?? []).some((r: any) => r?.meta?.seed === true);
  if (alreadySeeded) {
    console.warn("[seedGrowthDemo] This account already has seeded growth data. Use a fresh account to re-seed.");
    return;
  }

  const now = Date.now();
  const rows = Array.from({ length: SESSIONS }, (_, i) => {
    const t = i / (SESSIONS - 1); // 0 → 1
    const scores: Record<string, number> = {};
    for (const dim of DIMENSIONS) {
      const [from, to] = SEED_CURVE[dim];
      scores[dim] = lerpRound(from, to, t);
    }
    const overall = Math.round(
      DIMENSIONS.reduce((s, d) => s + scores[d], 0) / DIMENSIONS.length
    );
    const daysAgo = (SESSIONS - 1 - i) * DAYS_BETWEEN;
    return {
      user_id: uid,
      source: SOURCES[i % SOURCES.length],
      scores,
      overall,
      meta: { seed: true },
      created_at: new Date(now - daysAgo * 86_400_000).toISOString(),
    };
  });

  const { error } = await (supabase as any).from("skill_events").insert(rows);
  if (error) {
    console.error("[seedGrowthDemo] insert failed:", error.message);
    return;
  }
  console.log(
    `[seedGrowthDemo] Seeded ${SESSIONS} rising sessions (overall ${rows[0].overall} → ${rows[rows.length - 1].overall}). Open /report to see the curve.`
  );
}
