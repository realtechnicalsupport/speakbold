import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sparkles, ArrowLeft, ArrowRight, Hand, GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTimerActive } from "@/lib/timerState";
import { TOURS, DEFAULT_TOUR_ID, type TourId } from "@/lib/tourSteps";
import { seedGrowthDemo } from "@/lib/seedGrowthDemo";

// Per-tour index key so the lab and arena walkthroughs track progress
// independently (resuming one never jumps you into the middle of the other).
const LS_INDEX = (uid: string, tour: TourId) => `speakbold_tour_${tour}_index_${uid}`;
const PAD = 8;     // spotlight padding around the target
const BW = 300;    // approx bubble width (desktop)
const BH = 188;    // fallback bubble height before the real one is measured

export const GuidedTour = () => {
  const { user, refreshUserStatus } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const timerActive = useTimerActive();

  const [active, setActive] = useState(false);
  const [tourId, setTourId] = useState<TourId>(DEFAULT_TOUR_ID);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [located, setLocated] = useState(false);
  const [drag, setDrag] = useState({ x: 0, y: 0 }); // user-dragged offset for the bubble
  const dragRef = useRef<{ sx: number; sy: number; bx: number; by: number } | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [bubbleH, setBubbleH] = useState(BH); // real bubble height, measured after render
  const refreshRef = useRef(refreshUserStatus);
  useEffect(() => { refreshRef.current = refreshUserStatus; }, [refreshUserStatus]);

  const steps = TOURS[tourId];
  const step = steps[index];
  const uid = user?.id;

  // ── Opt-in visibility ─────────────────────────────────────────────────────
  // The tour no longer auto-fires after onboarding. Council verdict
  // (2026-06-07): three stacked onboarding systems made first-run ~15 screens
  // before the aha. The tour now starts ONLY on explicit request — dispatch a
  // `speakbold:start-tour` event (e.g. from a "Show me around" button) or call
  // window.startTutorial() (the dev command advertised in App.tsx).
  useEffect(() => {
    if (!uid) { setActive(false); return; }
    const w = window as Window & { startTutorial?: (tour?: TourId) => void };
    // `restart` true → always begin at step 0 (the "Replay tutorial" button +
    // dev console). false → resume from the saved step (the "Show me around"
    // buttons), so a half-finished tour picks up where you left off.
    const launch = (which: TourId | undefined, restart: boolean) => {
      const tour = which && which in TOURS ? which : DEFAULT_TOUR_ID;
      const saved = restart ? 0 : Number(localStorage.getItem(LS_INDEX(uid, tour)) || 0);
      if (restart) try { localStorage.removeItem(LS_INDEX(uid, tour)); } catch { /* private mode */ }
      setTourId(tour);
      setIndex(Number.isFinite(saved) && saved >= 0 && saved < TOURS[tour].length ? saved : 0);
      setActive(true);
    };
    // Buttons dispatch CustomEvent("speakbold:start-tour", { detail: { tour } }).
    // A plain Event (no detail) falls back to the default tour.
    const onStart = (e: Event) => launch((e as CustomEvent<{ tour?: TourId }>).detail?.tour, false);
    w.addEventListener("speakbold:start-tour", onStart);
    w.startTutorial = (tour?: TourId) => launch(tour, true);
    return () => {
      w.removeEventListener("speakbold:start-tour", onStart);
      delete w.startTutorial;
    };
  }, [uid]);

  const persist = useCallback((i: number) => {
    if (uid) try { localStorage.setItem(LS_INDEX(uid, tourId), String(i)); } catch { /* private mode */ }
  }, [uid, tourId]);

  const finish = useCallback(async () => {
    setActive(false);
    if (!uid) return;
    try { localStorage.removeItem(LS_INDEX(uid, tourId)); } catch { /* noop */ }
    try {
      await supabase.from("profiles").update({ tutorial_done: true }).eq("id", uid);
      await refreshRef.current();
    } catch (e) { console.error("[GuidedTour] save failed", e); }
  }, [uid, tourId]);

  const next = useCallback(() => {
    setIndex(i => {
      const n = i + 1;
      if (n >= steps.length) { finish(); return i; }
      persist(n);
      return n;
    });
  }, [finish, persist, steps.length]);

  const back = useCallback(() => setIndex(i => Math.max(0, i - 1)), []);

  // Reset any drag offset when the step changes (each step repositions itself).
  useEffect(() => { setDrag({ x: 0, y: 0 }); }, [index]);

  // ── Drag the bubble (pointer events → works for mouse + touch) ─────────────
  const onDragStart = (e: React.PointerEvent) => {
    dragRef.current = { sx: e.clientX, sy: e.clientY, bx: drag.x, by: drag.y };
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* noop */ }
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setDrag({ x: dragRef.current.bx + (e.clientX - dragRef.current.sx), y: dragRef.current.by + (e.clientY - dragRef.current.sy) });
  };
  const onDragEnd = () => { dragRef.current = null; };

  // Measure the bubble's real rendered height so placement never assumes a wrong
  // size. The old hardcoded estimate undershot tall steps (long body + doHint +
  // buttons), so "place above" left too little room and the bubble overlapped the
  // spotlighted target — covering it (e.g. the chat FAB on tablet). offsetHeight
  // is layout-position-independent, so reading it here is safe. Skip mid-drag to
  // avoid layout thrashing; the height can't change while dragging.
  useLayoutEffect(() => {
    if (dragRef.current) return;
    const el = bubbleRef.current;
    if (!el) return;
    const h = el.offsetHeight;
    if (h && Math.abs(h - bubbleH) > 1) setBubbleH(h);
  });

  // ── Drive the route for the current step ──────────────────────────────────
  useEffect(() => {
    if (!active || !step) return;
    if (step.route && location.pathname !== step.route) navigate(step.route);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, index]);

  // ── Locate + scroll to the target (retry while the page settles) ──────────
  useEffect(() => {
    if (!active || !step) return;
    setLocated(false);
    setRect(null);
    let tries = 0;
    let timer: number | undefined;
    const locate = () => {
      if (!step.target) { setLocated(true); return; }
      const el = document.querySelector(step.target) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        timer = window.setTimeout(() => {
          setRect(el.getBoundingClientRect());
          setLocated(true);
        }, 320);
        return;
      }
      if (tries++ < 24) timer = window.setTimeout(locate, 140);
      else setLocated(true); // give up → centered fallback (never traps)
    };
    const startDelay = step.route && location.pathname !== step.route ? 450 : 120;
    timer = window.setTimeout(locate, startDelay);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, index, location.pathname]);

  // ── Keep the spotlight aligned on scroll/resize ───────────────────────────
  useEffect(() => {
    if (!active || !step?.target) return;
    const update = () => {
      const el = document.querySelector(step.target!) as HTMLElement | null;
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [active, index, step?.target]);

  // ── "Do" step advancement (event or click on the target) ──────────────────
  useEffect(() => {
    if (!active || !step) return;
    const advance = () => next();
    if (step.advanceEvent) window.addEventListener(step.advanceEvent, advance as EventListener);
    let el: Element | null = null;
    if (step.advanceClickSelector) {
      el = document.querySelector(step.advanceClickSelector);
      el?.addEventListener("click", advance);
    }
    return () => {
      if (step.advanceEvent) window.removeEventListener(step.advanceEvent, advance as EventListener);
      el?.removeEventListener("click", advance);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, index]);

  // ── Dev / console utilities (kept here so they survive the overlay swap) ──
  // Note: window.startTutorial(tour?) is defined in the launch effect above
  // (it force-restarts the given tour); don't redefine it here.
  useEffect(() => {
    (window as any).resetOnboarding = async () => {
      if (!uid) { console.error("Must be logged in to reset."); return; }
      if (!confirm("Reset all onboarding and tutorial progress?")) return;
      try {
        await supabase.from("profiles").update({
          onboarding_done: false, tutorial_done: false, pathway_progress: {}, strengths: [], weaknesses: [],
        }).eq("id", uid);
        localStorage.clear();
        await refreshRef.current();
        window.location.reload();
      } catch (err) { console.error("Failed to reset:", err); }
    };
    (window as any).seedGrowthDemo = () => seedGrowthDemo();
    return () => {
      delete (window as any).resetOnboarding;
      delete (window as any).seedGrowthDemo;
    };
  }, [uid]);

  // Hide entirely during live drills so we never cover a recording.
  if (!active || !step || timerActive) return null;

  const isLast = index === steps.length - 1;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const isMobile = vw < 768;
  const hasSpotlight = !!(rect && step.target && located);

  // ── Bubble placement (all inline so dragging composes cleanly) ────────────
  const width = isMobile ? Math.min(vw - 32, 360) : BW;
  let baseLeft: number;
  let baseTop: number;
  if (!hasSpotlight) {
    baseLeft = (vw - width) / 2;
    baseTop = Math.max(16, (vh - bubbleH) / 2);
  } else if (isMobile) {
    baseLeft = 16;
    if (hasSpotlight && rect!.top > vh * 0.5) {
      // Target is in the lower half — place bubble above it so it doesn't cover it.
      baseTop = Math.max(16, rect!.top - bubbleH - 20);
    } else {
      // Target is in the upper half or no spotlight — dock near bottom.
      baseTop = Math.max(16, vh - bubbleH - 96);
    }
  } else {
    const placeBelow = rect!.bottom + 12 + bubbleH < vh;
    baseTop = placeBelow ? rect!.bottom + 12 : Math.max(12, rect!.top - bubbleH - 12);
    baseLeft = rect!.left + rect!.width / 2 - width / 2;
    baseLeft = Math.max(12, Math.min(baseLeft, vw - width - 12));
  }
  // Apply the user's drag offset, clamped so the bubble can't leave the screen.
  const left = Math.max(8, Math.min(baseLeft + drag.x, vw - width - 8));
  const top = Math.max(8, Math.min(baseTop + drag.y, vh - 72));

  return (
    <>
      {/* Dim + spotlight — above the chat FAB + window so the tour sits on top */}
      <div className="fixed inset-0 z-[250] pointer-events-none">
        {hasSpotlight ? (
          <div
            className="absolute rounded-2xl transition-all duration-300 ease-out"
            style={{
              left: rect!.left - PAD,
              top: rect!.top - PAD,
              width: rect!.width + PAD * 2,
              height: rect!.height + PAD * 2,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.72)",
              border: "2px solid hsl(var(--primary))",
            }}
          />
        ) : (
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.72)" }} />
        )}
      </div>

      {/* Coachmark bubble — above the dim and above the chat. Draggable. */}
      <div
        ref={bubbleRef}
        className="fixed z-[260] bg-card border border-primary/25 rounded-[1.5rem] shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-200"
        style={{ left, top, width }}
      >
        {/* Drag handle (works on touch via pointer events) */}
        <div
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          className="flex justify-center -mt-1 mb-1.5 py-1 opacity-30 hover:opacity-60 transition-opacity"
          style={{ touchAction: "none", cursor: "grab" }}
          aria-label="Drag to move"
        >
          <GripHorizontal className="h-4 w-4" />
        </div>

        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary tabular-nums">
              {index + 1} / {steps.length}
            </span>
          </div>
          <button onClick={finish} aria-label="Skip tour" className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">
            Skip
          </button>
        </div>

        <h3 className="speak-serif text-lg italic tracking-tight mb-1.5">{step.title}</h3>
        <p className="text-sm opacity-60 leading-relaxed">{step.body}</p>

        {step.doHint && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-primary">
            <Hand className="h-3.5 w-3.5" /> {step.doHint}
          </p>
        )}

        {isLast ? (
          <div className="flex flex-col sm:flex-row gap-2 mt-5">
            <button
              onClick={() => { navigate("/tracks/impromptu"); finish(); }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-primary text-white text-xs font-black uppercase tracking-widest shadow-glow hover:scale-[1.02] transition-transform"
            >
              Start practicing <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button onClick={finish} className="px-4 py-2.5 rounded-full border border-border/60 text-xs font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-all">
              Maybe later
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between mt-5">
            <button
              onClick={back}
              disabled={index === 0}
              className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity disabled:opacity-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <button
              onClick={next}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-white text-xs font-black uppercase tracking-widest shadow-glow hover:scale-[1.03] transition-transform"
            >
              {step.doHint ? "Skip step" : "Next"} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </>
  );
};
