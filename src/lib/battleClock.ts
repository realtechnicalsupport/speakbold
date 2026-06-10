import { useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Shared battle/debate timer.
//
// Both DuelDrill (single-phase arena battles) and DebateBattle (multi-phase
// turn-based debate) need the SAME timer-sync behaviour:
//   • anchored to the wall clock so it never drifts;
//   • survives a backgrounded tab (browsers throttle, then freeze, intervals) —
//     on return we recompute from Date.now() instead of resuming a stale count;
//   • fires its expiry exactly once.
// This module is that single source of truth. `computeRemaining` is the pure
// primitive (used inline by DebateBattle's per-phase machine), and
// `useWallClockCountdown` is the full hook (used by DuelDrill).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Whole seconds remaining for a countdown that began at `startAt` (epoch ms)
 * and runs for `durationSec`. Ceils so the final whole second is still shown,
 * and clamps at 0. Reading the wall clock here is what lets a tab-out / screen
 * lock "keep running": the elapsed time is real time, not interval ticks.
 */
export function computeRemaining(startAt: number, durationSec: number): number {
  const elapsed = (Date.now() - startAt) / 1000;
  return Math.max(0, Math.ceil(durationSec - elapsed));
}

export interface WallClockCountdownArgs {
  /** Epoch ms when the countdown began. `null` → not started yet (the hook
   *  reports the full `durationSec` so "seconds === duration" start guards hold). */
  startAt: number | null;
  /** Total countdown length, in seconds. */
  durationSec: number;
  /** Tick only while true. When it flips false the last value is held. */
  active: boolean;
  /** Fired exactly once per run when remaining hits 0 (re-armed when a new run
   *  begins, i.e. when `startAt` changes to a new anchor). */
  onExpire?: () => void;
  /** Recompute cadence in ms. 100ms keeps the displayed second crisp without
   *  meaningfully affecting the wall-clock result. */
  tickMs?: number;
}

/**
 * Wall-clock countdown hook. Returns the live `secondsLeft`.
 *
 * The interval and the `visibilitychange` listener both call the same `sync()`,
 * so a tab returning to the foreground catches up instantly rather than waiting
 * for the throttled interval's next tick. `onExpire` is read through a ref so a
 * long-lived interval never invokes a stale closure.
 */
export function useWallClockCountdown({
  startAt,
  durationSec,
  active,
  onExpire,
  tickMs = 100,
}: WallClockCountdownArgs): number {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    startAt != null ? computeRemaining(startAt, durationSec) : durationSec,
  );

  const onExpireRef = useRef(onExpire);
  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

  // Single-fire guard, re-armed whenever a new run begins.
  const firedRef = useRef(false);
  useEffect(() => { firedRef.current = false; }, [startAt]);

  useEffect(() => {
    // Not started → reflect the full duration and don't tick.
    if (!active || startAt == null) {
      if (startAt == null) setSecondsLeft(durationSec);
      return;
    }

    const sync = () => {
      const remaining = computeRemaining(startAt, durationSec);
      setSecondsLeft(remaining);
      if (remaining <= 0 && !firedRef.current) {
        firedRef.current = true;
        onExpireRef.current?.();
      }
    };

    sync(); // immediate — a fresh/resumed mount shows the correct value at once
    const id = window.setInterval(sync, tickMs);
    const onVisible = () => { if (!document.hidden) sync(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [startAt, durationSec, active, tickMs]);

  return secondsLeft;
}
