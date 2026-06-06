import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Swords, Eye, Compass, GraduationCap, Sparkles, Hand } from "lucide-react";
import { useRetailMode, RETAIL_IDLE_MS, RETAIL_HOME } from "@/lib/retailMode";
import { setTimerActive } from "@/lib/timerState";
import { setRecordingActive } from "@/lib/recordingState";

/**
 * Retail / kiosk shell. Renders nothing unless the device is in retail mode
 * (see @/lib/retailMode). When on, it:
 *
 *   1. Watches for inactivity. After RETAIL_IDLE_MS with no touch/key/pointer
 *      activity it raises the attract loop.
 *   2. Boots straight into the attract loop, so a freshly-set-up kiosk shows
 *      the showcase rather than whatever page was last open.
 *   3. The attract loop is a self-advancing showcase that INTRODUCES the app —
 *      what it is, what it does, why it matters, and how it advances UN
 *      Sustainable Development Goal 4 (Quality Education) — then invites a tap.
 *   4. On tap (anywhere), performs a full reset for the next visitor — clears
 *      the previous person's in-progress drill/debate + scratch session state,
 *      drops any recording/timer locks, and returns to the seeded demo home.
 *
 * The overlay sits above everything (incl. the z-[180]/[190] duel + debate
 * screens) so an abandoned mid-match session is always covered and wiped
 * before the next person arrives.
 */

const SDG4_RED = "#c5192d"; // official UN SDG 4 brand colour

/** How long each showcase slide holds before auto-advancing. */
const SLIDE_MS = 5500;

type Slide = { id: string; render: () => JSX.Element };

