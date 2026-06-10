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
  return { ok: true, value: cleaned };
};
