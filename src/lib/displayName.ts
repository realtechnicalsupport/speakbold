// ─── Display-name guardrails ─────────────────────────────────────────────────
// Centralised validation/sanitisation for user-chosen display names. Used at
// every WRITE point (signup, edit profile) so junk can't reach the DB in the
// first place. React already escapes names on render, so this is defence in
// depth — but it also keeps the leaderboard/friends lists clean and readable.
//
// What we block:
//  • HTML/script payloads — any `<` or `>` (stored-XSS style names like
//    `<img src=x onerror=…>` or `<span style=…>HELLO</span>` that polluted the
//    early test data).
//  • Other markup/templating sigils that have no place in a human name.
//  • Names that are too short, too long, or only punctuation/whitespace.

export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 32;

// ─── Offensive-name guard ────────────────────────────────────────────────────
// A competition is a public surface: a troll's display name shows up on the
// leaderboard, arena lobby, and friends lists in front of judges. We block
// slurs + strong profanity, but carefully, to avoid the "Scunthorpe problem"
// (nuking legit names like "Cassandra" / "Michelle" that merely *contain* a
// rude substring). Two passes:
//   • SLURS  — matched against a de-leeted, letters-only "collapsed" form, so
//     spacing/punctuation/leet evasion ("n.i_g", "f4gg0t") is still caught.
//     Only collision-safe hate terms go here (they don't occur inside names).
//   • PROFANITY — matched as WHOLE TOKENS of the de-leeted name, so common
//     swears that legitimately appear inside real names ("ass" in "Cassandra",
//     "hell" in "Michelle") only trip when they stand alone.
// This is intentionally tuned to favour letting real names through; the durable,
// bypass-proof enforcement also lives in the DB (see migrations:
// sanitize_display_name → is_offensive_name).
const LEET: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b",
  "9": "g", "@": "a", "$": "s", "!": "i", "|": "i",
};
const deLeet = (s: string): string =>
  s.toLowerCase().replace(/[01345789@$!|]/g, (c) => LEET[c] ?? c);

// Collapsed: de-leeted, letters only — defeats spacing/punctuation evasion.
const collapsed = (s: string): string => deLeet(s).replace(/[^a-z]/g, "");
// Tokens: de-leeted words, for whole-word profanity matching.
const tokenize = (s: string): string[] => deLeet(s).split(/[^a-z]+/).filter(Boolean);

// Collision-safe hate terms — matched as a substring of the collapsed form.
// (Only terms that don't occur inside legitimate names live here.)
const SLURS = [
  "nigger", "nigga", "faggot", "retard", "chink", "wetback", "tranny",
  "raghead", "beaner",
];
// Strong profanity + collision-PRONE slurs — matched only as standalone tokens,
// so legit names survive: "Fagan" (fag), "Spicer" (spic), "raccoon" (coon),
// "Van Dyke" (dyke), "Pakistani" (paki), "Cassandra" (ass), "Michelle" (hell).
const PROFANITY = [
  "fuck", "fucker", "fucking", "shit", "bitch", "cunt", "ass", "asshole",
  "dick", "pussy", "bastard", "whore", "slut", "cock", "wank", "nazi", "rape",
  "rapist", "pedo", "pedophile", "fag", "coon", "spic", "kike", "gook",
  "paki", "dyke",
];

/** True when a name contains slurs or standalone strong profanity. */
export const isOffensiveName = (raw: string): boolean => {
  const c = collapsed(raw);
  if (SLURS.some((w) => c.includes(w))) return true;
  const t = tokenize(raw);
  return PROFANITY.some((w) => t.includes(w));
};

// Characters a real display name legitimately needs: letters (incl. accented &
// non-Latin via \p{L}), marks, numbers, spaces, and a small set of name
// punctuation (apostrophe, hyphen, period, underscore). Everything else —
// angle brackets, quotes, braces, backticks, equals, etc. — is stripped.
const ALLOWED = /[^\p{L}\p{M}\p{N} '._-]/gu;

/**
 * Clean a raw name into something safe to store/display.
 * Strips disallowed characters, collapses whitespace, and trims.
 * Does NOT enforce length — pair with validateDisplayName for that.
 */
export const sanitizeDisplayName = (raw: string): string =>
  raw
    .replace(/[<>]/g, "")        // hard-kill angle brackets first (XSS sigils)
    .replace(ALLOWED, "")         // then drop anything outside the allow-list
    .replace(/\s+/g, " ")         // collapse runs of whitespace
    .trim()
    .slice(0, DISPLAY_NAME_MAX);

/**
 * Validate a raw name. Returns the cleaned value when acceptable, or an error
 * string explaining why not (suitable for showing in a toast / inline hint).
 */
export const validateDisplayName = (
  raw: string,
): { ok: true; value: string } | { ok: false; error: string } => {
  const cleaned = sanitizeDisplayName(raw);

  // Must retain at least one letter or number after sanitising — a name made
  // entirely of stripped characters (e.g. "<<<>>>") collapses to "".
  if (!/[\p{L}\p{N}]/u.test(cleaned)) {
    return { ok: false, error: "Please use a real name with letters or numbers." };
  }
  if (cleaned.length < DISPLAY_NAME_MIN) {
    return { ok: false, error: `Name must be at least ${DISPLAY_NAME_MIN} characters.` };
  }
  if (isOffensiveName(cleaned)) {
    return { ok: false, error: "Please choose a different name." };
  }
  return { ok: true, value: cleaned };
};
