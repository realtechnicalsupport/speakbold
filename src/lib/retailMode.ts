import { useState, useEffect, useCallback } from "react";

/**
 * Retail / kiosk mode — the "store-display" state a device runs at a booth,
 * exactly like the demo mode on a phone on a shop shelf.
 *
 *  • Activation is URL-driven so a kiosk is set up by visiting once:
 *        /?retail=1  → enter retail mode (persists across reloads)
 *        /?retail=0  → exit retail mode
 *    The flag lives in localStorage, so the device stays in retail mode through
 *    reloads, navigations, and power-cycles until explicitly turned off.
 *
 *  • While on, <RetailShell> runs an attract loop: after RETAIL_IDLE_MS with no
 *    interaction it wipes the previous visitor's session and shows a branded
 *    "tap to begin" screen, so the next person always starts clean + impressive.
 *
 *  • Lockdown: surfaces that would let a stranger break the demo (sign-out, etc.)
 *    check isRetailMode()/useRetailMode() and hide themselves.
 */

const STORAGE_KEY = "speakbold_retail";

/** Idle time before the attract loop takes over and the session resets. */
export const RETAIL_IDLE_MS = 60_000;

/** Where "tap to begin" drops a fresh visitor. The pre-seeded demo account's
 *  practice hub — filled radar, quick-launch tracks, sample history. */
export const RETAIL_HOME = "/lab";

// ── Persisted on/off flag ───────────────────────────────────────────────────
function readInitial(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(window.location.search).get("retail");
    if (q === "1" || q === "true") {
      localStorage.setItem(STORAGE_KEY, "1");
      return true;
    }
    if (q === "0" || q === "false") {
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

let retailOn = readInitial();
const listeners = new Set<(on: boolean) => void>();

export function isRetailMode(): boolean {
  return retailOn;
}

export function setRetailMode(on: boolean): void {
  retailOn = on;
  try {
    if (on) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable — in-memory flag still drives this session */
  }
  listeners.forEach(fn => fn(on));
}

export function useRetailMode(): boolean {
  const [on, setOn] = useState(retailOn);
  const handler = useCallback((v: boolean) => setOn(v), []);
  useEffect(() => {
    listeners.add(handler);
    handler(retailOn);
    return () => { listeners.delete(handler); };
  }, [handler]);
  return on;
}
