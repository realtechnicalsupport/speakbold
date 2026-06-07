# SpeakBold — UI/UX Council Audit

> **Scope:** Core user journey — Index (landing), Pathway, Arena, Lab, and the 4 tracks (Public Speaking, Impromptu, Interviews, Body Language).
> **Method:** Every recurring UI/UX element is run through a 5-advisor council (Contrarian, First Principles, Expansionist, Outsider, Executor). Each element gets a **Keep / Tune / Revamp** verdict and, where the ui-ux-pro-max skill has a rule that does it better, a citation.
> **Deliverable:** Decision report only — no code was changed.
> **Stack note:** SpeakBold is a **web** app (Vite + React + Tailwind + shadcn/Radix + framer-motion). Mobile-only skill rules (haptics, safe-area, native controls, bottom-nav-≤5) were excluded as not applicable.

---

## How to read a verdict

| Badge | Meaning |
|-------|---------|
| ✅ **KEEP** | Already as good or better than the skill's recommendation. Brand-defining or a genuine strength. Don't touch. |
| 🔧 **TUNE** | Right idea, fix a specific accessibility/polish gap. Cheap, high-leverage. |
| ♻️ **REVAMP** | Skill clearly does it better, or it's an anti-pattern. Worth real work. |

**The advisors**
- **Contrarian** — what's the case *against* the current choice?
- **First Principles** — what is this element actually *for*?
- **Expansionist** — how could it be pushed further?
- **Outsider** — how does a cold, non-expert user read it?
- **Executor** — what's the cheapest change that captures most of the value?

---

## The headline tension (read this first)

The skill's generic design-system lookup for "public speaking / education / gamified" returns a **conservative "Accessible & Ethical" profile**: navy/blue palette, hand-drawn fonts, *"avoid motion effects,"* WCAG-AAA. SpeakBold is the opposite: a loud, opinionated **vibrant-orange (`#FF4D00`) clay-neumorphic brand** with motion on nearly every surface.

**Council verdict on the tension:** ✅ **Keep the brand, borrow the discipline.**
The skill's palette/font suggestion is a generic safe default and would *erase SpeakBold's single biggest asset — its identity*. Do **not** adopt navy + Patrick Hand. **But** the skill is right about the *rigor* that profile implies: contrast minimums, motion restraint, focus states, keyboard semantics. That's exactly where SpeakBold is currently weakest. So: the brand wins on taste, the skill wins on hygiene.

---

# A. Design-system foundations (cross-cutting)

### A1. Color & semantic tokens — ✅ KEEP
`src/index.css:8-53`
- **First Principles:** A theming system that maps roles (primary/muted/border/destructive) to HSL vars, with a fully designed dark mode. This is textbook.
- **Outsider:** Orange reads as energetic, confident — on-brand for "be bold."
- **Skill check:** Matches `color-semantic` ("define semantic tokens not raw hex") and `color-dark-mode` (dark uses desaturated charcoal, not inverted). The skill can't do this better.
- **One leak:** `bold-sans` hardcodes `color: #FF4D00` (`index.css:211`) instead of `hsl(var(--primary))`. Trivial token leak. → fold into A-tier cleanup.

### A2. Typography system — 🔧 TUNE
`src/index.css:67-84`, used everywhere as `speak-serif` (Outfit italic, tracking -0.04em)
- **Keep:** Outfit display + Plus Jakarta body is a strong, distinctive pairing. Far better than the skill's "Kalam/Patrick Hand" suggestion for this product.
- **Contrarian:** The *italic + tight-tracking + uppercase-microcopy* combo is applied so universally it stops being emphasis and becomes texture. Nearly every label is `font-black uppercase tracking-[0.3em]–[0.6em]` at `text-[9px]`–`text-[11px]`.
- **Outsider:** Wide-tracked 9px all-caps is genuinely hard to read at a glance — and it's the *labels*, the things meant to orient you.
- **Skill check:** Violates `readable-font-size` (16px body floor is fine for body, but these labels are sub-12px structural text), `letter-spacing` ("avoid tight tracking on body; respect defaults"), and `whitespace-balance`. Also borderline `color-contrast` because these labels are usually also `opacity-30/40`.
- **Verdict:** Keep the fonts. **Establish a microcopy floor:** min 11px, max `tracking-[0.25em]`, min opacity 50% for any text carrying meaning. This single rule cleans up dozens of surfaces.

