# SpeakBold — Demo Runbook (judges on phones/tablets)

## ⚠️ PRE-FLIGHT — do these BEFORE judging day

1. **Commit & push to GitHub** → triggers the Vercel deploy.
   Today's fixes (leaderboard hiding 0-ELO junk accounts, signup name validation) are **NOT live until you push**. The database side is already deployed, but the frontend isn't.
2. **Verify the live site after deploy**: open speakbold.vercel.app/leaderboard in an incognito tab — the board should show only real ranked players (Potassium, Zhi Hao Quah, etc.), no "Test User"/HTML-looking names.
3. **Create a clean demo account** (e.g. `naicdemo@...`) and play 2–3 Arena matches with it beforehand so it has an ELO, rank emblem, and battle history to show. Don't demo from an empty account.
4. **Seed the Growth Report**: log into your demo account, open the browser console, run `seedGrowthDemo()`, then check `/report` shows the baseline→latest curve. The Growth Report is your proof-of-learning trump card — make sure it has data.
5. **Test on the actual phone(s)** you'll hand to judges: mic permission prompt, speaker volume, brightness max, Do Not Disturb ON, battery > 80%.
6. If using a fixed booth device, enable kiosk mode: visit `/?retail=1` (it persists; `/?retail=0` to exit). It auto-resets after 60s idle so a wandering judge always finds a fresh screen.

---

## The golden path (≈5 minutes, in this order)

> Principle: **voice first, camera second, competition third.** Get the judge speaking within 60 seconds.

### 1. The hook — first drill (90s)
- Open the landing page → sign in with the demo account (or let them sign up — the goal-pick onboarding is fast).
- Go to **The Lab** → start an **Impromptu drill** (shortest, most reliable).
- Have the **judge themselves** speak for 30–60s on the prompt.
- While the AI is scoring, narrate: *"Right now it's transcribing with Whisper, then running through our judge pipeline — Groq first, with three fallbacks behind it."*
- Show the scored feedback: per-dimension scores, strengths, fixes.

### 2. The crown jewel — Body Language Lab (90s)
- Open the Body Language track. **Point at the privacy gate**: *"Everything runs on-device — MediaPipe pose and face tracking in the browser. Your camera is never recorded, never uploaded. Not even to us."*
- If the judge is camera-shy, use the built-in **camera-free preview** ("Show me how it works") — it exists exactly for this.
- Let them try 20 seconds of posture/gesture tracking. This is the moment judges remember.

### 3. The competition — Arena (90s)
- Show your demo account's **rank emblem + ELO** and the leaderboard.
- Start a **Debate battle vs AI persona** (pick Standard rounds — 45s/30s keeps the demo tight; mention the Extended toggle exists).
- If you have a second device + teammate: do a **live PvP debate** instead — two phones, turn-based, server-judged. This is the showstopper if logistics allow. (It needs both devices online and signed into different accounts — rehearse it once.)

### 4. The proof — Growth Report (45s)
- Open `/report` → Growth section: *"We keep your first recording as a baseline forever. This curve is this account's actual progression — we don't claim improvement, we plot it."*

### 5. Close (15s)
- Back to the leaderboard: *"81 learners, 504 drills, zero marketing. It's free, it's live, and it's yours to try after this session."*

---

## Fallback plans

| Failure | What you do |
|---|---|
| AI feedback is slow (>15s) | The UI shows the provider chain advancing ("Trying Groq… → OpenRouter…"). Narrate it as a feature: *"You're watching our resilience layer work."* It will land — four providers never all fail. |
| Mic permission denied | Settings → Site permissions → allow mic, reload. Rehearse the path on YOUR phone model beforehand. |
| Venue Wi-Fi dies | Switch to phone hotspot (pre-pair the demo devices with your hotspot BEFORE the session). |
| PvP duel won't connect | Don't debug live. Say *"realtime needs both devices on good network — let me show the AI debate instead"* and pivot. Never spend >20s troubleshooting in front of a judge. |
| Judge speaks very softly / venue is loud | Hold the phone closer; impromptu drills tolerate short answers. Worst case, you demo-speak yourself. |

## What NOT to do

- **Don't** open old test accounts — demo account only.
- **Don't** demo the placement test or full onboarding tour under time pressure — they're long.
- **Don't** start an Extended-rounds debate (90s openings) in a 6-minute slot.
- **Don't** troubleshoot anything for more than 20 seconds — pivot to the next wow moment.
- **Don't** leave the leaderboard visible before you've pushed the frontend fix.
