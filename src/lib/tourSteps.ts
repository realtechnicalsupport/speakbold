// Guided-tour script. Each step optionally navigates to a route, spotlights a
// real element (by CSS selector), and explains it. Every step also offers
// Next/Skip so the tour can never trap the user.
//
// Kept deliberately SHORT (3 steps, all on /lab) — a brand-new user clicks away
// from a long walkthrough. The old 9-step version route-hopped across /lab →
// /pathway → /arena → /profile, which felt like a chore. These three answer the
// only questions a first-timer actually has: what is this, how do I practise,
// and where do I get help. Everything else is discoverable in the nav.

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
    body: "Your coach is one tap away — ask for tips, get feedback, or just say “give me a drill.” That's it — you're ready to go.",
  },
];
