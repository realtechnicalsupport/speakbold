// Guided-tour scripts. Each step optionally navigates to a route, spotlights a
// real element (by CSS selector), and explains it. Every step also offers
// Next/Skip so the tour can never trap the user.
//
// There are now TWO independent tours, each launched by its own "Show me around"
// button and run on its own page — no cross-page hopping:
//   • "lab"   — the Lab/coach hub: what this is, how to practise, where's help.
//   • "arena" — the Practice Lounge: formats, finding an opponent, live battles.
// Keeping them separate means each button teaches only the page you're on, and
// neither tour drags the user off to a different part of the app.

export interface TourStep {
  id: string;
  /** Navigate here before showing the step (tour drives the route). */
  route?: string;
  /** CSS selector to spotlight. Omit → centered card, no spotlight. */
  target?: string;
  title: string;
  body: string;
  /** When set, this is a "do" step: advancing is encouraged via this hint. */
  doHint?: string;
  /** Advance when this window event fires. */
  advanceEvent?: string;
  /** Advance when an element matching this selector is clicked. */
  advanceClickSelector?: string;
}

const LAB_TOUR: TourStep[] = [
  {
    id: "welcome",
    route: "/lab",
    target: "#tour-coach-radar",
    title: "Meet your coach 👋",
    body: "This maps your speaking across 6 skills. Record a drill and it lights up — your coach learns exactly what to work on with you.",
  },
  {
    id: "daily-drill",
    route: "/lab",
    target: "#tour-today-session",
    title: "Your drill for today",
    body: "Tap here for a quick rep aimed at your weakest skill. Want a full course instead? The Pathway takes you from Beginner to Orator.",
  },
  {
    id: "coach-chat",
    route: "/lab",
    target: "#coach-chat-trigger",
    title: "Stuck? Just ask",
    body: "Your coach is one tap away — ask for tips, get feedback, or just say “give me a drill.” That's it — you're ready to go.",
  },
];

const ARENA_TOUR: TourStep[] = [
  {
    id: "arena-modes",
    route: "/arena",
    target: "#arena-gamemodes",
    title: "Pick your format",
    body: "Welcome to the Practice Lounge. Four ways to spar — a 30-second Blitz, a Standard round, a Speed Pitch, or a full Debate. Each one trains a different gear.",
  },
  {
    id: "arena-find",
    route: "/arena",
    target: "#tutorial-find-partner",
    title: "Find an opponent",
    body: "Tap to get matched — practise against an AI persona any time, or go live against a real person. An AI judge scores both of you and moves your ELO.",
  },
  {
    id: "arena-people",
    route: "/arena",
    target: "#arena-online-users",
    title: "Challenge real people",
    body: "Anyone online shows up here — hit Invite to start a live, head-to-head battle and climb the leaderboard. That's the tour. Go get 'em.",
  },
];

/** Every tour, keyed by the id passed in the `speakbold:start-tour` event. */
export const TOURS = {
  lab: LAB_TOUR,
  arena: ARENA_TOUR,
} as const;

export type TourId = keyof typeof TOURS;

/** Fallback when a tour is started without specifying which one. */
export const DEFAULT_TOUR_ID: TourId = "lab";