### A3. Low-opacity text — ♻️ REVAMP (highest-impact accessibility fix)
Pervasive: `opacity-30`, `opacity-40` on labels, captions, even some values.
- **First Principles:** Opacity is being used as a *hierarchy* tool. But opacity on text against a busy/blob background destroys contrast unpredictably.
- **Outsider:** "Why is half the text greyed out like it's disabled?" Disabled-looking active text is a real comprehension cost.
- **Skill check:** Directly violates `color-contrast` (4.5:1), `contrast-readability`, and `color-not-decorative-only`. The skill is unambiguously better here.
- **Verdict:** Replace decorative `opacity-XX` on **text that conveys meaning** with proper `--muted-foreground` tokens that are contrast-tested in both themes. Reserve opacity for truly secondary/hover-reveal text. **This is the #1 fix in the whole audit.**

### A4. Clay / neumorphic shadows — ✅ KEEP (with a guard)
`.glass`, `.glass-card`, `.button-pill`, `--shadow-clay-nav` (`index.css:29, 126-197`)
- **Contrarian:** Neumorphism is notorious for low-contrast, ambiguous affordances — the skill style DB even flags it.
- **First Principles:** Here it's used as *surface elevation*, not as the only affordance — buttons also have color/scale/labels. That rescues it.
- **Skill check:** `elevation-consistent` ("consistent elevation scale, avoid random shadow values"). SpeakBold actually has a *defined* set (clay-nav, tactile, soft, glow) — good. The risk is borders: clay cards use `border: 1px solid transparent`, leaning entirely on shadow to separate from background.
- **Verdict:** Keep — it's brand. Guard: ensure every clay surface has a *visible* fallback separation (the `border-subtle`/`border-main` utilities exist — use them on cards that currently go transparent), satisfying `border-and-divider-visibility` in both themes.

### A5. Border-radius scale — 🔧 TUNE
`--radius: 2rem`, plus ad-hoc `rounded-[1.5rem]`, `[2.5rem]`, `[3rem]`, `[3.5rem]`, `[4rem]`.
- **Executor:** The pillowy radius is part of the identity — keep the look.
- **Contrarian:** It's not *tokenized*. Radii are hand-picked per component, so cards drift between 1.5/2/2.5/3/4rem with no rhythm.
- **Skill check:** `elevation-consistent` / consistency. Skill prefers a scale (sm/md/lg).
- **Verdict:** Keep the soft look; define `--radius-card`, `--radius-pill`, `--radius-modal` tokens and replace the arbitrary `rounded-[Nrem]` values. Visual no-op, big consistency win.

