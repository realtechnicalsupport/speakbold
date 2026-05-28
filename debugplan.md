# SpeakBold — Debug Plan (User-Facing Bugs)

Bugs ranked by **user pain × frequency**. Tackle top-down; each block is self-contained so you can stop after any item and the app is better off.

Scope: user-experienceable bugs only. Security/architecture (leaked API keys, client-authoritative ELO, no route protection) are tracked separately — come back to those later.

---

## P0 — Catastrophic (visible the first time the user tries the core feature)

### [ ] 1. Mic indicator stays on after recording ends
**File:** [src/hooks/useRecorder.ts:167-179](src/hooks/useRecorder.ts:167)
**Bug:** Unmount cleanup revokes the blob URL but doesn't call `stop()` on the MediaRecorder or release the mic stream. OS-level mic light and browser tab recording dot stay on after the user navigates away.
**Fix:**
- In the unmount cleanup, always call `mediaRecorderRef.current?.stop()` if state is `recording` or `paused`
- Always call `streamRef.current?.getTracks().forEach(t => t.stop())`
- Always call `setRecordingActive(false)`
- Don't guard on `state` — cleanup must be unconditional
**Verify:** Start recording in any track, browser-back, confirm tab indicator + OS mic icon go off within ~500ms.

### [ ] 2. App opens the mic twice (recorder + visualizer)
**Files:**
- [src/components/MicrophoneBorder.tsx:18-51](src/components/MicrophoneBorder.tsx:18) (visualizer stream)
- [src/hooks/useRecorder.ts:64-95](src/hooks/useRecorder.ts:64) (recording stream)

**Bug:** `MicrophoneBorder` opens its own `getUserMedia` to drive the audio-amplitude glow, in parallel with the actual recorder. Double mic icons, double CPU, possible echo because the visualizer stream has no `echoCancellation`.
**Fix (preferred):** Expose the recorder's `MediaStream` via a shared store (extend `recordingState.ts`) and have `MicrophoneBorder` build its `AnalyserNode` from that same stream. No second `getUserMedia` call.
**Fix (fallback):** Drop the live visualizer entirely on mobile (`useMediaQuery`) and use a CSS-only pulse animation when `isRecording === true`.
**Verify:** During an Arena debate, browser tab should show ONE recording badge, not two. Macbook camera/mic green-dot count = 1.

### [ ] 3. DebateBattle opens a third mic stream just to "check permission"
**File:** [src/components/DebateBattle.tsx:177-181](src/components/DebateBattle.tsx:177)
**Bug:** `useEffect` calls `getUserMedia({ audio: true })` then immediately stops the tracks, only to set the `micError` flag. Combined with #2, three concurrent streams cause `NotReadableError` on some macOS/Windows configs.
**Fix:** Replace with the Permissions API:
```ts
navigator.permissions.query({ name: "microphone" as PermissionName })
  .then(p => setMicError(p.state === "denied"))
  .catch(() => setMicError(false));
```
Fall back to the existing probe ONLY if Permissions API is unavailable (older Safari).
**Verify:** Open a debate cold; no extra mic-permission prompt fires, no third stream opens.

### [ ] 4. Bad-mic user gets fake loss + no record of the match
**File:** [src/components/DebateBattle.tsx:589-601](src/components/DebateBattle.tsx:589) and [:668-681](src/components/DebateBattle.tsx:668)
**Bug:** When the user's combined transcript is <20 chars, the UI shows a 0-50 fake loss but never calls `completeDuel`. Same for the AI-judge-unreachable catch branch. Match leaves no record; ELO neither subtracted nor preserved.
**Fix options (pick one):**
- **A (better UX):** Treat "no speech captured" as a *non-counting* outcome — change copy to "Match voided — your speech wasn't captured. No ELO change." and skip `completeDuel` AND skip the fake score. Show a "Try again" button instead of "Back to Arena."
- **B (consistent record):** Always call `completeDuel` even on the bail-out branches. Pass a `voided: true` flag so ELO logic knows to skip the rating change but still write the row.

