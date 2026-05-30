import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Check, ChevronDown, ChevronUp, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// ── Checklist definition ──────────────────────────────────────────────────────
const CHECKLIST = [
  { id: "first-drill",   label: "Complete your first drill" },
  { id: "visit-pathway", label: "Find your Pathway" },
  { id: "visit-lab",     label: "Explore the Lab" },
  { id: "visit-arena",   label: "Step into the Arena" },
  { id: "visit-friends", label: "Meet your friends" },
  { id: "visit-profile", label: "Check your Profile" },
] as const;

const TOTAL = CHECKLIST.length;

// ── localStorage helpers ──────────────────────────────────────────────────────
const LS_STEPS     = (uid: string) => `speakbold_firststeps_${uid}`;
const LS_COLLAPSED = (uid: string) => `speakbold_firststeps_collapsed_${uid}`;

function loadSteps(uid: string): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(LS_STEPS(uid)) ?? "{}"); }
  catch { return {}; }
}
function saveSteps(uid: string, state: Record<string, boolean>) {
  localStorage.setItem(LS_STEPS(uid), JSON.stringify(state));
}
function loadCollapsed(uid: string): boolean {
  return localStorage.getItem(LS_COLLAPSED(uid)) === "true";
}
function saveCollapsed(uid: string, val: boolean) {
  localStorage.setItem(LS_COLLAPSED(uid), String(val));
}

// Route → step-id map (module-scope, stable)
const ROUTE_STEPS: Record<string, string> = {
  "/pathway": "visit-pathway",
  "/lab":     "visit-lab",
  "/arena":   "visit-arena",
  "/friends": "visit-friends",
  "/profile": "visit-profile",
};

// ─────────────────────────────────────────────────────────────────────────────

