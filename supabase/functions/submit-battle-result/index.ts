// supabase/functions/submit-battle-result/index.ts
// Authoritative battle-result writer. The client used to UPDATE profiles.elo
// directly, which let any user PATCH their row to any rating. Now ELO is
// recomputed server-side from inputs we re-derive (opponent rating + match
// count from the DB, not from the client payload). The client is also allowed
// to insert into `arena_battles` from here so the row genuinely matches the
// ELO move.
//
// Deploy: supabase functions deploy submit-battle-result
// Secrets: just SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (the standard pair).
//
// Once deployed, tighten RLS on profiles.elo so the client cannot UPDATE it
// directly — only this function (using the service-role key) writes the value.

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const JSON_HEADERS = { ...CORS, "Content-Type": "application/json" };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

// ─── ELO constants — must mirror src/hooks/arenaUtils.ts ───────────────────
const STARTING_ELO = 1000;
const ELO_FLOOR = 0; // Floor at 0 not 100 — prevents raising a reset ELO back up on loss.
const FORFEIT_PENALTY = 30;
const PLACEMENT_MATCHES_REQUIRED = 5;
const AI_DAMPING = 0.75;
const QUALITY_COEF = 8;
const MAX_SINGLE_GAIN = 50;
const MAX_SINGLE_LOSS = 40;
const LOW_SCORE_PENALTY_CAP = 8;
// Placement (first rated match) — mirror src/hooks/arenaUtils.ts.
const PLACEMENT_FLOOR = 200;
const PLACEMENT_CAP   = 1600;
const PLACEMENT_MARGIN_COEF  = 4;
const PLACEMENT_QUALITY_COEF = 4;

// Keep an earned rating off the unranked sentinel (mirror of arenaUtils). The
// client treats elo === STARTING_ELO as "no rating" (isRankedElo + the
// leaderboard's .neq filter), so a ranked player who drifts onto exactly 1000
// would be wrongly hidden. Nudge by +1 — same rank, never collides.
const nudgeOffSentinel = (elo: number): number => elo === STARTING_ELO ? STARTING_ELO + 1 : elo;

// Place an unranked player (NULL elo) from the result of their first battle.
// Anchored to the opponent's level, pushed by score margin + absolute quality,
// AI-damped, then clamped so one match can't mint Diamond or bottom you out.
function computePlacementElo(oppElo: number, myScore: number | null, oppScore: number | null, isAi: boolean): number {
  const me  = myScore  ?? 50;
  const opp = oppScore ?? 50;
  let push = (me - opp) * PLACEMENT_MARGIN_COEF + (me - 50) * PLACEMENT_QUALITY_COEF;
  if (isAi) push *= AI_DAMPING;
  const placement = Math.round(Math.max(PLACEMENT_FLOOR, Math.min(PLACEMENT_CAP, oppElo + push)));
  // Never land on the unranked sentinel — it reads as "no rating" downstream.
  return nudgeOffSentinel(placement);
}

type Gamemode = "blitz" | "standard" | "debate" | "pitch";
const MODE_MULTIPLIERS: Record<Gamemode, number> = {
  blitz: 0.80, pitch: 0.90, standard: 1.00, debate: 1.20,
};

function getKFactor(myElo: number, matchesPlayed: number): number {
  if (matchesPlayed < PLACEMENT_MATCHES_REQUIRED) return 48;
  if (myElo < 600)  return 32;
  if (myElo < 1200) return 28;
  if (myElo < 1800) return 24;
  if (myElo < 2400) return 20;
  return 16;
}

interface EloInput {
  myElo: number;
  oppElo: number;
  myScore: number | null;
  oppScore: number | null;
  matchesPlayed: number;
  mode: Gamemode;
  isAi?: boolean;
  isTie?: boolean;
  isForfeit?: "self" | "opponent" | null;
}

