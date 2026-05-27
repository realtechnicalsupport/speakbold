# SpeakBold — Developer Handoff

**Last updated:** 2026-05-27  
**Stack:** React 18 + TypeScript + Vite + Tailwind + Framer Motion + Supabase + shadcn/ui

---

## Project overview

SpeakBold is an AI-powered public speaking practice platform. Users complete timed speaking drills, get AI feedback on their transcript, compete in Arena battles against AI/custom opponents, track body language via webcam, and follow a structured 3-tier Pathway curriculum.

**Routes:**
| Path | Page |
|---|---|
| `/` | Landing (Hero + features) |
| `/pathway` | Curriculum — 3-tier lessons, drills, placement test |
| `/arena` | Practice Lounge — AI duels, debate battles, ELO |
| `/lab` | The Lab — focused drills (Impromptu, Public Speaking, Interviews) |
| `/profile` | Stats, recordings, resume builder |
| `/leaderboard` | ELO + XP rankings |
| `/tracks/*` | Skill tracks (public-speaking, impromptu, interviews, body-language) |
| `/events`, `/events/new`, `/events/:id` | Event prep + practice plans |
| `/pitch` | Pitch deck practice |
| `/report` | Progress report |
| `/pre-flight` | Pre-session checklist |

---

## Infrastructure

### Supabase
- **Project ID:** `xriasdhqzapgwnszkvzp`
- **URL:** `https://xriasdhqzapgwnszkvzp.supabase.co`
- **Config:** `supabase/config.toml`
- **Client:** `src/integrations/supabase/client.ts`
- **Key tables:** `profiles`, `recordings`, `arena_battles`, `user_practice_plans`, `practice_prompts`
- **Profiles columns used:** `onboarding_done`, `tutorial_done`, `strengths`, `weaknesses`, `pathway_progress` (jsonb), `drill_scores` (jsonb), `elo`

### Pending DB migration
```sql
-- supabase/migrations/20260527_add_drill_scores.sql
-- Run: npx supabase db push (or apply manually in Supabase dashboard)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS drill_scores jsonb DEFAULT '{}'::jsonb;
```

### Environment variables (`.env`)
```
VITE_SUPABASE_PROJECT_ID=xriasdhqzapgwnszkvzp
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_URL=https://xriasdhqzapgwnszkvzp.supabase.co
VITE_GEMINI_API_KEY=your_gemini_key
VITE_GROQ_API_KEY=your_groq_key
VITE_OPENROUTER_API_KEY=your_openrouter_key
VITE_CEREBRAS_API_KEY=your_cerebras_key
VITE_HUGGINGFACE_API_KEY=your_huggingface_key
```
Deepgram TTS key lives **server-side only** as a Supabase Edge Function secret — `DEEPGRAM_API_KEY`.

---

## AI provider architecture (`src/services/geminiService.ts`)

All AI calls flow through this file.

### Text generation — `callAI(prompt, _attempt?, temperature?)`
Waterfall (first non-null wins):
1. **Groq** — `llama-3.3-70b-versatile` → `llama-3.1-8b-instant` → `mixtral-8x7b-32768`
2. **OpenRouter** (free tier) — `llama-3.3-70b:free` → `mistral-7b:free` → `phi-3-mini:free`
3. **Cerebras** — `llama-3.3-70b`
4. **Gemini** — `gemini-2.0-flash` → `gemini-2.0-flash-lite` → `gemini-1.5-flash-8b`

### Transcription — `transcribeAudio(blob)`
1. **Groq Whisper** — `whisper-large-v3-turbo`
2. **HuggingFace** — `openai/whisper-large-v3-turbo`
3. **Gemini** — multimodal inline audio

### TTS — `speakWithDeepgramTTS(text, voice?)`
- Calls the `ai-tts` Supabase Edge Function (Deepgram Aura, server-side)
- Requires a valid Supabase auth session (JWT passed in header)
- Used by: `DebateBattle.tsx` (AI opponent voice) + `Pathway.tsx` LessonDrill (coach feedback playback)
- Falls back to `SpeechSynthesisUtterance` on failure in DebateBattle; silently hides button in LessonDrill

---

## Supabase Edge Functions (`supabase/functions/`)