### A6. Emoji used as icons — ♻️ REVAMP (clear skill win, systemic)
**52 occurrences across 18 files.** Examples: avatars `"👤"`/`"🤖"` (`Arena.tsx:259, 396, 484`), decorative `✱`/`⚡` in CTAs (`Hero.tsx:130-141`, `CTA.tsx:67-69`), win/loss `▲`/`▼` (`Arena.tsx:1014`), toast `🏆`/`✓` (`Pathway.tsx:751`), rank `↑`/`↓` (`Arena.tsx:633`).
- **Contrarian:** You already ship Lucide everywhere — the emoji are the *inconsistent* exception, not a style.
- **Outsider:** Emoji render differently per OS/browser; `👤` looks amateur next to the crisp Lucide set.
- **Skill check:** Violates `no-emoji-icons` and the explicit "No Emoji as Structural Icons" rule (font-dependent, un-themeable, can't take design tokens). The skill is decisively better.
- **Verdict:** Replace structural emoji with Lucide (`User`, `Bot`, `TrendingUp`/`TrendingDown`, `Trophy`, `Sparkles`). For player avatars, move to an `Avatar` component with initials fallback (you already have `components/ui/avatar.tsx`). Decorative `✱`/`⚡` in CTAs: drop them or swap for a single Lucide accent. **High polish-per-effort.**

### A7. Ambient motion (blobs, infinite pulses, glows) — 🔧 TUNE
`animate-blob`, `animate-pulse-subtle`, `animate-float`, multiple `animate-ping`, decorative rotating rings (`WhyItMatters.tsx:7-15`), text-glitch shadow layers (`Hero.tsx:77-90`).
- **Expansionist:** The ambient life is genuinely premium and differentiates from flat-bootstrap competitors.
- **Contrarian:** Many views animate **4–6 elements at once** (blob + pulse + ping + float + entrance stagger). That's past the threshold where motion stops meaning anything.
- **Skill check:** `excessive-motion` ("animate 1–2 key elements per view max") and `motion-meaning` ("every animation expresses cause→effect, not decoration"). Skill is right that it's overused.
- **Mitigation already present:** `prefers-reduced-motion` is fully respected and heavy animations are disabled <768px (`index.css:364-401`) — ✅ that part is exemplary (`reduced-motion`).
- **Verdict:** Keep the signature ambient blob. Per view, cap *simultaneous decorative* loops at ~2; demote the rest. The Hero text-glitch triple-layer (`Bold.` ×3) is the first candidate to cut — it's pure decoration.

### A8. Focus states & keyboard semantics — ♻️ REVAMP (accessibility)
Several primary interactions are `div`/`motion.div` with `onClick` and no role/tabindex/focus ring: practice-history rows (`Arena.tsx:983`), the collapsible ChapterCard header (`Pathway.tsx:211-222`), some card tiles.
- **First Principles:** If it does something on click, it's a button — it must be reachable and visible to keyboard/AT users.
- **Skill check:** Violates `focus-states`, `keyboard-nav`, `cursor-pointer`, and `voiceover-sr`. The native `<button>`/`<Link>` usages elsewhere are correct — these are the exceptions.
- **Verdict:** Convert clickable `div`s to `<button>` (or add `role="button"` + `tabIndex={0}` + key handlers) and ensure a visible focus ring (`--ring` is already orange). The dot-nav and most CTAs already get this right; this is about the stragglers.

---

# B. Landing page (`pages/Index.tsx`)

### B1. Scroll-snap section container + right-side dot nav — ✅ KEEP
`Index.tsx:72-129`
- **Outsider:** The pill-elongating active dot with hover labels is genuinely elegant and discoverable.
- **First Principles:** Snap is opt-in to `md+` only; mobile falls back to normal flow; reduced-motion disables snap. That's the *correct* defensive setup.
- **Skill check:** Honors `scroll-behavior`, `reduced-motion`, `aria-current`, per-dot `aria-label`. Skill can't improve it. Minor: dot-nav is `hidden md:flex` so there's no section affordance on mobile — acceptable (mobile just scrolls).
- **Verdict:** Keep. This is a highlight.

### B2. Hero (split-letter animation + dual CTA) — 🔧 TUNE
`Hero.tsx:50-165`
- **Expansionist:** Per-character rise on "Speak" + scale-in italic "Bold." is a strong first impression.
- **First Principles:** The CTA logic is *excellent UX*: logged-out users get **one** decisive primary ("Try a 30-second drill, no signup") with signup as the quiet secondary — aha-before-wall.
- **Skill check:** Nails `primary-action` (one primary CTA, secondary subordinate). The only issues are A6 (the `✱`/`⚡` glyphs flanking button text) and A7 (the triple-layer glitch `Bold.`).
- **Verdict:** Keep the structure and the CTA strategy; remove the glyphs and the glitch layers. The `sr-only` h1 (`Index.tsx:61`) is a nice a11y touch — keep.

### B3. Body-Language hero (live on-device camera) — ✅ KEEP (exemplary)
`BodyLanguageHero.tsx`
- **First Principles:** Privacy-forward, one-gesture activation, live metric chips, clear idle/loading/error/live states, "nothing uploaded" reassurance.
- **Skill check:** Exemplary on `progressive-loading` (distinct loading state), `error-recovery` ("Tap to retry"), `empty-states`, `state-clarity`, `number-tabular` (chips use `tabular-nums`). Metric chips even use `aria`-friendly icon+number.
- **Outsider:** "It runs in *my* browser and records nothing" — that's a trust win most apps fumble.
- **Verdict:** Keep. This is the strongest single component in the app and (per project memory) the crown jewel — the audit confirms it. Only nit: ensure the metric-chip colors meet 3:1 on the black overlay (they sit on `bg-black/60`, so fine).

### B4. ImpactBanner (animated stats / value-prop fallback) — ✅ KEEP
`ImpactBanner.tsx`
- **First Principles:** The `LEARNER_FLOOR` gate that shows value-props until the community is big enough — instead of advertising "7 users" — is sophisticated, honest growth UX.
- **Skill check:** `empty-states` done at a conceptual level; `number-tabular` on counts; count-up respects perception. Strong.
- **Contrarian:** Colored icon tiles (blue/purple/emerald/orange) introduce a 4-hue accent set that competes with the orange brand. Minor.
- **Verdict:** Keep. Optionally unify accent hues toward the brand for cohesion (`icon-style-consistent`), but not required.

### B5. WhyItMatters (mission / SDG-4 blockquote) — 🔧 TUNE
`WhyItMatters.tsx`
- **Keep:** Clear hierarchy, good iconography, real narrative.
- **Contrarian:** The 800px rotating ring (`:7-15`, 40s rotate) + breathing blur + per-item hover-translate stack up (A7). And the blockquote at `opacity` + italic + tracking gets hard to read (A2/A3).
- **Skill check:** `excessive-motion`, plus body-copy readability.
- **Verdict:** Keep content/layout; apply the A2/A3/A7 system fixes here.

### B6. Progress (leaderboard preview) — 🔧 TUNE
`Progress.tsx`
- **Keep:** Skeleton loaders (`:65-71`), empty state (`:72-76`), current-user highlight, `RankEmblem`, `tabular-nums` ELO. Genuinely good list UX.
- **Skill check:** `loading-chart`/`loading-states` ✅, `empty-data-state` ✅, `number-tabular` ✅.
- **Tune:** "No protocol data available" / "GLOBAL HIERARCHY" — the sci-fi register ("protocol", "hierarchy") is cool but slightly cold for an education product; and label opacity (A3).
- **Verdict:** Keep mechanics; soften jargon + fix label contrast.

### B7. CTA (giant "READY You?" + footer) — 🔧 TUNE
`CTA.tsx`
- **Keep:** Big confident close, single primary action, real footer with track links.
- **Skill check:** `primary-action` ✅. Issues: `✱` glyphs (A6) and `py-60` (240px) vertical padding is enormous — on a 13" laptop the section is mostly empty space.
- **Verdict:** Keep; drop glyphs; reconsider the `md:py-60` to something like `py-32/40` so the fold isn't dominated by whitespace (`whitespace-balance`).

---

# C. Pathway (`pages/Pathway.tsx`)

### C1. NextDrillHero (next-drill CTA card) — ✅ KEEP
`Pathway.tsx:346-499`
- **First Principles:** Adapts copy to start/continue/done; surfaces the user's onboarding focus areas as chips so the first drill feels chosen; inline progress/streak stats. This is excellent onboarding-to-habit UX.
- **Skill check:** `primary-action` (one big "JUMP IN"), `progressive-disclosure`, `empty-states` (done state). Skill can't beat it.
- **Verdict:** Keep.

### C2. DrillNode (Duolingo-style chunky nodes) — ✅ KEEP
`Pathway.tsx:74-176`
- **Outsider:** Instantly legible — locked/current/done states are obvious; "START HERE" pointer removes all "what now?" doubt; zigzag path reads as a journey.
- **First Principles:** State conveyed by **icon + color + position**, not color alone.
- **Skill check:** `color-not-only` ✅, `state-clarity` ✅, `scale-feedback` (active press `translate-y-[8px]`) ✅, `nav-state-active` ✅. The `border-b-[8px]` press is a great tactile read.
- **Verdict:** Keep. Strong gamification execution. (Confirm focus ring on the node `<button>` — it's a real button, just verify the ring shows.)

### C3. LessonDrill modal (idle → recording → analyzing → results) — 🔧 TUNE
`Pathway.tsx:501-1024`
- **First Principles:** A clean 4-phase state machine with mic-permission pre-check, timeout/empty-audio guards, playback, TTS coach voice, retry vs skip. Robust.
- **Skill check:** Excellent on `submit-feedback`, `error-clarity` (specific mic/empty/timeout messages, not "invalid"), `error-recovery` (retry), `progressive-loading` (analyzing state). Strong.
- **Tune:** (1) toast titles carry emoji `🏆`/`✓` (A6). (2) Results status pills use `✓` glyph in text. (3) It's a full-screen `fixed inset-0 z-[60]` overlay — verify focus is **moved into** the overlay on open and **restored** on close, and that Esc closes it (`escape-routes`, `focus-management`).
- **Verdict:** Keep the flow; do the focus-trap/Esc pass + de-emoji.

### C4. Results score circle + verdict cards — ✅ KEEP
`Pathway.tsx:897-972`
- Big score-in-ring, pass/fail pill, coach verdict, strengths chips, coach tip, expert ModelSpeech. Clear hierarchy, good use of chips.
- **Skill check:** `success-feedback`, `visual-hierarchy`. Keep. (Pass/fail also uses border-color + label text, not color alone — `color-not-only` ✅.)

### C5. ChapterCard collapsible header — ♻️ REVAMP (a11y)
`Pathway.tsx:211-222`
- The completed-chapter header is a `motion.div` with `onClick` toggling collapse — not keyboard-operable, no `aria-expanded`.
- **Skill check:** `keyboard-nav`, `focus-states`, and `state-transition` (it animates, good) but the trigger isn't a button.
- **Verdict:** Make the toggle a real `<button>` with `aria-expanded`. The collapse animation itself is fine.

### C6. Sparkline (per-drill score trend) — ✅ KEEP
`Pathway.tsx:44-65` — tiny inline SVG trend with delta color + last value. Lightweight, meaningful.
- **Skill check:** `direct-labeling` (shows last value), `trend-emphasis`. For decoration-scale data this is appropriate. Keep. (Color-only trend is acceptable here since the number is always shown — satisfies `color-not-only`.)

---

# D. Arena (`pages/Arena.tsx`)

### D1. Rank card (placement vs ranked) — ✅ KEEP
`Arena.tsx:739-829`
- **Expansionist:** Animated rank progress bar, next-rank points, placement vs ranked variants, ambient breathing glow keyed to rank color. Premium and informative.
- **Skill check:** `visual-hierarchy`, `number-tabular`, `progressive-disclosure`. Issue: avatar `"👤"`/`"?"` emoji (A6) and the rank color must keep 4.5:1 for the text it tints.
- **Verdict:** Keep; swap emoji avatar for `Avatar` component.

### D2. Gamemode selector (2×2 grid) — ✅ KEEP
`Arena.tsx:834-864`
- Selected state = filled orange + `layoutId` sweep; `whileTap` scale. Clear active state, good motion.
- **Skill check:** `state-clarity`, `nav-state-active`, `press-feedback`, `scale-feedback`. Keep.

### D3. "ELO at stake" indicator — ✅ KEEP
`Arena.tsx:867-886` — green/red +/− with animated numbers, plus a distinct placement-match callout. Honest, legible stakes.
- **Skill check:** `number-tabular`, `color-not-only` (has +/− signs and labels, not just red/green). Keep.

### D4. Find-partner / New-session buttons — ✅ KEEP
`Arena.tsx:888-914` — `btn-tactile-primary` + `btn-tactile-surface`, Lucide icons, clear labels.
- **Skill check:** `primary-action` (primary vs surface hierarchy), `touch-target-size` (py-6 is generous), `loading-buttons` — *verify* the find-partner button shows a busy state while matchmaking (the radar overlay covers it, so OK).
- **Verdict:** Keep — this is the tactile system at its best.

### D5. Online-users list + INVITE — 🔧 TUNE
`Arena.tsx:931-962`
- **Contrarian:** The INVITE button is `opacity-0 group-hover:opacity-100` — **hover-only reveal**. On touch there's no hover; the primary action is invisible until... it can't be.
- **Skill check:** Violates `hover-vs-tap` ("don't rely on hover for primary interactions") and `gesture-alternative`. The skill is right.
- **Verdict:** Make INVITE always visible on touch/coarse-pointer (or always visible, dimmed). Plus avatar emoji (A6).

### D6. Practice-history rows — ♻️ REVAMP (a11y)
`Arena.tsx:983-1041`
- Clickable **`div`** (no button semantics/focus), win/loss shown via `▲`/`▼` **emoji glyphs** + color.
- **Skill check:** `keyboard-nav`/`focus-states` (div onClick), `no-emoji-icons` (▲▼). It *does* also show "WIN/LOSS" text so `color-not-only` is satisfied — good.
- **Verdict:** Convert row to `<button>`; replace ▲▼ with Lucide `TrendingUp`/`TrendingDown`/`Minus`.

### D7. Match-found & ELO-result overlays — ✅ KEEP
`Arena.tsx:464-651`
- **Expansionist:** The ELO overlay (big delta, old→new, rank-up ring burst + emblem pop, tap-to-dismiss) is a *fantastic* reward moment — spring physics, earned celebration only on rank-up, subdued on rank-down.
- **Skill check:** `spring-physics`, `modal-motion` (scales from center), `motion-meaning` (the loud moment is *reserved* for rank-up — exactly right). Strong restraint.
- **Verdict:** Keep. One nit: `↑`/`↓` glyphs in the rank badge → Lucide arrows (A6). Scrim is `rgba(0,0,0,0.82)` + blur — meets `scrim-and-modal-legibility`.

### D8. Session-archive modal — 🔧 TUNE
`Arena.tsx:358-461`
- Solid: scoreboard, prompt, dual feedback columns, expert speech, scrim+blur, max-h-`dvh` (nice mobile detail), close button.
- **Skill check:** `modal-escape` (has X) ✅, `sheet-dismiss-confirm` (n/a, read-only). Verify Esc-to-close + focus trap (`escape-routes`, `focus-management`). Avatar emoji (A6).
- **Verdict:** Keep; focus-trap/Esc pass + de-emoji.

---

# E. Tracks (Public Speaking / Impromptu / Interviews / Body Language)

### E1. TrackShell wrapper — ✅ KEEP
`components/TrackShell.tsx` (used by all 4 tracks)
- **First Principles:** One shell = consistent eyebrow / title / intro / layout across all tracks. This is the backbone of cross-page consistency.
- **Skill check:** `consistency`, `navigation-consistency`. Skill explicitly wants this. Keep.

### E2. RecorderPanel — ✅ KEEP
Shared across Pathway/Impromptu/Interviews/PublicSpeaking.
- **First Principles:** One recording primitive, reused everywhere with ref-based start/stop — single source of truth for the app's core interaction. Excellent architecture-as-UX.
- **Verdict:** Keep. (Verify the visible recorder UIs expose mic-permission + recording state clearly — the Pathway path does.)

### E3. PublicSpeaking context selector (INTIMATE/STRATEGIC/COMMAND/DIGITAL) — 🔧 TUNE
`tracks/PublicSpeaking.tsx:41-46`
- **Expansionist:** Tailoring drill guidance to context (small room vs stage vs virtual) is a genuinely smart feature.
- **Outsider:** The *labels* are jargon — "COMMAND", "STRATEGIC" don't obviously map to "big audience" / "boardroom" until you read the `desc`. Cool, but adds a tiny decode tax.
- **Skill check:** `error-clarity`/labeling clarity — prefer label = meaning. 
- **Verdict:** Keep the feature; consider leading with the plain meaning ("Large audience") and using the codename as the secondary flavor, not vice-versa.

### E4. Interviews — STAR cards + question browser — ✅ KEEP
`tracks/Interviews.tsx:77-82` + question/practice modes
- **First Principles:** STAR framework surfaced as scannable cards, browse vs practice modes, difficulty tiers (Warm-up/Standard/Pressure), key-points checklists. Strong pedagogical UX.
- **Skill check:** `progressive-disclosure`, `field-grouping`, `visual-hierarchy`. Keep.

### E5. Impromptu timed-overlay state machine — ✅ KEEP
`tracks/Impromptu.tsx` + `components/impromptu/*` (Setup → Prep → Stage → Review)
- **First Principles:** Full-screen focus during prep/speaking, body-scroll lock to prevent double-scrollbars (`:70-74`), live transcript/filler/WPM telemetry, review phase. This is a sophisticated, well-considered flow.
- **Skill check:** `progressive-loading`, `state-transition`, `escape-routes` (has stop-early). Keep. (Same overlay focus-trap verification as C3.)

### E6. BodyLanguage track (camera studio + metric explainers) — ✅ KEEP
`tracks/BodyLanguage.tsx` + `BodyLanguageCamera`
- **First Principles:** Prompt card + shuffle → record-first studio → "what the AI measures" reference below. Correct ordering (act first, learn second).
- **Skill check:** `progressive-disclosure`, `motion-meaning`, on-device privacy messaging. Keep. Shuffle button's `group-hover:rotate-180` icon is a delightful, *meaningful* micro-interaction — the good kind of motion.

### E7. Shuffle / prompt cards (shared track idiom) — ✅ KEEP
`tracks/BodyLanguage.tsx:108-114`, etc. — pill button, icon spins on hover, clear label. Good `press-feedback`/`cursor-pointer`. Keep.

---

# F. Council synthesis & prioritized action list

**Where the skill genuinely does it better (act on these):**
1. ♻️ **A3 — Low-opacity text.** Biggest accessibility debt. Replace decorative opacity on meaningful text with contrast-tested `--muted-foreground`. *(skill: `color-contrast`, `contrast-readability`)*
2. ♻️ **A6 — Emoji as icons (52×).** Swap to Lucide + `Avatar` component. Highest polish-per-effort. *(skill: `no-emoji-icons`)*
3. ♻️ **A8 / C5 / D6 — Clickable `div`s & hover-only actions.** Convert to `<button>`, add focus rings, make D5's INVITE non-hover. *(skill: `focus-states`, `keyboard-nav`, `hover-vs-tap`)*
4. 🔧 **A7 — Motion overload.** Cap simultaneous decorative loops at ~2/view; cut Hero glitch layers. *(skill: `excessive-motion`)*
5. 🔧 **A2 — Microcopy floor.** Min 11px / max `tracking-[0.25em]` / min 50% opacity for meaningful labels. *(skill: `letter-spacing`, `readable-font-size`)*
6. 🔧 **C3/D8/E5 — Modal focus discipline.** Focus-trap + Esc + focus-restore on the full-screen overlays. *(skill: `escape-routes`, `focus-management`)*
7. 🔧 **A4/A5 — Tokenize radius + guarantee card borders.** Consistency/contrast, visual no-op. *(skill: `elevation-consistent`)*

**Where SpeakBold already beats the skill's generic advice (protect these):**
- The whole **vibrant-orange clay brand** (don't let the skill's navy default near it).
- **BodyLanguageHero** privacy + live-state handling (B3) — best-in-class.
- **Hero CTA strategy** (aha-before-wall, single primary) (B2).
- **DrillNode** gamification (C2), **ELO-result overlay** restraint (D7).
- **ImpactBanner** learner-floor honesty (B4).
- **Shared TrackShell + RecorderPanel** consistency architecture (E1/E2).
- **prefers-reduced-motion + mobile perf gating** already implemented (A7).
- **Semantic token system + full dark mode** (A1).

**Net:** Of the elements reviewed, the large majority are **KEEP** — SpeakBold's design language is strong and distinctive. The skill adds the most value not on *taste* but on *hygiene*: contrast, emoji→icons, keyboard/focus semantics, and motion restraint. Doing the 7 items in section F would close almost the entire gap between "looks great" and "is also accessible and rigorous" — without diluting the brand.

---

*No code was modified. This is a decision document. If you want, the section-F items can be implemented in priority order — items 1, 2, and 3 are the highest impact.*
