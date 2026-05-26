# SpeakBold — Developer Handoff

**Last updated:** 2026-05-25  
**Stack:** React 18 + TypeScript + Vite + Tailwind + Framer Motion + Supabase + shadcn/ui

---

## Project overview

SpeakBold is an AI-powered public speaking practice platform. Users complete timed speaking drills, get AI feedback on their transcript, compete in Arena battles against AI/custom opponents, track body language via webcam, and follow a structured Pathway curriculum.

**Routes:**
| Path | Page |
|---|---|
| `/` | Landing (Hero + features) |
| `/pathway` | Curriculum — lessons, drills, progress |
| `/arena` | Practice battles (AI duel / custom) |
| `/lab` | Skill Surgery — focused drills |
| `/profile` | Stats, recordings, resume builder |
| `/leaderboard` | ELO rankings |
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
- **Config:** `supabase/config.toml` (project_id corrected from stale `qiwidgbyuqppcrbysnwq`)
- **Client:** `src/integrations/supabase/client.ts`
- **Key tables:** `profiles`, `recordings`, `pathway_progress`, `arena_battles`, `user_practice_plans`, `practice_prompts`
- **Profiles columns used:** `onboarding_done`, `tutorial_done`, `strengths`, `weaknesses`, `pathway_selection`, `pathway_progress`, `elo`

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

All AI calls flow through this file. Each provider is silently skipped if its key is absent.

### Text generation — `callAI(prompt, _attempt?, temperature?)`
Waterfall (first non-null wins):
1. **Groq** — `llama-3.3-70b-versatile` → `llama-3.1-8b-instant` → `mixtral-8x7b-32768`
2. **OpenRouter** (free tier) — `llama-3.3-70b:free` → `mistral-7b:free` → `phi-3-mini:free`
3. **Cerebras** — `llama-3.3-70b`
4. **Gemini** — `gemini-2.0-flash` → `gemini-2.0-flash-lite` → `gemini-1.5-flash-8b` (all on `/v1` endpoint)

### Transcription — `transcribeAudio(blob, _attempt?)`
1. **Groq Whisper** — `whisper-large-v3-turbo`
2. **HuggingFace** — `openai/whisper-large-v3-turbo`
3. **Gemini** — multimodal inline audio, same 3-model list

### TTS — `speakWithDeepgramTTS(text, voice?)`
- Calls the `ai-tts` Supabase Edge Function (Deepgram Aura server-side)
- Requires a valid Supabase auth session (JWT passed in header)
- Throws on failure → caller falls back to `SpeechSynthesisUtterance`
- Used exclusively by `DebateBattle.tsx` for AI opponent voice

### Exported functions (all call `callAI` / `transcribeAudio` internally):
`generateInterviewQuestions`, `generateSpeakingDrills`, `generateImpromptuPrompts`,
`generateArenaPrompt`, `generateAIArgument`, `judgeBattle`, `judgePathwayDrill`,
`chatWithAssistant`, `generateBodyLanguageFeedback`

---

## Supabase Edge Functions (`supabase/functions/`)

| Function | Purpose | Secrets needed | Status |
|---|---|---|---|
| `ai-tts` | Deepgram Aura TTS proxy | `DEEPGRAM_API_KEY` | **NOT YET DEPLOYED** |
| `ai-text` | Server-side text fallback chain | `OPENROUTER_API_KEY`, `CEREBRAS_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY` | Created, not deployed |
| `ai-transcribe` | Server-side transcription chain | `GROQ_API_KEY`, `HUGGINGFACE_API_KEY`, `GEMINI_API_KEY`, `DEEPGRAM_API_KEY` | Created, not deployed |

