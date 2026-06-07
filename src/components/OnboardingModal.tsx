import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Zap, ArrowRight, X, Mic } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";

// Separate key written on explicit dismissal — survives a page refresh even
// when the DB write is slow or fails. Never written by AuthContext so it
// can't be overwritten by a subsequent refreshUserStatus call.
const dismissedLsKey = (uid: string) => `speakbold_onboarding_dismissed_${uid}`;

// ── The one question that actually changes what we do: routing intent. ───────
// Council verdict (2026-06-07): the old 6-step modal (welcome + "how it works" +
// "meet the AI" + strengths + weaknesses + goal) buried the aha behind ~8 cards
// of exposition before the user did anything. We cut it to a SINGLE goal pick —
// the only step with a downstream consequence — then drop them straight into the
// Pathway. Strengths/weaknesses are no longer interviewed for; the AI infers them
// from the first drill. The explainer content lives on the landing page for the
// curious; it doesn't gate first-run.
const GOALS = [
  {
    id: "interviews",
    icon: Briefcase,
    title: "Preparing for job interviews",
    description: "Nail your answers, tell compelling stories, and walk in ready.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
  {
    id: "presentations",
    icon: Zap,
    title: "Getting better at presentations",
    description: "Build structure, lose the filler words, and own the room.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
  {
    id: "confidence",
    icon: Mic,
    title: "Building everyday confidence",
    description: "Speak up in meetings, on calls, and in conversations that count.",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30",
  },
];

export const OnboardingModal = () => {
  const navigate = useNavigate();
  const { user, onboardingDone, refreshUserStatus, statusLoading } = useAuth();
  const [visible, setVisible] = useState(false);

  // Tracks whether the user has already dismissed this session — prevents the
  // modal from popping back up if Supabase fires a new auth event (session
  // object churn) while the DB write / status-refresh is still in flight.
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (!user) { setVisible(false); return; }
    if (statusLoading) return;
    // In-session guard: set synchronously on any dismiss action.
    if (dismissedRef.current) { setVisible(false); return; }
    // Cross-refresh guard: written to localStorage on dismiss so the modal
    // stays hidden even if the DB write was slow or failed.
    if (localStorage.getItem(dismissedLsKey(user.id)) === "1") { setVisible(false); return; }
    if (!onboardingDone) {
      const timer = setTimeout(() => {
        setVisible(true);
        track("onboarding_shown");
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  // user?.id (primitive) prevents spurious re-runs from session-object churn.
  }, [user?.id, onboardingDone, statusLoading]);

  const markDoneInDB = async (goalSelection?: string) => {
    if (!user) return;
    try {
      const updateData: { onboarding_done: boolean; pathway_selection?: string } = {
        onboarding_done: true,
      };
      if (goalSelection) updateData.pathway_selection = goalSelection;
      const { error } = await supabase.from("profiles").update(updateData).eq("id", user.id);
      if (error) throw error;
      await refreshUserStatus();
    } catch (e) {
      console.error("[Onboarding] Failed to save:", e);
    }
  };

  const finishAndGo = async (goalSelection?: string) => {
    dismissedRef.current = true;
    if (user) localStorage.setItem(dismissedLsKey(user.id), "1");
    setVisible(false);
    // Straight to the Pathway — placement is now a non-blocking nudge there, so
    // the very next thing the user sees is the "start your first drill" hero.
    navigate("/pathway");
    // DB write happens after navigation; OnboardingModal stays mounted outside
    // <Routes> so this is safe.
    await markDoneInDB(goalSelection ?? "confidence");
  };

  const selectGoal = (id: string) => {
    track("onboarding_goal_selected", { goal: id });
    void finishAndGo(id);
  };

  const skip = () => {
    track("onboarding_skipped");
    void finishAndGo();
  };

  if (!user) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-background/90 backdrop-blur-2xl flex items-center justify-center p-4 overflow-y-auto"
        >
          {/* Skip — straight to the app with a sensible default track. */}
          <button
            onClick={skip}
            className="absolute top-6 right-6 h-auto px-4 py-2 rounded-full border border-border/60 flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity z-10"
          >
            <X className="h-3.5 w-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Skip to app</span>
          </button>

          <motion.div
            key="goal"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.6, ease: "circOut" }}
            className="max-w-3xl w-full space-y-8 md:space-y-12 py-8 md:py-12 max-h-[90vh] overflow-y-auto px-4"
          >
            <div className="text-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 120, delay: 0.15 }}
                className="h-16 w-16 md:h-20 md:w-20 mx-auto rounded-[1.5rem] md:rounded-[2rem] bg-primary flex items-center justify-center shadow-glow shadow-primary/30"
              >
                <Mic className="h-8 w-8 md:h-10 md:w-10 text-white" />
              </motion.div>
              <p className="text-xs font-black uppercase tracking-[0.6em] text-primary opacity-70">WELCOME TO SPEAKBOLD</p>
              <h2 className="speak-serif text-3xl md:text-6xl tracking-tighter leading-tight">
                What brings you <span className="text-primary italic">here</span>?
              </h2>
              <p className="text-sm md:text-base font-medium opacity-50 leading-relaxed max-w-md mx-auto">
                Pick one and we'll point you at the right first drill. You can change focus anytime.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4 md:gap-5">
              {GOALS.map((goal, i) => {
                const Icon = goal.icon;
                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.08 + 0.2 }}
                  >
                    <button
                      onClick={() => selectGoal(goal.id)}
                      className={`group text-left block p-6 md:p-8 rounded-[2rem] border ${goal.border} bg-muted/5 hover:bg-muted/10 hover:-translate-y-1 transition-all duration-300 space-y-5 h-full w-full relative overflow-hidden`}
                    >
                      <div className={`h-14 w-14 rounded-[1.2rem] ${goal.bg} ${goal.color} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                        <Icon className="h-7 w-7" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="speak-serif text-xl font-bold italic tracking-tight leading-tight">{goal.title}</h3>
                        <p className="text-sm font-medium opacity-60 leading-relaxed">{goal.description}</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-primary opacity-50 group-hover:opacity-100 group-hover:gap-2.5 transition-all">
                        Start here <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
