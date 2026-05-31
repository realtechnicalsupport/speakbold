# SpeakBold — "AI Coach" Flagship Feature Plan

**Decisions locked (approved):** Coach is the post-login home · 5-dimension v1 (body-language `delivery` deferred, shown as a faint "measure" spoke) · progress-history (`skill_history`) deferred to a later phase.

**Goal:** promote the buried adaptive-plan card into the app's centerpiece — a personalized AI speaking coach — without throwing away the Pathway. Written for the competition: maximize the "adaptive / personalized intelligence" story while keeping it demoable on a fresh account.

---

## 0. The pitch (one sentence)
> SpeakBold records you, scores your speaking across **6 skill dimensions**, diagnoses your specific weaknesses, and generates a **personalized training plan that adapts as you improve** — a real coach, not a fixed course.

This is the differentiator. Right now it renders as a single card in a profile tab.

---

## 1. What already exists (assets — don't rebuild)
| Piece | File | What it does |
|---|---|---|
| Skill engine | `src/lib/skillProfile.ts` | Pure function: 6 dimensions, rolling window (10), averages, **trend** (improving/declining + delta), staleness, weakest/strongest, cold-start. |
| Profile hook | `src/hooks/useSkillProfile.ts` | Reads last 30 `recording_feedback.scores` + `profiles.weaknesses`, recomputes on `feedback-saved` event. |
| Plan generator | `src/services/geminiService.ts` → `generateAdaptivePlan()` | AI-generates headline + rationale + **4 targeted drills** (prompt, dimension, duration). Has `fallbackPlan`. |
| Plan hook | `src/hooks/useAdaptivePlan.ts` | Persists to `skill_snapshots`; **smart regen gate** (only re-calls AI when weakest skill changes, moves ≥10 pts, or graduates cold-start). |
| Current UI | `src/components/TailoredPlanCard.tsx` | The card — skill bars + recommended drills. Buried in Profile. |

The engine is genuinely good. The work is **surfacing + visualizing + ritualizing** it, plus two real data gaps below.

---

## 2. ⚠️ De-risk the data FIRST (before any UI)
Two issues that will undermine the feature if not addressed:

### 2a. The 6th dimension (`delivery` / Body Language) is never scored by audio
`analyze-recording/index.ts` only emits **5** scores: `content_quality, clarity, pace, structure, confidence`. **No `delivery`.** That dimension can only come from the webcam / body-language track.
- **Verify:** does `/tracks/body-language` write a `recording_feedback` row with a `delivery` score? (Check `BodyLanguageReport` / its save path.)
- **Decision:**
  - **(A)** Wire body-language to write `scores.delivery` → full 6-spoke radar. *(More work, complete story.)*
  - **(B)** Ship **v1 as a 5-dimension model**, show `delivery` as a faint "Record a body-language drill to measure" spoke with a CTA. *(Recommended for speed; honest; drives users into the camera track.)*

### 2b. Cold-start vs. a 2-minute demo
`MIN_SAMPLES = 3` → a fresh account (every judge) is in cold-start: the plan leans on **self-reported** onboarding weaknesses, and the radar has no measured data. The adaptive magic isn't visible until ≥3 scored recordings.
- **Decision (demo strategy):** see §7. At minimum, design the cold-start state to be impressive, and make "record 1 drill → a real score lands → radar + plan visibly update" a deliberate onboarding beat.

### 2c. No history → no "progress over time"
`skill_snapshots` is **one row per user** (`upsert onConflict user_id`). There's **no time-series**, so "Clarity +12 this week" / trajectory charts can't be built from it today. `skillProfile` only computes a single current snapshot.
- **Decision:** add a lightweight append-only `skill_history` (one row per day or per regeneration: `user_id, day, dimension_averages jsonb, overall`) to chart trajectory. This is the main *new* data work. (Alternative: derive weekly deltas on-the-fly from `recording_feedback` timestamps — cheaper, less flexible.)

---

