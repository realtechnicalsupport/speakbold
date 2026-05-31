# Plan — Coach-generated, runnable practice drills

**Decisions locked (approved):** dedicated dimension-aware `judgeCoachDrill` · in-place `CoachDrillRunner` modal · include the on-demand "New targeted drill" generator · coach drills target only the 5 audio dimensions (Body Language is nudged separately, never the drill focus).

**Goal:** let the AI Coach create *and run* its own practice targeting the user's weakest skills — a closed loop: diagnose → invent a tailored drill → practice it in-place → score it on the targeted dimension → feed the result back into the radar.

---

## The gap (why this isn't already done)
`generateAdaptivePlan()` **already invents tailored drills** — each `AdaptiveDrill` has a real custom `prompt`, a `targetDimension`, and a `durationSeconds` (built by `hydrateDrill`). But in `CoachHub` every drill is rendered as `<Link to={drill.trackUrl}>`, so **clicking it throws the coach's prompt away** and dumps the user in a generic track (Impromptu/Public Speaking) with that track's own setup and random topic.

So the coach can *think up* the right drill, but the user can never actually *do* it. Closing that loop is the whole feature.

---

## What to build

### 1. `CoachDrillRunner` — a self-contained practice modal *(new component)*
Modeled on the existing **`LessonDrill`** (Pathway), which already does exactly this pattern: show a prompt → `RecorderPanel` records → `transcribeAudio(blob)` → AI judge → score → `onComplete(score)`.

Flow: **intro** (the coach's prompt + target skill + duration) → **record** (timer) → **analyzing** → **result** (score on the target dimension + specific fix + model answer + "drill again / done").

On finish:
- `logSkillEvent({ source: "coach", scores, overall, meta })` → the radar/plan refresh immediately (event already wired).
- `markPracticed()` (streak) + optional `uploadRecording` (so it shows in the profile vault).
- A coach drill counts as a real scored session → also drives the **activation** beat we just built.

### 2. `judgeCoachDrill()` — dimension-aware scoring *(new in geminiService)*
Input: prompt, `targetDimension` (+ label), transcript, and client metrics we already compute (WPM, filler count, words).
Output: a score **focused on the targeted skill** + 1–2 concrete fixes for that dimension + a model answer.
Maps to a partial skill-event score (the target dimension primarily; pace/clarity can also be derived from the metrics via the existing `skillScoring` helpers).

### 3. `generateCoachDrill(profile, dimension?)` — on-demand single drill *(new in geminiService)*
A lighter `generateAdaptivePlan` that returns **one** fresh drill for a given (or the weakest) dimension. Powers a **"New targeted drill"** button so the coach can produce endless targeted practice, not just the 4 in "Today's session."

### 4. `CoachHub` wiring
- Each "Today's session" drill card → opens `CoachDrillRunner` (instead of the `<Link>` that discards the prompt).
- Add a **"New targeted drill →"** button near the session header.
- *(Optional)* keep a small "practice in the full track" secondary link for users who want the track's extra structure.

### 5. Plumbing
- Add `"coach"` to `SkillSource` (`skillEvents.ts`) and a `coachToDims(...)` mapping (`skillScoring.ts`).

---

## Design decisions (need your call)

**A. Scoring engine**
- **(Recommended) Dedicated `judgeCoachDrill`** — scores the *targeted* dimension specifically and gives fixes aimed at that skill. Sharper, on-point feedback (the whole premise is "according to your weakness"). One AI judge call per drill.
- **Reuse generic `judgePathwayDrill`** — returns an overall score; we derive pace/clarity from metrics. Cheaper/less code, but feedback isn't dimension-focused.

**B. UX**
- **(Recommended) Coach drill runs in-place** (modal), coach owns the loop end-to-end.
- Or keep routing to the full track but **pass the coach's prompt through** (less work, but you inherit each track's setup UI).

**C. On-demand "New targeted drill" button** — include now, or ship the runnable "Today's session" drills first and add on-demand later?

**D. The body-language dimension** — `delivery` is camera-only and can't be audio-drilled. If the weakest skill is Body Language, the coach drill should **route to the body-language track** instead of generating an audio prompt. (Confirm this carve-out.)

---

## Risks / notes
- **AI cost:** each coach drill = 1 transcription + 1 judge call, user-initiated and on-demand → acceptable.
- **Recording path:** reuse `RecorderPanel` + server `transcribeAudio` (works on desktop + mobile) rather than flaky live Web Speech.
- **Ties into prior work:** a coach drill is a `skill_event(source:"coach")`, so it feeds the radar and the cold-start activation automatically.

## Build sequence (once approved)
1. `judgeCoachDrill` + `generateCoachDrill` (geminiService), `coachToDims` + `"coach"` source.
2. `CoachDrillRunner` modal (reuse the LessonDrill record→transcribe→judge pattern).
3. Wire `CoachHub`: cards open the runner; add "New targeted drill"; body-language carve-out.
4. Verify the loop: do a coach drill → score lands → radar + plan update live.