export const TutorialOverlay = () => {
  const location = useLocation();
  const { user, onboardingDone, tutorialDone, refreshUserStatus } = useAuth();

  const [steps, setSteps]             = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed]     = useState(false);
  const [visible, setVisible]         = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [mounted, setMounted]         = useState(false); // for CSS entry transition
  const savedRef = useRef(false);

  const uid = user?.id;

  // Refs to keep latest values without re-triggering effects
  const refreshRef = useRef(refreshUserStatus);
  useEffect(() => { refreshRef.current = refreshUserStatus; }, [refreshUserStatus]);

  // ── Load persisted state once uid is known ────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    setSteps(loadSteps(uid));
    setCollapsed(loadCollapsed(uid));
  }, [uid]);

  // ── Visibility: show only when onboarding done + tutorial not done ────────
  useEffect(() => {
    if (!uid || !onboardingDone || tutorialDone) {
      setVisible(false);
      setMounted(false);
      return;
    }
    const t = setTimeout(() => {
      setVisible(true);
      // next tick → trigger CSS enter transition
      requestAnimationFrame(() => setMounted(true));
    }, 1200);
    return () => clearTimeout(t);
  }, [uid, onboardingDone, tutorialDone]);

  // ── Mark a step done (stable; closes over uid via setState fn form) ───────
  const markDone = useCallback((id: string) => {
    if (!uid) return;
    setSteps(prev => {
      if (prev[id]) return prev;
      const next = { ...prev, [id]: true };
      saveSteps(uid, next);
      return next;
    });
  }, [uid]);

  // ── Auto-check route-based steps (5-second dwell required) ───────────────
  // Effect only re-runs on pathname/visibility changes — not on `steps` state
  // changes — so an unrelated step completing won't reset the dwell timer.
  useEffect(() => {
    if (!visible) return;
    const stepId = ROUTE_STEPS[location.pathname];
    if (!stepId) return;
    const t = setTimeout(() => markDone(stepId), 5000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, visible, markDone]);

  // ── Drill completion: speakbold:drill-complete custom event ───────────────
  // Dispatched by RecorderPanel (any Pathway drill) and DebateBattle ("Back to
  // Arena" results button). Falls back to the #tutorial-close-drill click guard
  // for any edge-case callers that haven't been updated yet.
  const firstDrillDone = !!steps["first-drill"];
  useEffect(() => {
    if (!visible || firstDrillDone) return;

    const onEvent = () => markDone("first-drill");

    // Primary: custom event fired by RecorderPanel / DebateBattle
    window.addEventListener("speakbold:drill-complete", onEvent);

    // Fallback: direct click on legacy #tutorial-close-drill elements
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.id === "tutorial-close-drill" || t.closest?.("#tutorial-close-drill"))) {
        onEvent();
      }
    };
    document.addEventListener("click", onClick, true);

    return () => {
      window.removeEventListener("speakbold:drill-complete", onEvent);
      document.removeEventListener("click", onClick, true);
    };
  }, [visible, firstDrillDone, markDone]);

  // ── Derived (memoised so identity is stable across renders) ───────────────
  const completedCount = useMemo(
    () => CHECKLIST.reduce((n, c) => n + (steps[c.id] ? 1 : 0), 0),
    [steps]
  );
  const allDone = completedCount === TOTAL;

  // ── On completion: celebrate + save once ──────────────────────────────────
  useEffect(() => {
    if (!allDone || !uid || savedRef.current) return;
    savedRef.current = true;
    setCelebrating(true);
    supabase
      .from("profiles")
      .update({ tutorial_done: true })
      .eq("id", uid)
      .then(() => refreshRef.current())
      .catch(e => console.error("[Tutorial] save failed:", e));
  }, [allDone, uid]);

  // ── Toggle / dismiss ──────────────────────────────────────────────────────
  const toggleCollapse = useCallback(() => {
    if (!uid) return;
    setCollapsed(c => { saveCollapsed(uid, !c); return !c; });
  }, [uid]);

  const dismiss = useCallback(() => setVisible(false), []);

  // ── Developer utilities (deps narrowed to uid only — refresh via ref) ────
  useEffect(() => {
    (window as any).resetOnboarding = async () => {
      if (!uid) { console.error("Must be logged in to reset."); return; }
      if (!confirm("Reset all onboarding and tutorial progress?")) return;
      try {
        await supabase.from("profiles").update({
          onboarding_done:  false,
          tutorial_done:    false,
          pathway_progress: {},
          strengths:        [],
          weaknesses:       [],
        }).eq("id", uid);
        localStorage.clear();
        await refreshRef.current();
        console.log("✅ Reset complete — refreshing…");
        window.location.reload();
      } catch (err) {
        console.error("❌ Failed to reset:", err);
      }
    };

    (window as any).startTutorial = () => {
      if (!uid) { console.error("Must be logged in."); return; }
      savedRef.current = false;
      setCelebrating(false);
      setVisible(true);
      requestAnimationFrame(() => setMounted(true));
    };

    return () => {
      delete (window as any).resetOnboarding;
      delete (window as any).startTutorial;
    };
  }, [uid]);

  // ── Hard short-circuit: nothing renders when not visible ─────────────────
  if (!visible || !uid) return null;

  return (
    <div
      className={cn(
        "fixed bottom-28 right-4 md:bottom-8 md:right-8 z-[250] w-72",
        "transition-all duration-300 ease-out will-change-transform",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
    >
      <div className="bg-card border border-border/60 rounded-[1.5rem] shadow-2xl overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.15em] leading-none">First steps</p>
              <p className="text-[10px] font-medium opacity-40 mt-0.5">
                {completedCount} of {TOTAL} done
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              onClick={toggleCollapse}
              aria-label={collapsed ? "Expand" : "Collapse"}
              className="h-7 w-7 rounded-full flex items-center justify-center opacity-30 hover:opacity-80 transition-opacity"
            >
              {collapsed
                ? <ChevronDown className="h-3.5 w-3.5" />
                : <ChevronUp   className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              className="h-7 w-7 rounded-full flex items-center justify-center opacity-30 hover:opacity-80 transition-opacity"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ── Collapsible body (pure CSS grid-rows trick — no JS animation) */}
        <div
          className={cn(
            "grid transition-all duration-200 ease-in-out",
            collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
          )}
        >
          <div className="overflow-hidden">
            <div className="border-t border-border/30">
              {celebrating ? (
                /* ── All-done state ──────────────────────────────────────── */
                <div className="px-5 py-6 text-center space-y-2">
                  <p className="text-3xl">🎉</p>
                  <p className="speak-serif text-base font-bold italic tracking-tight">You're all set!</p>
                  <p className="text-xs font-medium opacity-40 leading-relaxed">
                    You've explored everything. Now go practice.
                  </p>
                  <button
                    onClick={dismiss}
                    className="mt-1 text-[10px] font-black uppercase tracking-[0.3em] text-primary hover:opacity-70 transition-opacity"
                  >
                    Close
                  </button>
                </div>
              ) : (
                /* ── Checklist items ─────────────────────────────────────── */
                <div className="px-5 pt-4 pb-5 space-y-3.5">
                  {CHECKLIST.map((item) => {
                    const isDone = !!steps[item.id];
                    return (
                      <div key={item.id} className="flex items-center gap-3">
                        <div
                          className={cn(
                            "h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors duration-300",
                            isDone ? "bg-primary border-primary" : "border-border/60"
                          )}
                        >
                          {isDone && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                        </div>
                        <span className={cn(
                          "text-xs font-medium leading-tight transition-opacity duration-300",
                          isDone ? "line-through opacity-25" : "opacity-65"
                        )}>
                          {item.label}
                        </span>
                      </div>
                    );
                  })}

                  {/* Progress bar */}
                  <div className="pt-1">
                    <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-[width] duration-500 ease-out"
                        style={{ width: `${(completedCount / TOTAL) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