## 3. Information architecture — Coach vs Pathway (don't merge, layer)
| | **Pathway** (keep) | **Coach** (new hero) |
|---|---|---|
| Role | Foundations / structured course | Daily personalized training |
| Strength | Solves cold-start, gamified progression, **generates the data** | Adaptive, addresses *your* weaknesses |
| Audience | New users, "teach me from zero" | Returning users, "what do I do today" |
| Relationship | Feeds the Coach | Can route *into* Pathway lessons |

**Routing & nav:**
- Add `Route path="/coach"` in `App.tsx` (under `RequireAuth`).
- **Post-login landing → `/coach`** (change `Login.tsx` `redirectTo` default from `/pathway`; update Hero's "Continue learning" target). Coach becomes home base.
- **Nav:** add "Coach" to `SiteHeader` `NAV` (currently Pathway / The Lab / Practice Lounge) and `MobileNav` `NAV_ITEMS` (currently Path / Lab / Arena / Friends / Profile + ThemeToggle).
  - ⚠️ Mobile pill is already 5 icons + toggle — 6 is tight. Recommendation: make **Coach the prominent left-most/center item**, and consider moving Profile access to the avatar in the header on mobile, or grouping Lab under Coach. Decide during Phase 1.

---

## 4. The `/coach` page composition
1. **Hero** — "Today, {name}" + overall average + the focus headline (`plan.headline`) and `plan.rationale`.
2. **Skill radar (hexagon)** — the 6 dimensions at a glance; faint spokes for dims with no data (`sampleCount === 0`). The signature visual.
3. **Today's session** — the adaptive `plan.drills` as the primary CTA list (already routed via `trackUrl`). Completion ties into the streak + a finish moment. This is the daily ritual.
4. **Progress over time** — trend chips ("Clarity +12 this week"), per-dimension sparklines, overall trajectory *(requires §2c history)*.
5. **Cold-start state** — provisional plan from onboarding self-report + a single prominent "Record your first drill to unlock your diagnosis."

Reuse `TailoredPlanCard`'s skill-bar + drill-row pieces; the radar + progress + ritual are the net-new UI.

---

## 5. Build sequence (phased, each shippable)
- **Phase 0 — De-risk** (§2): verify `delivery` path, pick 5-vs-6-dim, decide history approach + demo strategy. *(No/low code.)*
- **Phase 1 — Surface it:** `/coach` route + nav entries + post-login landing; move the existing plan UI into the page. **Biggest visibility win, lowest risk.**
- **Phase 2 — Radar:** 6-dimension radar component (handles empty spokes).
- **Phase 3 — Ritual + progress:** "Today's session" completion loop + streak tie-in; `skill_history` table + trajectory/sparklines.
- **Phase 4 — Handoff:** Coach recommends Pathway lessons where relevant; Pathway/track completion nudges back to Coach ("new data — your plan updated").
- **Phase 5 — Demo polish:** seeded demo account + the cold-start "record 1 → radar appears" beat.

---

## 6. Competition / demo strategy (§7 detail)
A judge sees a fresh account. The arc to script:
1. Onboarding self-report → **provisional** radar + plan appear immediately (no empty screen).
2. "Record one 60-second drill" → real AI scores land → **radar fills + plan visibly re-targets** (the adaptive moment).
3. For "progress over time," use a **seeded demo account** with a week of history so the trajectory chart is populated.

The whole pitch lives or dies on making the adaptive loop *visible fast*. Budget real effort here.

---

## 7. Open decisions (need your call before Phase 1)
1. **Name:** "Coach" / "Today" / "Train"? *(Recommend "Coach".)*
2. **Post-login home:** make `/coach` the landing (demote Pathway as the first screen)? *(Recommend yes.)*
3. **Dimensions:** ship 5-dim v1 (defer `delivery`) or wire body-language now? *(Recommend 5-dim v1 with a "measure body language" CTA.)*
4. **Progress history:** build `skill_history` now (richer demo) or defer to after Phase 1?
5. **Mobile nav:** how to make room for Coach (6th item)?

---

## 8. Risks
- **AI cost:** mitigated — regen gate already prevents per-recompute calls.
- **`delivery` gap:** decision 3 above.
- **History storage:** decision 4 above.
- **Nav crowding:** decision 5 above.
- **Cold-start in demos:** §6 — the biggest experiential risk.

---

## 9. Phase 6 — Coach-native practice (the AI makes & runs its own drills)

**Goal:** the Coach stops merely *routing* you to other tracks — it generates a drill for your weakest dimension, **runs it inside the Coach** (record → transcribe → dimension-focused AI judge → feedback), and feeds the result straight back into your skill profile as a `source: "coach"` event. The whole improve-loop closes inside the Coach.

### Already exists (reuse — don't rebuild)
- `generateAdaptivePlan` → `AdaptiveDrill[]` with `prompt`, `targetDimension`, `durationSeconds`, `rationale`. **Generation half is done.**
- `coachToDims(...)` + the `"coach"` source in `skillEvents.ts` — the normalizer for a coach drill (target dim from the judge + pace/clarity derived from the same speech). **Scaffolding already in place.**
- `RecorderPanel` + `transcribeAudio` + the `LessonDrill` runner pattern (phases `idle → recording → analyzing → results`, TTS coach voice, retry, mic-error guards).
- `useSkillProfile` already merges `skill_events`, so a finished coach drill **moves the radar immediately** + fires the celebration on first activation.

### New pieces to build
1. **`judgeCoachDrill(prompt, transcript, dimension, durationSeconds)`** in `geminiService` — a *dimension-focused* judge returning `{ score, feedback, strengths, improvement, exampleLine }`. The rubric shifts per target dimension:
   - Clarity → filler words / articulation / concision
   - Structure → opening · throughline · close
   - Confidence → assertiveness vs hedging
   - Message Quality → substance / specificity
   - Pace → handled numerically from WPM (not the LLM)
   Mirrors `judgePathwayDrill` but targeted; deterministic fallback on failure.
2. **`<CoachDrill>`** — a self-contained modal runner modeled on `LessonDrill`: shows the AI prompt + target-skill badge, records for `durationSeconds`, transcribes, calls `judgeCoachDrill`, shows focused feedback (+ optional TTS). On finish:
   - `logSkillEvent({ source: "coach", scores: coachToDims({ score, targetDimension, wpm, fillerCount, totalWords }), overall, meta })`
   - `markPracticed()` (streak) + optional recording upload.
3. **Launch from CoachHub** — "Today's session" rows open `<CoachDrill>` **in-coach** instead of routing to a track. (If `targetDimension === "delivery"`, route to the **camera** track instead — audio can't score body language.)
4. **(Optional) On-demand generation** — a *"Give me another {dimension} drill"* button → `generateCoachDrill(dimension, profile)` (single-drill variant) → opens `CoachDrill` immediately. Unlimited targeted practice on tap.

### Data flow
weakest dimension → AI prompt → `CoachDrill` records → `transcribeAudio` → `judgeCoachDrill` (dimension-focused score) → `coachToDims` → `skill_events(source: coach)` → `useSkillProfile` merge → radar + plan update.

### Decisions to confirm (before building)
1. **Judge:** new dimension-focused `judgeCoachDrill` *(recommended — sharper, on-target feedback)* vs reuse the generic `judgePathwayDrill`.
2. **Routing:** replace the plan rows' track-routing with the in-coach `CoachDrill` run *(recommended)* — keep an "open full track" secondary link, or drop it?
3. **On-demand generator** (`generateCoachDrill` + "another drill" button): build now or defer?
4. **`delivery` target** → route to the camera/body-language track *(recommended)* since an audio drill can't measure it.

### Risks
- Each coach drill = 1 transcription + 1 judge call (cost/latency) — same envelope as existing drills.
- Mic permission / no-speech → reuse `LessonDrill`'s guards.
- Pace/clarity need WPM + filler counts: desktop live Web Speech gives them directly; mobile derives from the transcribed text (mirror impromptu).

### Build sequence
`judgeCoachDrill` + fallback → `<CoachDrill>` runner → wire CoachHub rows (delivery → camera) → log `skill_event(source: coach)` → *(optional)* `generateCoachDrill` + "another drill" button.
