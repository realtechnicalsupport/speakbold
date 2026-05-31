import { supabase } from "@/integrations/supabase/client";

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86_400_000);

/**
 * Mark today as practiced for a user — the single shared path used by the
 * streak hook AND non-hook callers (e.g. Arena battles). Bumps the daily
 * streak, tracks `best_count`, and logs the day to `practice_days` so the
 * profile activity chart stays consistent everywhere. Idempotent within a day,
 * fire-and-forget (never throws into the caller).
 */
export async function markPracticedDay(userId: string | undefined | null): Promise<void> {
  if (!userId) return;
  try {
    const today = todayKey();
    const { data: row } = await supabase
      .from("streaks")
      .select("count, best_count, last_day")
      .eq("user_id", userId)
      .maybeSingle();

    if (!row) {
      await supabase
        .from("streaks")
        .upsert({ user_id: userId, count: 1, best_count: 1, last_day: today }, { onConflict: "user_id" });
    } else if (row.last_day !== today) {
      const gap = row.last_day ? daysBetween(row.last_day, today) : Infinity;
      const next = gap === 1 ? (row.count ?? 0) + 1 : 1;
      const best = Math.max((row as any).best_count ?? 0, next, row.count ?? 0);
      await supabase
        .from("streaks")
        .update({ count: next, best_count: best, last_day: today })
        .eq("user_id", userId);
    }
    // Always log the day (idempotent) so the activity chart reflects this practice.
    await supabase
      .from("practice_days")
      .upsert({ user_id: userId, day: today }, { onConflict: "user_id,day" });
  } catch (e) {
    console.warn("[streak] markPracticedDay failed", e);
  }
}