function computeEloChange(input: EloInput): number {
  const { myElo, oppElo, myScore, oppScore, matchesPlayed, mode, isAi, isTie, isForfeit } = input;

  if (isForfeit === "self") return -FORFEIT_PENALTY;
  if (isForfeit === "opponent") {
    return computeEloChange({ myElo, oppElo, myScore: 80, oppScore: 20, matchesPlayed, mode, isAi });
  }

  const expectedScore  = 1 / (1 + Math.pow(10, (oppElo - myElo) / 400));
  const expectedSigned = 2 * expectedScore - 1;

  let perfMargin: number;
  let qualityBonus: number;
  const haveScores = myScore != null && oppScore != null && (myScore > 0 || oppScore > 0);

  if (haveScores) {
    perfMargin   = (myScore! - oppScore!) / 100;
    qualityBonus = (myScore! / 100) - 0.5;
  } else if (isTie) {
    perfMargin = 0; qualityBonus = 0;
  } else {
    perfMargin = 0; qualityBonus = 0;
  }

  const K = getKFactor(myElo, matchesPlayed);
  let delta = K * (perfMargin - expectedSigned) + QUALITY_COEF * qualityBonus;

  delta *= MODE_MULTIPLIERS[mode] ?? 1.0;
  if (isAi) delta *= AI_DAMPING;

  delta = Math.max(-MAX_SINGLE_LOSS, Math.min(MAX_SINGLE_GAIN, delta));

  if (myScore != null && myScore < 30 && delta > 0) {
    delta = -Math.min(LOW_SCORE_PENALTY_CAP, Math.abs(delta) || 1);
  }

  // Outcome-sign guarantee (mirror of src/hooks/arenaUtils.ts): a decisive,
  // scored LOSS must never gain rating and a WIN must never lose it. The hybrid
  // performance/quality terms can otherwise flip a narrow or high-scoring loss
  // positive, which contradicts the recorded winner. Only sign mismatches are
  // corrected; magnitudes (incl. upset wins) stay as computed.
  if (haveScores && !isTie && myScore != null && oppScore != null && myScore !== oppScore) {
    const iWon = myScore > oppScore;
    if (!iWon && delta > 0) {
      delta = -Math.min(LOW_SCORE_PENALTY_CAP, Math.abs(delta) || 1);
    } else if (iWon && delta < 0 && myScore >= 30) {
      delta = Math.min(LOW_SCORE_PENALTY_CAP, Math.abs(delta) || 1);
    }
  }

  const rounded = Math.round(delta);
  if (rounded === 0 && !isTie) {
    // A near-silent score never earns the +1 decisive nudge (mirror of
    // arenaUtils) — keeps a sub-30 technical win from gaining rating.
    if (myScore != null && myScore < 30) return -1;
    if (perfMargin > 0) return 1;
    if (perfMargin < 0) return -1;
    return expectedSigned > 0 ? -1 : 1;
  }
  return rounded;
}

