# SpeakBold — Developer Handoff

**Last updated:** 2026-05-30  
**Stack:** React 18 + TypeScript + Vite + Tailwind + Framer Motion + Supabase + shadcn/ui

---

## Project overview

SpeakBold is an AI-powered public speaking practice platform. Users complete timed speaking drills, get AI feedback on their transcript, compete in Arena battles against AI/custom opponents, track body language via webcam, follow a structured 3-tier Pathway curriculum, and connect with friends to compare stats.

**Routes:**
| Path | Page |
|---|---|
| `/` | Landing (Hero + features) |
| `/pathway` | Curriculum — 3-tier lessons, drills, placement test |
| `/arena` | Practice Lounge — AI duels, debate battles, ELO |
| `/lab` | The Lab — focused drills (Impromptu, Public Speaking, Interviews) |
| `/friends` | Friends list, requests, invite tab |
| `/friends/:userId` | Friend mini-profile |
| `/friends/invite/:token` | Public invite landing (works signed-out) |
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
- **Key tables:** `profiles`, `recordings`, `arena_battles`, `friendships`, `friend_invites`, `user_practice_plans`, `practice_prompts`
- **Profiles columns:** `onboarding_done`, `tutorial_done`, `strengths`, `weaknesses`, `pathway_progress` (jsonb), `drill_scores` (jsonb), `elo`, `last_active_at`

### Pending DB migrations — apply these in Supabase SQL Editor in order

