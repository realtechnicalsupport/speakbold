/**
 * Z — single source of truth for z-index layers.
 *
 * Use in className with Tailwind's arbitrary-value syntax:
 *   import { Z } from "@/lib/z";
 *   className={`z-[${Z.modal}]`}
 *
 * Or import the string helpers for direct use:
 *   className={Z.cls.modal}   →  "z-[200]"
 */

export const Z = {
  /** Background decorative layer (blobs, grid, canvas nodes) */
  bg: 0,
  /** Main page content */
  page: 10,
  /** Inline dropdowns / nav menus */
  nav: 20,
  /** Arena duel full-screen overlays (main) */
  arena: 60,
  /** Arena transient screens (match found, results) */
  arenaHigh: 80,
  /** Floating panels: chat, status bar, site-header dropdown, toasts */
  panel: 100,
  /** Arena challenge modal / critical confirmation dialogs */
  critical: 150,
  /** Onboarding modal */
  onboarding: 200,
  /** Tutorial overlay — must sit above onboarding */
  tutorial: 250,
  /** Global status bar (network, auth errors) — always on top */
  statusBar: 9998,
} as const;

export type ZLayer = (typeof Z)[keyof typeof Z];

/** Pre-built Tailwind class strings, e.g. Z.cls.modal → "z-[200]" */
export const Zcls = Object.fromEntries(
  Object.entries(Z).map(([k, v]) => [k, `z-[${v}]`])
) as { [K in keyof typeof Z]: `z-[${(typeof Z)[K]}]` };
