// ── Impromptu training plan ───────────────────────────────────────────────────
// A fixed 4-week program counting down to a real impromptu-speaking competition
// (3-min prep / 3-min speak). Each week targets one of the speaker's named
// weaknesses, and recommends a concrete drill setup the Setup screen can apply
// in one tap. Pure functions only — no React, no storage — so it's trivially
// testable and the UI just renders whatever `getTodayPlan()` returns.

import type { Difficulty } from "@/data/impromptuTopics";
import { COMPETITION_PREP_SECONDS, COMPETITION_SPEAK_SECONDS } from "@/data/impromptuTopics";

/** The competition date this plan counts down to. */
export const COMPETITION_DATE = new Date("2026-07-11T00:00:00");

export interface RecommendedDrill {
  difficulty: Difficulty;
  duration: number;
  prepTime: number;          // 0 = auto
  challengeMode: boolean;
  curveballEnabled: boolean;
  framework: string;         // informational — suggested structure for the week
}

export interface WeekPlan {
  /** 1-based week number within the program. */
  week: number;
  phase: string;             // short name, e.g. "Open & Structure"
  weakness: string;          // which weakness this week attacks
  focus: string;             // one-line instruction for the week
  tip: string;               // a concrete coaching cue
  recommended: RecommendedDrill;
}

export interface TodayPlan {
  daysUntil: number;         // whole days until the competition (can be negative)
  /** 1..4 during the program, 0 before it starts, 5 once the date has passed. */
  weekIndex: number;
  totalWeeks: number;
  current: WeekPlan | null;  // null once the competition has passed
  isCompetitionDay: boolean;
  isPast: boolean;
}

const TOTAL_WEEKS = 4;

// The program, hardest-skill-first-then-integrate. Week 1 builds the open and a
// reliable structure; week 2 strips the scaffolding to force fluency; week 3
// stretches to the full 3+3 and trains filling the clock; week 4 is full
// dress-rehearsal under competition conditions.
const WEEKS: WeekPlan[] = [
  {
    week: 1,
    phase: "Open & Structure",
    weakness: "Starting confidently + structuring on the fly",
    focus: "Lock a confident first line every rep, then hang three clear points off it.",
    tip: "Use Three Pillars: one claim, three supports, one close. Decide your opening sentence before the timer starts.",
    recommended: { difficulty: "Medium", duration: 120, prepTime: 60, challengeMode: false, curveballEnabled: false, framework: "Three Pillars" },
  },
  {
    week: 2,
    phase: "Cut the Fillers",
    weakness: "Fluency / avoiding fillers",
    focus: "Hints off. Speak smoothly and drive your um / uh / like count down rep over rep.",
    tip: "A half-second silence beats a filler. When you'd say 'um', just pause — the room reads it as composure.",
    recommended: { difficulty: "Medium", duration: 120, prepTime: 60, challengeMode: true, curveballEnabled: false, framework: "PREP" },
  },
  {
    week: 3,
    phase: "Fill the Clock",
    weakness: "Filling the full 3 minutes",
    focus: "Full 3 + 3. Reach the CLOSE zone with time to spare — no early finishes, no fading out.",
    tip: "Each pillar is ~40 seconds: state it, give one example, say why it matters. Three of those is your body.",
    recommended: { difficulty: "Hard", duration: COMPETITION_SPEAK_SECONDS, prepTime: COMPETITION_PREP_SECONDS, challengeMode: false, curveballEnabled: false, framework: "Three Pillars" },
  },
  {
    week: 4,
    phase: "Dress Rehearsal",
    weakness: "All four — under pressure",
    focus: "Full competition simulation: curveballs on, hints off, harder topics. Taper to one clean rep on the final two days.",
    tip: "Treat every rep like the real thing — stand up, no restarts. The goal now is composure, not new tricks.",
    recommended: { difficulty: "News", duration: COMPETITION_SPEAK_SECONDS, prepTime: COMPETITION_PREP_SECONDS, challengeMode: true, curveballEnabled: true, framework: "Three Pillars" },
  },
];

/** Whole days from `now` until the competition (negative once it's passed). */
export function daysUntilCompetition(now: Date = new Date()): number {
  const a = new Date(now); a.setHours(0, 0, 0, 0);
  const b = new Date(COMPETITION_DATE); b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function getTodayPlan(now: Date = new Date()): TodayPlan {
  const daysUntil = daysUntilCompetition(now);

  if (daysUntil < 0) {
    return { daysUntil, weekIndex: 5, totalWeeks: TOTAL_WEEKS, current: null, isCompetitionDay: false, isPast: true };
  }
  if (daysUntil === 0) {
    return { daysUntil, weekIndex: 4, totalWeeks: TOTAL_WEEKS, current: WEEKS[3], isCompetitionDay: true, isPast: false };
  }

  // Map the remaining days onto the 4 weeks. More than 21 days out, we're still
  // in week 1 (or earlier — clamp to week 1 so the plan is usable immediately).
  let week: number;
  if (daysUntil > 21) week = 1;
  else if (daysUntil > 14) week = 2;
  else if (daysUntil > 7) week = 3;
  else week = 4;

  return {
    daysUntil,
    weekIndex: week,
    totalWeeks: TOTAL_WEEKS,
    current: WEEKS[week - 1],
    isCompetitionDay: false,
    isPast: false,
  };
}
