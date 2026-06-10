// Guided-tour script. Each step optionally navigates to a route, spotlights a
// real element (by CSS selector), and explains it. Every step also offers
// Next/Skip so the tour can never trap the user.
//
// Kept SHORT and with ONE route transition (3 steps on /lab → 3 on /arena) so it
// never feels like the old 9-step version that hopped /lab → /pathway → /arena →
// /profile and back. The /lab steps answer a first-timer's core questions (what
// is this, how do I practise, where's help); the /arena steps showcase the
// Practice Lounge — added so the "Show me around" button there walks the user
// through the competitive features, not just the coach. We deliberately end ON
// /arena (no hop back) to keep it a single, forward-moving journey.

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

export const TOUR: TourStep[] = [
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
    body: "Your coach is one tap away — ask for tips, get feedback, or just say “give me a drill.” Now let's see where you put it all to the test.",
  },
  {
    id: "arena-modes",
    route: "/arena",
    target: "#arena-gamemodes",
    title: "Pick your format",
    body: "This is the Practice Lounge. Four ways to spar — a 30-second Blitz, a Standard round, a Speed Pitch, or a full Debate. Each one trains a different gear.",
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