const SLIDES: Slide[] = [
  // ── 1 · Identity / hook ────────────────────────────────────────────────────
  {
    id: "brand",
    render: () => (
      <div className="flex flex-col items-center text-center">
        <motion.img
          src="/favicon.svg"
          alt=""
          aria-hidden
          className="w-20 h-20 md:w-28 md:h-28 mb-8"
          animate={{ rotate: [0, 360], scale: [1, 1.08, 1] }}
          transition={{
            rotate: { duration: 28, repeat: Infinity, ease: "linear" },
            scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
          }}
        />
        <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.5em] text-primary/70 mb-5">
          SpeakBold
        </p>
        <h1 className="speak-serif text-3xl md:text-6xl italic leading-tight tracking-tight max-w-4xl">
          Make the room lean in<br className="hidden md:block" /> when you speak
        </h1>
        <p className="mt-6 text-sm md:text-lg font-medium opacity-50 max-w-md">
          AI-powered public-speaking training that fits in your pocket.
        </p>
      </div>
    ),
  },

  // ── 2 · What it does ───────────────────────────────────────────────────────
  {
    id: "features",
    render: () => (
      <div className="flex flex-col items-center text-center w-full max-w-2xl">
        <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-primary/60 mb-3">
          What it does
        </p>
        <h2 className="speak-serif text-3xl md:text-5xl italic mb-10">
          Practice. Get scored. Improve.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 w-full">
          {[
            { icon: Mic, title: "Impromptu drills", desc: "Think on your feet, on demand" },
            { icon: Swords, title: "Practice Lounge", desc: "Duel an AI — or a real person" },
            { icon: Eye, title: "Body Language", desc: "Live posture & eye-contact AI" },
            { icon: Compass, title: "Guided Pathway", desc: "Beginner to orator, step by step" },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm px-5 py-4 text-left"
            >
              <div className="h-11 w-11 shrink-0 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black uppercase tracking-wide">{title}</p>
                <p className="text-xs opacity-50 leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ── 3 · Why it matters / benefit ───────────────────────────────────────────
  {
    id: "benefit",
    render: () => (
      <div className="flex flex-col items-center text-center max-w-2xl">
        <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-primary/60 mb-3">
          Why it matters
        </p>
        <h2 className="speak-serif text-3xl md:text-5xl italic mb-6">
          Your voice is your edge
        </h2>
        <p className="text-base md:text-xl font-medium opacity-70 leading-relaxed mb-10">
          Communication decides interviews, leadership, and influence — yet it's
          rarely taught. SpeakBold turns every spare minute into real, scored
          practice with instant AI feedback.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {["Instant AI feedback", "Measurable progress", "Practise anywhere"].map(chip => (
            <span
              key={chip}
              className="px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-[10px] md:text-xs font-black uppercase tracking-widest text-primary"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
    ),
  },

  // ── 4 · UN SDG 4 — Quality Education ───────────────────────────────────────
  {
    id: "sdg4",
    render: () => (
      <div className="flex flex-col items-center text-center max-w-2xl">
        <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] mb-6 opacity-60">
          United Nations · Global Goals
        </p>
        {/* SDG 4 badge */}
        <div
          className="flex items-center gap-4 rounded-2xl px-6 py-4 mb-8 text-white shadow-xl"
          style={{ backgroundColor: SDG4_RED }}
        >
          <span className="speak-serif text-5xl md:text-6xl font-black italic leading-none">4</span>
          <div className="text-left leading-tight">
            <GraduationCap className="h-6 w-6 mb-1" strokeWidth={2} />
            <p className="text-sm md:text-base font-black uppercase tracking-wide">
              Quality<br />Education
            </p>
          </div>
        </div>
        <h2 className="speak-serif text-2xl md:text-4xl italic mb-5 leading-snug">
          Communication skills for everyone — free, and without barriers
        </h2>
        <p className="text-base md:text-lg font-medium opacity-70 leading-relaxed">
          SpeakBold advances <span className="font-bold" style={{ color: SDG4_RED }}>SDG&nbsp;4</span>:
          no tutor, no cost, no gatekeeping. Equitable, inclusive practice that
          makes lifelong learning possible — one speech at a time.
        </p>
      </div>
    ),
  },
];

export const RetailShell = () => {
  const retail = useRetailMode();
  const navigate = useNavigate();
  const [attract, setAttract] = useState(retail);
  const [slide, setSlide] = useState(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();

  // Keep the attract flag in step if retail mode flips on at runtime.
  useEffect(() => { if (retail) setAttract(true); }, [retail]);

  // ── Idle watchdog ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!retail) return;
    const arm = () => {
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => setAttract(true), RETAIL_IDLE_MS);
    };
    const EVENTS = ["pointerdown", "pointermove", "keydown", "touchstart", "wheel"];
    EVENTS.forEach(e => window.addEventListener(e, arm, { passive: true }));
    arm();
    return () => {
      clearTimeout(idleTimer.current);
      EVENTS.forEach(e => window.removeEventListener(e, arm));
    };
  }, [retail]);

  // ── Auto-advance the showcase while the attract loop is up ──────────────────
  useEffect(() => {
    if (!attract) return;
    setSlide(0);
    const id = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), SLIDE_MS);
    return () => clearInterval(id);
  }, [attract]);

  // ── Fresh start for the next visitor ────────────────────────────────────────
  const beginFresh = useCallback(() => {
    try {
      // Tell any open drill/debate to tear down, then drop the global locks the
      // recorder + countdown set so a half-finished session can't bleed through.
      window.dispatchEvent(new CustomEvent("speakbold:retail-reset"));
      setTimerActive(false);
      setRecordingActive(false);
      // sessionStorage is per-visit scratch (debate restore, impromptu drafts).
      // Wiping it guarantees the next person can't resume the last one's match.
      sessionStorage.clear();
    } catch {
      /* best-effort — still navigate home below */
    }
    setAttract(false);
    navigate(RETAIL_HOME, { replace: true });
  }, [navigate]);

  if (!retail) return null;

  const isSdg = SLIDES[slide].id === "sdg4";

  return (
    <AnimatePresence>
      {attract && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={beginFresh}
          role="button"
          aria-label="Tap to begin"
          className="fixed inset-0 z-[300] bg-background flex flex-col overflow-hidden cursor-pointer select-none"
        >
          {/* Ambient glow — tints to SDG red on the SDG slide */}
          <motion.div
            aria-hidden
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vw] max-w-[720px] max-h-[720px] rounded-full blur-[130px]"
            animate={{ scale: [1, 1.15, 1], opacity: [0.45, 0.7, 0.45] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            style={{ backgroundColor: isSdg ? `${SDG4_RED}33` : "hsl(var(--primary) / 0.18)" }}
          />

          {/* Progress segments */}
          <div className="relative z-10 flex gap-1.5 px-6 md:px-10 pt-6 md:pt-8">
            {SLIDES.map((s, i) => (
              <div key={s.id} className="h-1 flex-1 rounded-full bg-foreground/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: "0%" }}
                  animate={{ width: i < slide ? "100%" : i === slide ? "100%" : "0%" }}
                  transition={{ duration: i === slide ? SLIDE_MS / 1000 : 0.3, ease: "linear" }}
                  style={{ backgroundColor: isSdg ? SDG4_RED : undefined }}
                />
              </div>
            ))}
          </div>

          {/* Slide stage */}
          <div className="relative z-10 flex-1 flex items-center justify-center px-6 md:px-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={SLIDES[slide].id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full flex justify-center"
              >
                {SLIDES[slide].render()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Persistent tap-to-begin footer */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-2 pb-10 md:pb-14"
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="flex items-center gap-2.5 px-8 py-3.5 rounded-full border border-primary/40 bg-primary/10 text-xs md:text-sm font-black uppercase tracking-[0.3em] text-primary">
              <Hand className="h-4 w-4" />
              Tap anywhere to begin
            </div>
            <p className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-widest opacity-30">
              <Sparkles className="h-3 w-3" />
              Free · No sign-up · 60 seconds
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