```sql
-- 1. drill_scores column (sparklines in Pathway)
-- File: supabase/migrations/20260527_add_drill_scores.sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS drill_scores jsonb DEFAULT '{}'::jsonb;

-- 2. Friends tables + RLS + streak policy extension + last_active_at on profiles
-- File: supabase/migrations/20260530_create_friends.sql

-- 3. Friend invite RPCs (claim_friend_invite, peek_friend_invite)
-- File: supabase/migrations/20260530_friend_invite_rpcs.sql

-- 4. Backfill NULL display_names (fixes OAuth users invisible to friend search)
-- File: supabase/migrations/20260530_backfill_display_names.sql

-- 5. Add missing verdict columns to arena_battles (fixes "rating didn't save" error)
ALTER TABLE public.arena_battles
  ADD COLUMN IF NOT EXISTS strengths text,
  ADD COLUMN IF NOT EXISTS opp_strengths text,
  ADD COLUMN IF NOT EXISTS opp_feedback text,
  ADD COLUMN IF NOT EXISTS example_speech text;
NOTIFY pgrst, 'reload schema';
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

All AI text/transcription calls now go through Supabase Edge Functions — API keys never reach the browser bundle.

### Text generation — `callAI(prompt, _attempt?, temperature?)`
Routed via `ai-text` edge function. Server-side chain (fastest first):
1. **Cerebras** — `gpt-oss-120b` → `zai-glm-4.7` *(reasoning models — text in `message.reasoning`, not `message.content`)*
2. **Groq** — `llama-3.3-70b-versatile` → `llama-3.1-8b-instant`
3. **Gemini** — `gemini-2.0-flash` → `gemini-2.0-flash-lite` → `gemini-2.5-flash-preview-04-17`
4. **OpenRouter** (free tier, last resort) — `meta-llama/llama-4-scout:free` → `google/gemma-3-27b-it:free`

Each provider has a **7-second timeout** — a hanging provider can't block the chain.

### Transcription — `transcribeAudio(blob)`
Routed via `ai-transcribe` edge function. Server-side chain:
1. **Deepgram** (fast)
2. **Groq Whisper**
3. **Gemini** multimodal

### TTS — `speakWithDeepgramTTS(text, voice?)`
- Calls the `ai-tts` Supabase Edge Function (Deepgram Aura, server-side)
- Requires a valid Supabase auth session (JWT passed in header)
- Used by: `DebateBattle.tsx` (AI opponent voice) + Pathway `LessonDrill` (coach feedback playback)
- Falls back to `SpeechSynthesisUtterance` on failure in DebateBattle; silently hides button in LessonDrill

---

## Supabase Edge Functions (`supabase/functions/`)

| Function | Purpose | Secrets needed | Deploy status |
|---|---|---|---|
| `ai-text` | Server-side text chain (Cerebras→Groq→Gemini→OR) | `CEREBRAS_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY` | **Needs redeploy after Cerebras model update** |
| `ai-transcribe` | Server-side transcription chain | `GROQ_API_KEY`, `HUGGINGFACE_API_KEY`, `GEMINI_API_KEY` | Deployed |
| `ai-tts` | Deepgram Aura TTS proxy | `DEEPGRAM_API_KEY` | Deployed |
| `submit-battle-result` | Authoritative ELO + battle record writer | `SUPABASE_SERVICE_ROLE_KEY` | **Needs redeploy after lean-retry fix** |
| `analyze-recording` | Recording AI analysis | `GROQ_API_KEY`, `GEMINI_API_KEY` | Deployed |

**Deploy commands:**
```powershell
npx supabase login
npx supabase link --project-ref xriasdhqzapgwnszkvzp
npx supabase functions deploy ai-text
npx supabase functions deploy submit-battle-result
```

---

## Friends system (`src/context/FriendsContext.tsx`)

Single shared context — `FriendsProvider` wraps the app inside `ArenaProvider` in `App.tsx`.

**Architecture:**
- One Supabase Realtime subscription on `friendships` table per session
- Data fetched: `friendships` → joins `profiles` + `streaks` + `user_xp` for each friend
- Streak reads work because the migration extends the `streaks` RLS policy to allow friends to read each other's streaks

**Hooks:**
- `useFriends()` — re-export from context; full friend list + actions
- `useFriendSearch(query)` — debounced 300ms; searches `profiles.display_name` with ILIKE
- `useFriendInvite()` — generate/list/revoke 14-day invite tokens

**Invite flow:**
- Signed-in invitee: hits `/friends/invite/:token` → calls `claim_friend_invite(token)` RPC → friendship row inserted → redirect to `/friends`
- Signed-out invitee: `peek_friend_invite(token)` (public RPC) shows inviter name → "Sign up" button carries `?next=/friends/invite/:token` through the login flow

**Sharp edges:**
- `src/integrations/supabase/types.ts` was NOT regenerated — `friendships` and `friend_invites` tables use `(supabase as any).from(...)` casts throughout. Run `supabase gen types typescript` after migrations to clean these up.
- Friend search only works if `display_name` is non-null. The `20260530_backfill_display_names.sql` migration fixes existing null names and installs a trigger for future signups.

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

**Score sparklines** — requires `drill_scores` migration (see above).

**Console debug commands** (available on `/pathway` after login):
```js
window.speakbold.help()
window.speakbold.placement('beginner'|'intermediate'|'orator')
window.speakbold.resetPlacement()
window.speakbold.progress()
window.speakbold.completeAll()
window.passDrill()   // inside a drill — auto-pass score 100
```

---

## Arena (`src/pages/Arena.tsx`, `src/context/ArenaContext.tsx`)

### ELO system
- `ELO_FLOOR = 0` — can never go negative (changed from 100 to prevent manual reset to 0 being raised back)
- `STARTING_ELO = 1000`
- `FORFEIT_PENALTY = 30`
- `PLACEMENT_MATCHES_REQUIRED = 5`
- K-factor: 48 (placement) → 32 (Bronze) → 28 (Silver) → 24 (Gold) → 20 (Platinum) → 16 (Diamond)
- All ELO writes go through `submit-battle-result` edge function (server-authoritative, prevents client-side manipulation)

**Ranks:** Bronze 0–599 · Silver 600–1199 · Gold 1200–1799 · Platinum 1800–2399 · Diamond 2400+

### Duel request cooldown
After sending a challenge, the "SEND CHALLENGE" button shows `WAIT Xs…` for 10 seconds. `requestCooldown` is exposed from `ArenaContext`.

### Forfeit flow
- **Self-forfeit:** -30 ELO, opponent gets win ELO. Caller sees `onClose()`.
- **Opponent forfeit:** Winner sees "VICTORY BY FORFEIT" result screen (not immediate `onClose()`). `forfeitedRef` prevents late AI judge results from overwriting the forfeit verdict.

### Battle screen (mobile)
`DuelDrill` + `DebateBattle` + Pathway `LessonDrill` all use:
- `bg-background` (solid, not `glass`) — prevents background page bleed-through
- `z-[180]` — above chat, toasts, chapter celebration
- `minHeight: "100dvh"` + `paddingBottom: env(safe-area-inset-bottom)`
- `setTimerActive(true)` on mount → hides MobileNav during battle

---

## DebateBattle (`src/components/DebateBattle.tsx`)

### Phase machine
```
"prep" → "opening-user" → "opening-ai" → "rebuttal-user" → "rebuttal-ai" → "judging" → "results"
```

### Tab-discard recovery
Saves `debate_phase` + `debate_phase_start` to `sessionStorage`. Restores any phase except `prep`, `judging`, `results`.

### TTS voices
Each AI persona gets a deterministic Deepgram Aura voice. Falls back to `SpeechSynthesisUtterance`.

---

## Lab — Impromptu track (`src/pages/tracks/Impromptu.tsx`)

### Results screen
After a session, the inline `<ImpromptuReview>` is the **sole** AI feedback screen (coaching via `coachImpromptu`: score ring, pace/filler metrics, framework check, cut/expand, next-focus, model speech, transcript). The redundant `RecordingFeedbackModal` ("Practice Feedback" popup, backed by `analyze-recording`) was removed — when mounted with a `trigger` it actually rendered a second visible "AI FEEDBACK" button, duplicating the inline review. Recordings still upload (`autoFeedbackId` set in `useImpromptuSession`) for the profile page; only the duplicate feedback UI is gone.

### WPM handling (desktop vs. mobile)
- The hook's live `wpm` is only valid **during** the speaking phase (`phase === "speaking"`). For the review screen it would always read 0, so `useImpromptuSession` now holds a separate **`reviewWpm`** state, set from the figure actually computed for coaching: `finalWpm` in `transitionToReview` (desktop, live transcript) and `fbWpm` in `onRecordingComplete` (mobile, server-side transcription of the recording). `ImpromptuReview` receives `reviewWpm`; `ImpromptuStage` keeps the live `wpm`.
- On mobile there is no live transcript (live Web Speech is skipped — see below), so the **live HUD + voice bars are hidden** on mobile in `ImpromptuStage` via `liveMetrics = speechSupported && !isMobileDevice()`. WPM/words only appear on the review screen once the recording is analysed.

### Difficulty tiers + topic bank (`src/data/impromptuTopics.ts`)
- `Difficulty = "Easy" | "Medium" | "Hard" | "News"`. **News** is the 4th tier (category `"Current Affairs"`, `PREP_TIME.News = 10`, sky-blue in the UI) — current-affairs / real-world-issue prompts that demand quick thinking + persuasion (role-play under pressure, hostile-audience persuasion, defend-the-counterintuitive, explain-to-an-outsider). Topics `n1`–`n23` live in `TOPIC_BANK`. Curated static bank, **not** API/LLM-generated (LLMs hallucinate fake news; a news-API + reframe pass was discussed but deferred).
- `ImpromptuSetup.tsx` difficulty styling is driven by lookup maps **`DIFF_STYLE`** (by color name) and **`DIFF_PILL`** (by level) — add new tiers there rather than extending nested ternaries. Selector grid is `grid-cols-2 md:grid-cols-4`.
- **No exhaustion safeguard:** `getRandomTopic` samples the pool randomly *with replacement* and never excludes seen topics; the `SEEN_KEY` "done" eye badge is cosmetic only. Completing all topics doesn't dead-end — it just recycles. A prefer-unseen-with-reset selection was discussed but not built.

### Live speech vs. recording path (mobile/tablet)
- Desktop runs live Web Speech recognition. Phones **and tablets** skip it (the mobile speech engine ignores `continuous = true`, auto-stops on silence, and the restart loop blinks the mic) — instead the audio is recorded and transcribed server-side after the turn. The branch is gated by `isMobileDevice()` (`src/lib/isMobileDevice.ts`).
- `isMobileDevice()` was hardened with a **capability-based fallback** beyond the UA list: a device is treated as touch-primary when the primary pointer is coarse **and** no fine pointer (mouse/trackpad) exists (`(pointer: coarse)` + `!(any-pointer: fine)` + `maxTouchPoints > 0`). This catches tablets the UA list missed (some Android builds, "request desktop site" mode) that were wrongly hitting the desktop path and showing the silence-triggered mic stop/start. Desktops (mouse) and touchscreen laptops (trackpad = fine pointer) are correctly excluded. **Known gap:** a non-Apple tablet used with an attached keyboard/trackpad exposes a fine pointer and would still slip through.

---

## Key components

### `src/context/FriendsContext.tsx`
Shared friends state. Must be inside `AuthProvider` + `ArenaProvider`. Provides `useFriends()`.

### `src/components/FriendsBadge.tsx`
Shows pending request count in the desktop header. Reads from `useFriends()` context.

### `src/components/DuelDrill.tsx`
Standard 1v1 drill with AI judge, ELO, scoring. Extracted from Arena.tsx.

### `src/components/DebateBattle.tsx`
Full turn-based debate with phase machine, Deepgram TTS, tab-discard recovery.

### `src/components/FloatingNodes.tsx`
Single `<canvas>` + RAF loop (7 nodes). Skips if `prefers-reduced-motion`.

### `src/components/MobileNav.tsx`
Bottom nav: Path, Lab, Arena, Friends (orange dot badge for pending requests), Profile. ThemeToggle at end. Hidden during battles via `timerActive`.

### `src/lib/events.ts`
Typed mitt emitters:
- `arenaEmitter` — `"elo:updated"`, `"arena:battle-result"`, `"arena:battle-forfeit"`, etc.
- `friendsEmitter` — `"friends:request-received"`, `"friends:request-accepted"`

### `src/lib/z.ts`
Z-index tokens: `bg=0`, `page=10`, `nav=20`, `arena=60`, `arenaHigh=80`, `panel=100`, `critical=150`, `duelActive=180`, `onboarding=200`, `tutorial=250`, `statusBar=9998`.

---

## Auth + onboarding

1. Sign up/login → `OnboardingModal` (6 steps)
2. Onboarding complete → `TutorialOverlay` checklist
3. Both dismissed permanently in Supabase `profiles`

**Dev console:**
```js
resetOnboarding()   // clears DB + localStorage, reloads
startTutorial()     // force-shows tutorial overlay
```

---

## Desktop layout (passive space-fill, lg: only)

- **Friends page** — `lg:grid-cols-[1fr_260px]` sidebar: your rank card + top-5 leaderboard + friend count
- **FriendProfile** — `lg:max-w-3xl`, profile card + stats in 2-col layout
- **Lab** — two extra ambient glow blobs (no layout changes)

---

## Known issues / gotchas

1. **`supabase/integrations/supabase/types.ts` not regenerated** — run `supabase gen types typescript` after applying migrations to get proper types for `friendships` + `friend_invites` and remove `(supabase as any)` casts.
2. **Cerebras models are reasoning models** — response text is in `message.reasoning`, not `message.content`. If Cerebras changes their API again, check `supabase/functions/ai-text/index.ts` at the Cerebras parser block.
3. **`CEREBRAS_API_KEY` must be set as a Supabase secret** (not just in `.env`). The `.env` value only reaches the frontend bundle; the edge function reads secrets: `supabase secrets set CEREBRAS_API_KEY=csk-...`.
4. **`"duel"` lesson type is scaffolded only** — DrillNode renders with Swords icon but no render branch in Pathway handles it. Wire `DuelDrill` before adding duel-type lessons.
5. **Orator tier is thin** — 3 drills only. Content definitions live in `usePathway.ts`.
6. **`src/integrations/gemini.ts`** — secondary wrapper; do not confuse with `geminiService.ts`.
7. **`speakWithDeepgramTTS` requires auth session** — throws if called while logged out.

---

## Pending work (priority order)

1. **Apply all pending DB migrations** (see Infrastructure section)
2. **Redeploy `ai-text` + `submit-battle-result`** edge functions
3. **Regenerate Supabase types** after migrations: `supabase gen types typescript > src/integrations/supabase/types.ts`
4. **Orator tier content** — add drills to "Take the Stage" chapter in `usePathway.ts`
5. **Wire `"duel"` lesson type** in Pathway
6. **UI overhaul Phase B** — button variants, SiteHeader redesign, card-premium migration

---

## Quick dev commands

```bash
npm install
npm run dev          # Vite dev server — usually :8080
npm run build        # Production build
npx tsc --noEmit     # Type-check (target: 0 errors)

# Deploy edge functions
npx supabase functions deploy ai-text
npx supabase functions deploy submit-battle-result

# Regenerate types after migrations
npx supabase gen types typescript > src/integrations/supabase/types.ts

# In browser console (after login on /pathway):
window.speakbold.help()

# In browser console (global):
resetOnboarding()
startTutorial()
```
