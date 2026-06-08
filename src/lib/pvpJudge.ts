import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

export type PvpGamemode = "blitz" | "standard" | "debate" | "pitch";

/** A judged result, already oriented to the CALLING player by the edge fn. */
export interface PvpVerdict {
  myScore: number;
  oppScore: number;
  feedback: string;
  oppFeedback: string;
  strengths: string;
  oppStrengths: string;
  exampleSpeech: string;
  won: boolean;
  tie: boolean;
  eloChange: number;
  newElo: number;
}

export interface SubmitForJudgingArgs {
  duelId: string;
  gamemode: PvpGamemode;
  prompt: string;
  /** True if this client is the duel CREATOR (seat). Both clients derive this
   *  from the same shared duel object, so they always agree. */
  isCreator: boolean;
  /** Mode-specific content the server judges. Debate → { opening, rebuttal,
   *  stand }; others → { transcript, wpm, fillers }. Plus name/elo/avatar. */
  payload: Record<string, unknown>;
}

/**
 * Server-authoritative PvP judging. Submits THIS player's side to the
 * judge-match edge function and polls until the authoritative verdict is ready.
 *
 * Both players call this independently with their own side. The edge function
 * judges exactly once (whichever submit completes the pair), writes the verdict
 * + ELO + battle row, and returns the same result to both — oriented to each
 * caller. Re-POSTing is the poll: it's an idempotent side-upsert and also
 * re-triggers judging if a prior attempt failed, so a dropped message or a
 * backgrounded opponent can't strand the verdict (unlike the old host-broadcast
 * design). Throws on timeout so the caller can surface a retry.
 */
export async function submitForJudging(
  args: SubmitForJudgingArgs,
  opts: { timeoutMs?: number; onWaiting?: () => void } = {},
): Promise<PvpVerdict> {
  const { data: { session } } = await supabase.auth.getSession();
  const jwt = session?.access_token;
  if (!jwt) throw new Error("[judge] Not signed in");
  if (!SUPABASE_URL) throw new Error("[judge] VITE_SUPABASE_URL not configured");

  const body = JSON.stringify({
    duelId: args.duelId,
    gamemode: args.gamemode,
    prompt: args.prompt,
    seat: args.isCreator ? "creator" : "joiner",
    payload: args.payload,
  });

  const timeout = opts.timeoutMs ?? 45000;
  const start = Date.now();
  let lastErr: unknown = null;

  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/judge-match`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${jwt}`,
        },
        body,
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.status === "done" && data.verdict) return data.verdict as PvpVerdict;
        if (data?.status === "waiting") opts.onWaiting?.();
        // "waiting" (opponent hasn't submitted) | "judging" (peer is judging) →
        // keep polling.
      } else {
        lastErr = new Error(`judge-match ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
      }
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  throw lastErr instanceof Error ? lastErr : new Error("[judge] Timed out waiting for the verdict");
}