**To deploy `ai-tts` (run from project root in PowerShell):**
```powershell
cd "C:\Users\One can only ponder\Downloads\speakbold-main"
npx supabase login
npx supabase link --project-ref xriasdhqzapgwnszkvzp
npx supabase secrets set DEEPGRAM_API_KEY=your_key_here
npx supabase functions deploy ai-tts
```
Get a free Deepgram key at [console.deepgram.com](https://console.deepgram.com) ($200 free credit, no card).

---

## Auth + onboarding flow

**`src/context/AuthContext.tsx`** — memoized with `useCallback`/`useMemo`.  
Provides: `session`, `user`, `loading`, `statusLoading`, `onboardingDone`, `tutorialDone`, `refreshUserStatus`, `signOut`.  
Profile re-fetch is gated on `session?.user?.id` change only (not every token rotation).

**User journey:**
1. Sign up/login → `OnboardingModal` (6 steps: welcome → how-it-works → meet-the-AI → strengths → weaknesses → goal)
2. Onboarding complete → `TutorialOverlay` checklist appears
3. Tutorial complete → both dismissed permanently

**State persistence:**
- `profiles.onboarding_done` + `profiles.tutorial_done` (Supabase, source of truth)
- `speakbold_onboarding_v2_{uid}` (localStorage, legacy mirror)
- `speakbold_firststeps_{uid}` — tutorial checklist JSON `{ "first-drill": true, ... }`
- `speakbold_firststeps_collapsed_{uid}` — whether checklist is collapsed

**Dev console utilities (registered by TutorialOverlay):**
```js
resetOnboarding()   // clears DB + localStorage, reloads
startTutorial()     // force-shows tutorial overlay
```

---

## Key components

### `src/components/TutorialOverlay.tsx`
- Floating 5-item checklist panel. **Zero Framer Motion** — CSS-only animations. Hard `return null` when not visible.
- **Drill detection:** listens for `speakbold:drill-complete` custom event on `window` (primary) + legacy `#tutorial-close-drill` click guard (fallback)
- **Route steps:** require **5-second dwell** before ticking (setTimeout, cancelled on unmount/route change)
- Checklist items: `first-drill`, `visit-lab`, `visit-arena`, `visit-profile`, `visit-leaderboard`

### `src/components/RecorderPanel.tsx`
- Dispatches `window.dispatchEvent(new CustomEvent("speakbold:drill-complete"))` every time a recording blob is produced

### `src/components/DebateBattle.tsx`
- AI debate opponent with full phase state machine
- "Back to Arena" results button has `id="tutorial-close-drill"` AND dispatches `speakbold:drill-complete`
- TTS: `speakWithDeepgramTTS` → browser `SpeechSynthesisUtterance` fallback
- Tab-discard recovery via `sessionStorage` (`debate_phase`, `debate_phase_start`)

### `src/components/FloatingNodes.tsx`
- **Rewritten** from 15 `motion.div` infinite loops to a single `<canvas>` + one RAF loop (7 nodes)
- Checks `prefers-reduced-motion` and skips entirely if set

### `src/components/OnboardingModal.tsx`
- 6-step flow. Step dots: **forward navigation blocked** (can only go back to completed steps)
- "Choose my goal →" button on step 0 jumps directly to step 5 (goal selection)
- Body text at `opacity-60` (was `opacity-40`)

### `src/lib/z.ts` *(new)*
Z-index token file — single source of truth:
```ts
import { Z, Zcls } from "@/lib/z";
// Z.tutorial = 250, Z.onboarding = 200, Z.panel = 100, Z.arena = 60, Z.bg = 0 …
// Zcls.tutorial = "z-[250]"  (pre-built Tailwind class strings)
```
Existing components still use inline `z-[N]` magic numbers — migration is optional/incremental.

### `src/hooks/useMicPermission.ts` *(new)*
Module-level permission cache + broadcast set. One `Permissions API` watcher shared across all consumers. Returns `{ permission: "unknown"|"granted"|"denied"|"prompt", requestPermission: () => Promise<boolean> }`.  
**Not yet integrated into any UI** — wire into `RecorderPanel` to show a "mic blocked" warning.

---

## Performance changes made

| Area | Before | After |
|---|---|---|
| `FloatingNodes` | 15 `motion.div` infinite loops | 1 canvas RAF, 7 nodes |
| `App.tsx` background blobs | `animate-float` on 3 elements + `backdrop-blur-3xl` glass cards | Static blobs, reduced blur, 1 glass card |
| `TutorialOverlay` | Framer Motion throughout | Zero FM, CSS transitions only |
| `AuthContext` | Re-fetched profile on every token rotation | Only re-fetches when `user.id` changes |
| Global CSS | No motion preference support | `@media (prefers-reduced-motion: reduce)` kills all animations |
| Hero glitch layers | Always rendered on md+ | `md:motion-safe:block` — hidden for reduced-motion users |

---

## Completed phases

### Phase 1 — Cleanup ✅
- Deleted `src/pages/Arena_github.tsx` (stale merge artifact)
- `Hero.tsx`: removed `select-none` from `<h1>`, removed `animate-pulse` from decorative spans
- `AuthContext.tsx`: memoized with `useCallback`/`useMemo`, narrowed effect dep to `session?.user?.id`
- Created Edge Functions: `ai-text`, `ai-transcribe`, `ai-tts`
- Fixed `callAI` missing `export` keyword (pre-existing committed bug)
- Added `speakWithDeepgramTTS` export to `geminiService.ts` (was missing from committed code)

### Phase 2 — Foundation ✅
- Slimmed global background (App.tsx + FloatingNodes)
- `prefers-reduced-motion` global CSS rule + Hero glitch layers gated
- `useMicPermission.ts` hook created
- `src/lib/z.ts` z-index token file created

### Phase 3 — Copy & UX ✅
- Hero subtitle → plain English: "Real practice. Instant AI feedback. Become a confident speaker — free."
- Hero CTAs: "ACCESS PLATFORM" → "Start learning", "THE JOURNEY" → "Continue learning", "PRACTICE LOUNGE" → "Practice now"
- OnboardingModal: all button labels sentence-cased, `tracking-[0.3em]` → `tracking-wide`, body text `opacity-40` → `opacity-60`, `text-[10px]` → `text-xs`, "SKIP TO PATHWAY" → "Choose my goal →", step-dot forward navigation blocked

### Phase 4 — Tutorial robustness ✅
- `RecorderPanel` dispatches `speakbold:drill-complete` on every completed recording
- `DebateBattle` dispatches `speakbold:drill-complete` on "Back to Arena" click
- `TutorialOverlay` listens for the event (primary) + legacy click guard (fallback)
- Route-based steps require 5-second dwell before ticking

---

## Pending work (Phase 5)

### 5.1 — Decompose `Arena.tsx` (high priority)
`src/pages/Arena.tsx` is ~2000+ lines. Proposed split:
- `src/hooks/useDuelStateMachine.ts` — all state transitions, timers, phase logic
- `src/components/DuelDrill.tsx` — the active battle UI
- `Arena.tsx` becomes a thin shell/router

### 5.2 — Typed event bus
Replace scattered `window.addEventListener("arena-battle-*")` with a typed emitter:
```ts
// src/lib/events.ts
import mitt from "mitt";
type Events = {
  "drill:complete": void;
  "arena:battle-start": { battleId: string };
  "arena:battle-end": { score: number; winner: "you" | "opponent" | "tie" };
};
export const emitter = mitt<Events>();
```

### 5.3 — `tracking-[0.3em]` sweep on Arena + other pages
Phase 3 covered `OnboardingModal` and `Hero`. `Arena.tsx`, `DebateBattle.tsx`, and other pages still have extreme letter-spacing on interactive button text. Rule: keep on section labels, remove from buttons.

### 5.4 — Wire `useMicPermission` into RecorderPanel
Show a "mic blocked" warning state in `RecorderPanel` before the user attempts to record. Pre-request permission on Pathway page load.

### 5.5 — Deploy Edge Functions
When ready, deploy all three and update `geminiService.ts` to route through them instead of direct VITE_ key calls. This moves all API keys fully server-side.

---

## Known issues / gotchas

1. **Gemini `gemini-1.5-flash` 404** — the `/v1` endpoint works; older preview slug names don't. Already using `gemini-1.5-flash-8b` in current code.
2. **`ai-tts` CORS error on localhost** — expected until the Edge Function is deployed. App silently falls back to browser TTS.
3. **`speakWithDeepgramTTS` requires Supabase auth session** — will throw if called while logged out.
4. **`grain` CSS class** — references external noise PNG at `assets.iceable.com`. Won't load offline (low priority).
5. **`src/integrations/gemini.ts`** — a secondary wrapper file that also imports `callAI`. Don't confuse with `geminiService.ts`.
6. **TypeScript:** `npx tsc --noEmit` passes with zero errors as of this handoff.

---

## Quick dev commands

```bash
npm install
npm run dev          # Vite dev server, usually :8080
npm run build        # Production build
npx tsc --noEmit     # Type-check only (should be zero errors)

# In browser console (after login):
resetOnboarding()    # wipes all progress + reloads
startTutorial()      # force-shows tutorial overlay
```