| Function | Purpose | Secrets needed | Status |
|---|---|---|---|
| `ai-tts` | Deepgram Aura TTS proxy | `DEEPGRAM_API_KEY` | **NOT YET DEPLOYED** |
| `ai-text` | Server-side text chain | `OPENROUTER_API_KEY`, `CEREBRAS_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY` | Created, not deployed |
| `ai-transcribe` | Server-side transcription | `GROQ_API_KEY`, `HUGGINGFACE_API_KEY`, `GEMINI_API_KEY` | Created, not deployed |

**To deploy `ai-tts` (PowerShell from project root):**
```powershell
npx supabase login
npx supabase link --project-ref xriasdhqzapgwnszkvzp
npx supabase secrets set DEEPGRAM_API_KEY=your_key_here
npx supabase functions deploy ai-tts
```
Get a free Deepgram key at [console.deepgram.com](https://console.deepgram.com) ($200 free credit, no card).

---

## Pathway curriculum (`src/hooks/usePathway.ts`)

Three tiers. IDs are stable — `pathway_progress` JSONB survives restructuring.

### Tier: Beginner
| Chapter | Drills |
|---|---|
| Warm Up (4 drills) | Hello World, The Pause, Eye of the Room, Mirror Drill |
| Get Clear (4 drills) | One-Sentence Summary, Explain Like I'm 12, Cut the Filler, The 3-Point Close |

### Tier: Intermediate
| Chapter | Drills |
|---|---|
| Sound Confident (4 drills) | Volume on Purpose, The Power Stance, Vary Your Pace, Kill the Upspeak |
| Think & Persuade (4 drills) | Quick Thinking (30s), Persuade With a Story (90s) + milestone test |

### Tier: Orator
| Chapter | Drills |
|---|---|
| Take the Stage (3 debate battles) | Handle the Tough One, Take the Harder Side, Beat the Expert |

**Placement test** (`src/components/PlacementTest.tsx`):
- Offered once to fresh users on `/pathway`; 60s recording → AI score → tier band (`<55` Beginner, `55–72` Intermediate, `72+` Orator)
- Skip persists: `localStorage` key `speakbold:placement-skipped:<userId>`
- Skipped-past drills get status `"tested-out"` (accessible/replayable, excluded from `progressPercent`)
- Placed users finish their tier without grinding all 19 drills

**Score sparklines** (`drillScores` in `usePathway`):
- `profiles.drill_scores` JSONB: `{ [lessonId]: number[] }` — ordered score history per drill
- Displayed as inline SVG polyline on completed DrillNode (shows last 6 attempts; green = trending up, red = down)
- **Migration required:** `20260527_add_drill_scores.sql` (see above)

**Console debug commands** (available on `/pathway` after login):
```js
window.speakbold.help()                           // list all commands
window.speakbold.placement('beginner'|'intermediate'|'orator')
window.speakbold.resetPlacement()                 // clear progress + re-show placement
window.speakbold.showPlacement()                  // open placement overlay now
window.speakbold.progress()                       // console.table all lesson statuses
window.speakbold.completeAll()                    // mark every lesson completed
window.speakbold.completeUpTo('beginner'|...)     // complete all before a tier
window.passDrill()                                // (inside a drill) auto-pass with score 100
```

**Collapsible completed chapters:**
- Completed chapters default to collapsed on page load
- Clicking anywhere on the chapter header card toggles expand/collapse
- "✓ DONE" badge contains a rotating chevron indicator
- Smooth `AnimatePresence` height animation

---

## Arena (`src/pages/Arena.tsx`, `src/context/ArenaContext.tsx`)

### ELO result screen
After every match, a **full-screen overlay** replaces the old toast-style bottom-right card:
- Blurred backdrop (rgba 82% black + 18px blur)
- Centered card with color-coded ambient radial glow
- **VICTORY / DEFEAT / DRAW** label (green / red / yellow)
- Huge spring-animated ELO delta (`clamp(5rem, 22vw, 9rem)`)
- Old ELO → New ELO transition
- Rank change badge (↑ Rank Up / ↓ Rank Down) when applicable
- Auto-dismisses after 8 seconds; clicking anywhere dismisses early

### BO3 ranked series — REMOVED
The Best-of-3 multiplier toggle was removed entirely (2026-05-27). All BO3 references purged from:
- `src/pages/Arena.tsx` — state, sessionStorage writes, toggle button UI
- `src/context/ArenaContext.tsx` — sessionStorage read, `bo3: bo3Active` param
- `src/hooks/arenaUtils.ts` — `BO3_MULTIPLIER`, `BO3_ELO_MULTIPLIER` constants, `bo3` field on `EloComputationInput`, multiplier line, `bo3` param on `estimateEloAtStake`

### ELO computation
`computeEloChange(input: EloComputationInput)` in `arenaUtils.ts`:
- K-factor starts at 48 for placement phase, drops to 32 → 24 → 20 as matches accumulate
- Mode multipliers: `debate` = 1.35×, `standard` = 1.0×, `speed` = 0.9×
- AI damping: 0.7× (AI matches worth less ELO than human matches)
- Floor: `ELO_FLOOR = 100` (can never go below)
- Custom sessions and ties do not move ELO

---

## DebateBattle (`src/components/DebateBattle.tsx`)

### Phase machine
```
"prep" → "opening-user" → "opening-ai" → "rebuttal-user" → "rebuttal-ai" → "judging" → "results"
```
(AGAINST stance flips the AI/user order for opening/rebuttal)

### Prep phase (5 seconds, added 2026-05-27)
- Shows user's stance (green = FOR, red = AGAINST) + animated digit-flip countdown
- All recording/microphone/speech-recognition activity is gated to skip prep
- "I'm ready →" button skips directly to first speaking phase
- Not saved to sessionStorage (tab-discard restore always starts fresh at speaking phase)

### Tab-discard recovery
Saves `debate_phase` + `debate_phase_start` to `sessionStorage`. Restores any phase except `prep`, `judging`, `results`. Resumes from the correct elapsed time (wall-clock anchored).

### TTS voices
Each AI persona gets a deterministic Deepgram Aura voice (stable hash of persona name). Falls back to browser `SpeechSynthesisUtterance` if Deepgram fails.

---

## Pathway LessonDrill features

### Recording playback
After a drill, the user can hear themselves back:
- Blob URL created from the recorded audio (`audioUrlRef`)
- Play/Pause button appears in results screen
- URL revoked on component unmount

### TTS coach feedback
After results appear, the AI coach's written feedback is automatically fetched via `speakWithDeepgramTTS`:
- "Hear Coach" button appears once audio is ready (hidden during load, hidden if TTS fails)
- Mutual exclusion: starting playback pauses TTS and vice versa

---

## Landing page mobile redesign (2026-05-27)

### Hero (`src/components/Hero.tsx`)
- `"Speak"` letters: `clamp(3.75rem, 17vw, 140px)` — ~70px on iPhone 375px vs old 48px
- `"Bold."`: `clamp(5rem, 22vw, 180px)` — ~82px on mobile vs old 60px
- `min-h-screen` → `min-h-[100dvh]` (no address-bar crop on iOS Safari)
- CTA buttons: `w-full sm:w-auto` — full-width on mobile, auto on desktop
- Bottom bar: centered on mobile, spread on desktop

### SiteHeader (`src/components/SiteHeader.tsx`)
- Logo text: `text-xl lg:text-2xl` → `text-2xl lg:text-3xl`

### Other sections — reduced mobile spacing
| File | Change |
|---|---|
| `ImpactBanner.tsx` | Card padding `p-8` → `p-5 md:p-8`, grid gap `gap-6` → `gap-3 md:gap-6`, header margin halved |
| `WhyItMatters.tsx` | Section padding `py-32` → `py-16 md:py-32`, grid gap `gap-20` → `gap-10 lg:gap-20`, card `p-12` → `p-8 md:p-20` |
| `Progress.tsx` | Section padding `py-32` → `py-16 md:py-60`, grid gap `gap-24` → `gap-10 lg:gap-24`, card `p-8` → `p-5 md:p-14` |
| `CTA.tsx` | Section padding `py-40` → `py-20`, "READY / You?" uses `clamp()`, CTA button full-width on mobile, footer links wrap-flex |

---

## Key components

### `src/components/TutorialOverlay.tsx`
Floating 5-item checklist. Zero Framer Motion (CSS only). Hard `return null` when not visible.
- Drill detection: `speakbold:drill-complete` custom event (primary) + `#tutorial-close-drill` click guard (fallback)
- Route steps: 5-second dwell required before tick
- Items: `first-drill`, `visit-lab`, `visit-arena`, `visit-profile`, `visit-leaderboard`

### `src/components/DuelDrill.tsx`
Extracted from Arena.tsx (was 2349 lines → Arena is now ~1330 + DuelDrill ~881 lines). Standard 1v1 drill with AI judge, ELO, scoring.

### `src/components/DebateBattle.tsx`
Full turn-based debate with phase machine, Deepgram TTS, tab-discard recovery, and now a 5-second prep phase.

### `src/components/FloatingNodes.tsx`
Single `<canvas>` + RAF loop (7 nodes). Skips entirely if `prefers-reduced-motion` is set.

### `src/components/MobileNav.tsx`
Bottom nav bar (mobile only). 5 items: Home, Path, Lab, Arena, Profile. ThemeToggle at end.

### `src/lib/events.ts`
Typed mitt emitter (`arenaEmitter`). Events: `"elo:updated"`, `"arena:battle-start"`, `"arena:battle-end"`, `"arena:battle-forfeit"`. All `window.dispatchEvent(new CustomEvent("arena-*"))` replaced.

### `src/lib/z.ts`
Z-index token file. `Z.tutorial = 250`, `Z.onboarding = 200`, `Z.panel = 100`, etc.

### `src/hooks/useMicPermission.ts`
Module-level permission cache + Permissions API watcher. Integrated into `RecorderPanel` — shows red "Microphone access is blocked" banner when denied.

---

## Auth + onboarding

**User journey:**
1. Sign up/login → `OnboardingModal` (6 steps)
2. Onboarding complete → `TutorialOverlay` checklist
3. Both dismissed permanently in Supabase `profiles`

**Dev console:**
```js
resetOnboarding()   // clears DB + localStorage, reloads
startTutorial()     // force-shows tutorial overlay
```

---

## ELO / ranking system (`src/hooks/arenaUtils.ts`)

| Constant | Value |
|---|---|
| `STARTING_ELO` | 1000 |
| `ELO_FLOOR` | 100 |
| `FORFEIT_PENALTY` | 30 |
| `PLACEMENT_MATCHES_REQUIRED` | 5 |

**Ranks (by ELO):** Bronze 0–599 · Silver 600–999 · Gold 1000–1399 · Platinum 1400–1799 · Diamond 1800–2199 · Master 2200+

---

## Known issues / gotchas

1. **`drill_scores` migration not applied** — `20260527_add_drill_scores.sql` must be pushed before score sparklines work in prod.
2. **`ai-tts` not deployed** — TTS falls back to browser `SpeechSynthesisUtterance`. Coach voice button in LessonDrill will not appear until deployed.
3. **`speakWithDeepgramTTS` requires auth session** — throws if called while logged out.
4. **`"duel"` lesson type is scaffolded only** — DrillNode renders with Swords icon but neither render branch in Pathway matches. Wire `DuelDrill` before adding any duel-type lessons.
5. **Orator tier is thin** — 3 drills only. Placed advanced users hit the end quickly. Content depth is the top priority.
6. **`src/integrations/gemini.ts`** — secondary wrapper that also imports `callAI`. Do not confuse with `geminiService.ts`.
7. **UI overhaul Phase B/C/D pending** — Phase A (tokens, mesh bg, radius, font, noise removal) done. Button variants, SiteHeader redesign, and full landing-card migration are next.

---

## Pending work (priority order)

### 1. Apply `drill_scores` DB migration
```powershell
npx supabase db push
```

### 2. Deploy `ai-tts` edge function
See Infrastructure section above.

### 3. Orator tier content
Add more drills to the Orator "Take the Stage" chapter. The lesson scaffolding (type, routing, DebateBattle integration) is fully wired — only content definitions needed in `usePathway.ts`.

### 4. Wire `"duel"` lesson type
The `DuelDrill` has multiplayer-sync props (`sendReadyStatus`, `broadcastBattleResult`, `sendTranscript`). For Pathway use, create a simplified AI-only variant or accept a subset of those props with stubs.

### 5. UI overhaul Phase B — Shell
- Button variants (delete hero/spotlight, polish default/outline)
- SiteHeader redesign (scroll shadow, improved mobile layout)
- card-premium migration for landing section cards

### 6. Deploy remaining edge functions
`ai-text` and `ai-transcribe` for full server-side AI routing.

---

## Quick dev commands

```bash
npm install
npm run dev          # Vite dev server — usually :8080
npm run build        # Production build
npx tsc --noEmit     # Type-check (target: 0 errors)

# In browser console (after login on /pathway):
window.speakbold.help()

# In browser console (global):
resetOnboarding()
startTutorial()
```
