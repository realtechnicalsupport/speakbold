// Guided-tour script. Each step optionally navigates to a route, spotlights a
// real element (by CSS selector), and explains it. "do" steps wait for the user
// to actually act (a click on the target, or an app event) — but every step
// also offers Next/Skip so the tour can never trap the user.

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
    title: "Welcome to SpeakBold 👋",
    body: "A 45-second tour of how everything fits together. You can skip anytime.",
  },
  {
    id: "coach-radar",
    route: "/lab",
    target: "#tour-coach-radar",
    title: "Your AI Coach",
    body: "This radar maps your speaking across 6 skills. It fills in and sharpens as you practice.",
  },
  {
    id: "today-session",
    route: "/lab",
    target: "#tour-today-session",
    title: "Today's session",
    body: "Your coach builds a daily plan that targets your weakest skills. Tap any drill to start — it scores you and updates the radar.",
  },
  {
    id: "lab-tracks",
    route: "/lab",
    target: "#lab-grid",
    title: "Free practice",
    body: "Or pick a specific skill to drill on your own terms — impromptu, interviews, body language, and more.",
  },
  {
    id: "pathway",
    route: "/pathway",
    target: "#pathway-hero",
    title: "The Pathway",
    body: "Prefer a guided course? Take a quick placement test and we'll start you at the right tier, then climb structured lessons from Beginner to Orator.",
  },
  {
    id: "arena",
    route: "/arena",
    target: "#arena-gamemodes",
    title: "The Arena",
    body: "Battle an AI opponent or a friend to practice under pressure and climb the ranks.",
  },
  {
    id: "profile",
    route: "/profile",
    target: "#profile-stats",
    title: "Your Profile",
    body: "Track your streak, level, recordings, and achievements — and see how you stack up against friends.",
  },
  {
    id: "coach-chat",
    target: "#coach-chat-trigger",
    title: "Your coach, anytime",
    body: "Stuck? Tap here to ask your AI coach for advice — or just say “give me a drill.”",
    doHint: "Give it a tap to open it →",
    advanceClickSelector: "#coach-chat-trigger",
  },
  {
    id: "finish",
    route: "/lab",
    title: "You're all set 🎯",
    body: "Record your first drill to activate your coach — it only takes 60 seconds.",
  },
];