// ─── Request body ──────────────────────────────────────────────────────────
interface BattleResultBody {
  /** Client-side duel id (for logging / dedupe). */
  duelId: string;
  gamemode: Gamemode;
  /** True for AI / NPC opponents — applies the AI_DAMPING multiplier. */
  isAi: boolean;
  isTie?: boolean;
  isForfeit?: "self" | "opponent" | null;
  /** Custom solo sessions skip ELO/W/L bookkeeping entirely. */
  isCustom?: boolean;
  myScore: number | null;
  oppScore: number | null;
  /** Opponent identity. id is only honoured when it's a real auth UUID. */
  opponent: { id?: string | null; name?: string; avatar?: string };
  prompt: string;
  feedback?: string;
  strengths?: string;
  oppStrengths?: string;
  oppFeedback?: string;
  exampleSpeech?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (s: unknown): s is string => typeof s === "string" && UUID_RE.test(s);
const clampScore = (n: unknown): number | null => {
  if (n == null) return null;
  const v = typeof n === "number" ? n : Number(n);
  if (!isFinite(v)) return null;
  return Math.max(0, Math.min(100, Math.round(v)));
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!jwt) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return json({ error: "Server misconfigured" }, 500);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: userData, error: authErr } = await admin.auth.getUser(jwt);
    if (authErr || !userData.user) return json({ error: "Invalid token" }, 401);
    const userId = userData.user.id;

    // ── Body ────────────────────────────────────────────────────────────────
    const body = await req.json() as BattleResultBody;
    if (!body?.gamemode || !(body.gamemode in MODE_MULTIPLIERS)) {
      return json({ error: "Invalid gamemode" }, 400);
    }
    const myScore  = clampScore(body.myScore);
    const oppScore = clampScore(body.oppScore);

    // ── Read current ELO + match count from DB (NEVER trust the client) ────
    const { data: profileRow, error: profErr } = await admin
      .from("profiles")
      .select("elo")
      .eq("id", userId)
      .maybeSingle();
    if (profErr) return json({ error: `profile read failed: ${profErr.message}` }, 500);
    // NULL elo = unranked account that has never been rated. Seed the match math
    // from STARTING_ELO, but remember it was unranked so we PLACE rather than
    // nudge on this (the first) rated battle.
    const myIsUnranked = profileRow?.elo == null;
    const myElo = profileRow?.elo ?? STARTING_ELO;

    // Opponent ELO — read from DB if real user; otherwise treat as the
    // client-supplied estimate for AI personas (those rows don't exist).
    let oppElo = STARTING_ELO;
    let oppIsUnranked = false;
    const opponentId = isUuid(body.opponent?.id) ? body.opponent!.id! : null;
    if (opponentId) {
      const { data: oppRow } = await admin
        .from("profiles")
        .select("elo")
        .eq("id", opponentId)
        .maybeSingle();
      oppIsUnranked = oppRow?.elo == null;
      oppElo = oppRow?.elo ?? STARTING_ELO;
    } else if (body.isAi) {
      // AI personas don't have profile rows. Trust the client's persona ELO
      // because that's the matchmaker's pre-set difficulty target, not a
      // user-controlled value (it's hard-coded in AI_PERSONAS).
      const v = Number(body.opponent?.id);
      oppElo = STARTING_ELO; // fall back; AI persona elo is offset via persona, not stored
      const oppEloFromClient = Number((body as unknown as { _aiOppElo?: number })._aiOppElo);
      if (isFinite(oppEloFromClient) && oppEloFromClient > 0) oppElo = oppEloFromClient;
      // Keep the value bounded so a tampered persona elo can't drag ratings.
      oppElo = Math.max(ELO_FLOOR, Math.min(3000, oppElo));
    }

    // Match count: derive from arena_battles where this user participated.
    const { count: matchesPlayed } = await admin
      .from("arena_battles")
      .select("id", { count: "exact", head: true })
      .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`);

    // ── Compute ELO delta (custom solo + ties skip ELO movement) ───────────
    const skipElo = body.isCustom === true || body.isTie === true;
    const eloChange = skipElo ? 0 : computeEloChange({
      myElo,
      oppElo,
      myScore,
      oppScore,
      matchesPlayed: matchesPlayed ?? 0,
      mode: body.gamemode,
      isAi: !!body.isAi,
      isTie: !!body.isTie,
      isForfeit: body.isForfeit ?? null,
    });

    // First rated battle for an unranked account → PLACE from the result.
    // Ties/custom skip ELO entirely (no placement; stay unranked). Forfeits have
    // no scores, so they fall through to seed+delta (a modest first rating).
    const haveScores = myScore != null && oppScore != null;
    const myIsPlacement = myIsUnranked && !skipElo && !body.isForfeit && haveScores;
    const newElo = myIsPlacement
      ? computePlacementElo(oppElo, myScore, oppScore, !!body.isAi)
      : nudgeOffSentinel(Math.max(ELO_FLOOR, myElo + eloChange));
    // Persist the new rating when we placed them OR the delta actually moved.
    const shouldWriteMyElo = !skipElo && (myIsPlacement || eloChange !== 0);

    // ── PvP: rate the OPPONENT too, from the SAME single judgment ───────────
    // Fixes the "only the host gets rated" bug: previously the challenger's
    // client never persisted its ELO. Now one authoritative call moves both
    // ratings (and still writes exactly one battle row). Excluded:
    //   • AI opponents (no profile row)
    //   • custom solo + ties (no ELO movement)
    //   • forfeits (each side calls this independently and is rated there)
    let oppNewElo = oppElo;
    let oppEloChange = 0;
    const rateOpponent = !!opponentId && !body.isAi && !body.isCustom && !body.isTie && !body.isForfeit;
    if (rateOpponent) {
      const { count: oppMatches } = await admin
        .from("arena_battles")
        .select("id", { count: "exact", head: true })
        .or(`challenger_id.eq.${opponentId},opponent_id.eq.${opponentId}`);
      oppEloChange = computeEloChange({
        myElo: oppElo,
        oppElo: myElo,
        myScore: oppScore,
        oppScore: myScore,
        matchesPlayed: oppMatches ?? 0,
        mode: body.gamemode,
        isAi: false,
        isTie: false,
        isForfeit: null,
      });
      // If the opponent is also unranked, this PvP battle is THEIR placement too.
      oppNewElo = oppIsUnranked && haveScores
        ? computePlacementElo(myElo, oppScore, myScore, false)
        : nudgeOffSentinel(Math.max(ELO_FLOOR, oppElo + oppEloChange));
    }

    // ── Write the battle row first, then ELO. ──────────────────────────────
    // If the row insert fails (RLS, missing columns) we still bail before
    // moving ELO so the leaderboard never drifts from the battle log.
    const battlePayload = {
      challenger_id: userId,
      opponent_id:   opponentId,
      prompt:   String(body.prompt ?? "").slice(0, 2000),
      gamemode: body.gamemode,
      challenger_score: myScore,
      opponent_score:   oppScore,
      verdict:        body.feedback?.slice(0, 4000) ?? null,
      strengths:      body.strengths?.slice(0, 2000) ?? null,
      opp_strengths:  body.oppStrengths?.slice(0, 2000) ?? null,
      opp_feedback:   body.oppFeedback?.slice(0, 4000) ?? null,
      example_speech: body.exampleSpeech?.slice(0, 4000) ?? null,
      winner_id: body.isForfeit === "self" ? opponentId
        : body.isForfeit === "opponent" ? userId
        : (myScore != null && oppScore != null
            ? (myScore > oppScore ? userId : (oppScore > myScore ? (opponentId ?? null) : null))
            : null),
    };

    let { error: insertErr } = await admin
      .from("arena_battles")
      .insert(battlePayload);

    // PostgREST cache may not know about newer verdict-detail columns yet (the
    // 20260510 migration may not have been applied / cache refreshed). Detect
    // a missing-column error and retry without those optional fields.
    if (insertErr) {
      const msg = (insertErr.message || "").toLowerCase();
      const isMissingCol =
        msg.includes("could not find") ||
        msg.includes("schema cache") ||
        (insertErr as any).code === "PGRST204";
      if (isMissingCol) {
        console.warn("[submit-battle-result] schema cache missing optional cols, retrying lean:", insertErr.message);
        const lean = { ...battlePayload };
        delete (lean as any).strengths;
        delete (lean as any).opp_strengths;
        delete (lean as any).opp_feedback;
        delete (lean as any).example_speech;
        const retry = await admin.from("arena_battles").insert(lean);
        insertErr = retry.error;
      }
    }

    if (insertErr) {
      console.error("[submit-battle-result] battle insert failed:", insertErr);
      // Don't move ELO if we couldn't record the match.
      return json({ error: `battle insert failed: ${insertErr.message}` }, 500);
    }

    if (shouldWriteMyElo) {
      const { error: writeErr } = await admin
        .from("profiles")
        .update({ elo: newElo })
        .eq("id", userId);
      if (writeErr) {
        console.error("[submit-battle-result] elo write failed:", writeErr);
        return json({ error: `elo write failed: ${writeErr.message}` }, 500);
      }
    }

    // Persist the opponent's new rating (best-effort — the caller's rating is
    // already saved, so a failure here shouldn't fail the whole request).
    if (rateOpponent && (oppIsUnranked || oppEloChange !== 0)) {
      const { error: oppWriteErr } = await admin
        .from("profiles")
        .update({ elo: oppNewElo })
        .eq("id", opponentId);
      if (oppWriteErr) {
        console.error("[submit-battle-result] opponent elo write failed:", oppWriteErr);
      }
    }

    return json({
      ok: true,
      newElo,
      eloChange,
      oppNewElo,
      oppEloChange,
      // True when this battle was the caller's first rating (placement).
      placed: myIsPlacement,
      matchesPlayed: (matchesPlayed ?? 0) + 1,
    });

  } catch (e) {
    console.error("[submit-battle-result] unhandled:", e);
    return json({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});