Recommend A — users with broken mics shouldn't be punished, but they also shouldn't see fabricated opponent scores.
**Verify:** Mute the system mic, start a debate, run out the clock. End-screen says "voided," profile/history shows no new row, ELO unchanged.

---

## P1 — Severe (hits regularly during normal use)

### [ ] 5. Refresh during a debate loses transcripts
**File:** [src/components/DebateBattle.tsx:99-129](src/components/DebateBattle.tsx:99)
**Bug:** Session-restore reconstructs `phase` and `phaseStartRef` but `transcripts` resets to `{}`. Refresh mid-rebuttal → opening is gone → judge has nothing to score.
**Fix:**
- Persist `transcripts` to `sessionStorage.setItem("debate_transcripts", JSON.stringify(transcripts))` inside the existing setter effect
- On mount, hydrate `useState(transcripts)` from that key
- Clear it in the same effect that clears `debate_phase` at [:687-688](src/components/DebateBattle.tsx:687)
- ALSO clear all three keys on forfeit/abandon (currently only "results" path clears them — see #16)
**Verify:** Start a debate, finish your opening, refresh during opponent's opening, complete the rebuttal. Final transcript view shows all four turns.

### [ ] 6. Sign-out wipes settings for other users on the same device
**File:** [src/context/AuthContext.tsx:117](src/context/AuthContext.tsx:117)
**Bug:** `localStorage.clear()` blows away all `speakbold:*` keys for everyone who's ever logged in on this browser.
**Fix:** Replace with targeted removal:
```ts
const signOut = useCallback(async () => {
  const uid = session?.user?.id;
  await supabase.auth.signOut();
  if (uid) {
    Object.keys(localStorage)
      .filter(k => k.endsWith(`_${uid}`) || k.startsWith(`sb-`))  // user-scoped + supabase
      .forEach(k => localStorage.removeItem(k));
  }
}, [session]);
```
**Verify:** User A signs in, sets dark mode + completes onboarding. User B signs in on same browser, signs out. User A signs back in — dark mode and onboarding still done.

### [ ] 7. Speech recognition restarts forever on revoked mic
**File:** [src/components/DebateBattle.tsx:270-286](src/components/DebateBattle.tsx:270)
**Bug:** `onerror` ignores `"not-allowed"` and `onend` unconditionally restarts. Result: silent infinite retry loop, user sees no transcript, no error.
**Fix:**
- In `onerror`, if `e.error === "not-allowed"` or `"service-not-allowed"`: set a new `micRevoked` state, surface a toast ("Microphone access blocked — check browser settings"), and set a flag that prevents the `onend` restart
- In `onend`, bail out early if that flag is set
**Verify:** Block mic permission mid-debate via address-bar lock icon. User sees a clear toast, no console spam, no restart loop.

### [ ] 8. AI fallback speech ignores the persona skill tier
**File:** [src/components/DebateBattle.tsx:418-426](src/components/DebateBattle.tsx:418)
**Bug:** When `generateAIArgument` throws, fallback templates are all confident-orator text. Picking "Echo" (Beginner) and hitting a fallback → user faces Cicero.
**Fix:** Make `makeFallback()` aware of `opponent.persona?.skill`:
- Build three tiered pools (`beginnerPool`, `intermediatePool`, `expertPool`)
- Beginner pool: short, repetitive, one filler ("I mean, …"), single weak reason
- Intermediate pool: current templates, slightly simplified
- Expert pool: current templates as-is

Select pool by skill before random-picking.
**Verify:** Disable network, start an "Echo" debate. The fallback speech sounds like a hesitant beginner, not a TED speaker.

### [ ] 9. Silent 20s waits while AI provider chain falls through
**File:** [src/services/geminiService.ts:134-143](src/services/geminiService.ts:134) and consumers in `DebateBattle.tsx`, `Pathway.tsx`, `DuelDrill.tsx`
**Bug:** Groq → OpenRouter → Cerebras → Gemini, each ~3-5s. User stares at "AI IS WEIGHING THE ARGUMENTS" for up to 20s with no progress signal.
**Fix:**
- Add a per-provider timeout (`AbortController` with 6s budget) so total worst-case is bounded
- Emit an event after each failed provider; let `DebateBattle.runJudging` update `analyzeText` ("Trying backup provider…")
- Add `pace = "fast" | "patient"` to `callAI` — judging can wait, but autocomplete-style flows should fail fast
**Verify:** Set all AI keys to invalid temporarily. Spinner text changes 2-3 times before final error. Final error toast appears within ~12s, not 25s.

---

## P2 — Major (UX papercuts every session)

### [ ] 10. AI audio can desync from streamed text by tens of seconds
**File:** [src/components/DebateBattle.tsx:481-497](src/components/DebateBattle.tsx:481) and [:538](src/components/DebateBattle.tsx:538)
**Bug:** When `audio.duration === Infinity` (some MP3 streams), code falls back to `cfg.duration` (45s). Text crawls over 45s while audio finishes in 8s. `onended` then jumps to next phase before user sees full text.
**Fix:**
- On `audio.ended`, force `setAiStream(argument)` to flush the full text before calling `autoAdvance()`
- Add a `progress` listener: as `audio.currentTime` advances, recompute `estimatedDurationMs` if we now have a real duration
- Wait at least 250ms after the text reaches `argument.length` before auto-advancing, so the last word is readable
**Verify:** Force a debate, observe full text stays visible for at least a beat after audio ends.

### [ ] 11. Autoplay-blocked AI turn gets skipped instantly
**File:** [src/components/DebateBattle.tsx:543-549](src/components/DebateBattle.tsx:543)
**Bug:** `audio.play()` rejection (autoplay blocked) calls `autoAdvance()` immediately. AI's opening is never shown OR heard. Phase jumps to the next turn.
**Fix:** On `audio.play()` rejection, fall through to the browser `SpeechSynthesis` branch (which doesn't require a user gesture in most cases). Only `autoAdvance` if BOTH paths fail. Also show a one-time toast "Tap anywhere to enable audio" so subsequent rounds work.
**Verify:** Hard-refresh into a debate without interacting first. Either Deepgram plays, or SpeechSynthesis plays, or text scrolls fully — never skips.

### [ ] 12. Unauthed visitors see broken authed pages flash
**File:** [src/App.tsx:109-130](src/App.tsx:109)
**Bug:** No route protection. `/profile`, `/arena`, `/lab` mount, fire queries, flash empty placeholders, then individual pages decide what to do (or don't).
**Fix:** Add a minimal `<RequireAuth>` wrapper:
```tsx
const RequireAuth = ({ children }) => {
  const { session, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
};
```
Wrap protected routes: `<Route path="/arena" element={<RequireAuth><Arena /></RequireAuth>} />`. Public routes (`/`, `/login`, `/pitch`, `/reset-password`) stay un-wrapped.
**Verify:** Log out, paste `/arena` URL — immediate redirect to `/login`, no flash.

### [ ] 13. "Remember me" is a dead checkbox-that-isn't-there
**File:** [src/pages/Login.tsx:21](src/pages/Login.tsx:21)
**Bug:** `rememberMe` state declared, never bound to UI, never passed anywhere. Session always persists.
**Fix (choose one):**
- **Delete:** Just remove the `useState` line. The session-persists-always behavior is fine; no UI lies.
- **Implement:** Add an actual checkbox, and pass through to Supabase by switching auth storage to `sessionStorage` when unchecked (requires re-creating the supabase client — non-trivial). Recommend Delete unless you specifically need this.
**Verify:** Lint passes, no unused-var warning.

### [ ] 14. All XP rewards are 5 regardless of difficulty
**File:** [src/lib/xp-system.ts:1-10](src/lib/xp-system.ts:1)
**Bug:** Every value in the dict is 5. Users grinding Easy get same XP as Hard.
**Fix:** Pick meaningful values, e.g.:
```ts
export const XP_REWARDS = {
  easy: 5, medium: 10, hard: 20,
  interview: 12, "body-language": 10,
  impromptu: 8, "public-speaking": 10,
} as const;
```
Audit consumers to confirm the lookup keys match the difficulty strings actually passed in. (Quick grep: `XP_REWARDS[` across `src/`.)
**Verify:** Complete an Easy and a Hard drill back-to-back; XP notification numbers differ.

### [ ] 15. `window.debugWin()` shipped to production
**File:** [src/pages/Arena.tsx:117-142](src/pages/Arena.tsx:117)
**Bug:** Devtools-accessible auto-win function. Anyone can ELO-cheat in one line.
**Fix:** Gate the entire effect on `import.meta.env.DEV`:
```ts
useEffect(() => {
  if (!import.meta.env.DEV) return;
  // ...existing debugWin registration
}, [activeDrill, completeDuel, user]);
```
**Verify:** `npm run build && npm run preview` — `window.debugWin` is `undefined` in the built preview.

### [ ] 16. Stale debate sessionStorage hijacks the next match
**File:** [src/components/DebateBattle.tsx:684-690](src/components/DebateBattle.tsx:684) and [src/pages/Arena.tsx:74-76](src/pages/Arena.tsx:74)
**Bug:** Forfeit / close-tab paths don't clear `debate_phase` / `debate_phase_start`. Next battle restores into the wrong phase.
**Fix:**
- Move the sessionStorage cleanup into a shared helper `clearDebateStorage()` that removes all four keys (`debate_phase`, `debate_phase_start`, `debate_transcripts`, `arena_debate_config`)
- Call it in:
  - The existing `phase === "results"` effect
  - The forfeit `onClick` at [DebateBattle.tsx:1000-1018](src/components/DebateBattle.tsx:1000)
  - The unmount cleanup at [DebateBattle.tsx:693-699](src/components/DebateBattle.tsx:693), but ONLY if `isClosingRef.current === true` (user intentionally left)
- Also clear on `handleAbandonConfirm` paths
**Verify:** Start debate → forfeit → start new debate on different topic. New debate begins at "prep," not mid-rebuttal.

---

## P3 — Moderate (quality, polish, lower frequency)

### [ ] 17. Device-pinning makes mic-switching fragile
**Files:** [src/hooks/useRecorder.ts:83-95](src/hooks/useRecorder.ts:83), [src/components/MicrophoneBorder.tsx:20-31](src/components/MicrophoneBorder.tsx:20)
**Fix:** Convert saved `deviceId` constraints from `exact` to `ideal`. `ideal` will silently fall back to the default device instead of throwing `OverconstrainedError`. Single place to change in both files. Becomes moot if #2 is done (single stream).
**Verify:** Save mic device, unplug, start recording — succeeds on default mic with no errors.

### [ ] 18. AICoachChat FAB permanently obscures bottom-right content
**File:** [src/components/AICoachChat.tsx:37-50](src/components/AICoachChat.tsx:37)
**Fix:**
- Hide while `useTimerActive()` is true (you already hide MobileNav this way in App.tsx)
- Add a small "X" hint that hides it for the session (sessionStorage flag)
- On mobile, move it up so it doesn't collide with the mobile nav pill (it currently uses `bottom-24 lg:bottom-8` — verify against actual nav-pill height including safe-area)
**Verify:** During a timed drill, FAB is hidden. After dismissing it once, it stays hidden until tab close.

### [ ] 19. Console banner mojibake
**File:** [src/App.tsx:53-70](src/App.tsx:53)
**Fix:** The `Γ£┤` chars are a UTF-8 ✓ misread as Windows-1252. Either:
- Replace with literal `✓` written directly in the source (file is UTF-8 — confirm with `file -I src/App.tsx`)
- Or replace with plain text: `"[OK] User Progress: ..."`
- Or delete the console.log entirely; few users see it
**Verify:** Reload page, devtools console shows readable text.

### [ ] 20. Pause clock jumps on resume
**File:** [src/hooks/useRecorder.ts:138-155](src/hooks/useRecorder.ts:138) and the elapsed tick at [:127-129](src/hooks/useRecorder.ts:127)
**Fix:** The interval at line 127 already uses `pauseDurationRef.current` correctly, so the underlying math is right. But the tick *keeps running* during pause, just computing the same value. Cleaner: also clear `tickRef.current` on pause, restart on resume. Reduces battery and removes the chance of a 1-tick jump from JS macrotask lag.
**Verify:** Record 5s, pause 10s, resume, record 5s more. Final elapsed reads exactly 10s ± 100ms.

### [ ] 21. Mic permission re-prompts on every track page mount
**File:** [src/components/RecorderPanel.tsx:43-46](src/components/RecorderPanel.tsx:43)
**Fix:** Before calling `requestPermission()`, check `useMicPermission().permission` — only request if `=== "prompt"` AND we haven't asked in this session (track via a module-level boolean or sessionStorage flag).
**Verify:** Visit /tracks/impromptu, allow mic. Navigate to /tracks/public-speaking and back. No re-prompt.

### [ ] 22. Empty/malformed debate prompt silently becomes "FOR"
**File:** [src/services/geminiService.ts:328-337](src/services/geminiService.ts:328)
**Fix:** When neither "AGAINST" nor "FOR" appears in the prompt, log `console.warn("[AI] debate stance missing from prompt — defaulting to FOR")` AND surface a soft signal (return value flag) so the caller can decide. At minimum no silent same-side debates.
**Verify:** Pass a malformed debate prompt; console warns; behaviour is consistent and debuggable.

### [ ] 23. Forfeit dialog doesn't disclose the ELO penalty
**File:** [src/components/DebateBattle.tsx:995-997](src/components/DebateBattle.tsx:995)
**Fix:** Change copy to:
> "Leaving mid-debate counts as a forfeit. You'll lose **30 ELO** and your AI opponent wins by default."

Pull `30` from `FORFEIT_PENALTY` import so it stays in sync.
**Verify:** Open the forfeit dialog, copy includes "30 ELO."

---

## Out of scope (covered separately — DO NOT touch in this batch)

- API key leakage in client bundle ([src/services/geminiService.ts:11-17](src/services/geminiService.ts:11)) — needs migration to existing `supabase/functions/ai-text` edge function
- Client-authoritative ELO writes ([src/context/ArenaContext.tsx:91-120](src/context/ArenaContext.tsx:91)) — needs server-side validation
- Prompt-injection vulnerability in AI judge ([src/services/geminiService.ts:419](src/services/geminiService.ts:419)) — needs transcript sanitization layer
- Duplicate `generateInterviewQuestions` etc. in `integrations/gemini.ts` vs `services/geminiService.ts` — cleanup, not user-facing

---

## Suggested batching for PRs

1. **PR 1 — Microphone hygiene** (#1, #2, #3, #17, #21) — all mic-stream issues, single review surface
2. **PR 2 — Debate state correctness** (#4, #5, #16) — session-state + voided-match handling
3. **PR 3 — AI flow resilience** (#7, #8, #9, #10, #11, #22) — recognition + provider chain + audio sync
4. **PR 4 — Account hygiene** (#6, #12, #13) — auth + localStorage scoping + route protection
5. **PR 5 — Polish** (#14, #15, #18, #19, #20, #23) — small, mostly one-line fixes

Each PR independently shippable.
