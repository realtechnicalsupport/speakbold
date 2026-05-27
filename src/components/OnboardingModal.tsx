import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, Zap, ArrowRight, Globe, X, Mic, Sparkles,
  Trophy, Camera, MessageSquare, Target,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const ONBOARDING_KEY = "speakbold_onboarding_v2";
// Separate key written on explicit dismissal — survives a page refresh even
// when the DB write is slow or fails. Never written by AuthContext so it
// can't be overwritten by a subsequent refreshUserStatus call.
const dismissedLsKey = (uid: string) => `speakbold_onboarding_dismissed_${uid}`;

// ── Step 4 (goal): What brings you here? ────────────────────────────────────
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

// ── Step 1: How it works ─────────────────────────────────────────────────────
const HOW_IT_WORKS = [
  {
    icon: Mic,
    title: "Say it out loud.",
    body: "Every drill is timed and recorded. Speaking practice only works when you actually speak — so we make it easy to start.",
  },
  {
    icon: Sparkles,
    title: "Get real AI feedback.",
    body: "After each attempt, you see what you did well and one specific thing to work on. Actual coaching, not vague scores.",
  },
  {
    icon: Zap,
    title: "Build the habit.",
    body: "Short drills, a daily streak, and a path that gets harder as you improve. Five minutes a day compounds fast.",
  },
  {
    icon: Globe,
    title: "Free for everyone.",
    body: "No paywalls, no subscriptions. Public speaking is a learnable skill — we give you the drills and AI to build it.",
  },
];

// ── Step 2 (NEW): Meet the AI ────────────────────────────────────────────────
const AI_FEATURES = [
  {
    icon: Target,
    color: "text-primary",
    bg: "bg-primary/10",
    title: "Drill Coach",
    body: "After every speaking drill, AI scores your clarity, pacing, and structure — then shows you a model speech to compare against.",
  },
  {
    icon: Trophy,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    title: "Battle Judge",
    body: "In live Arena battles, AI judges both speakers simultaneously, awards ELO points, and breaks down who won and exactly why.",
  },
  {
    icon: Camera,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    title: "Body Language AI",
    body: "A camera-based AI tracks your posture, eye contact, expression, and gestures in real time — all processed locally in your browser.",
  },
  {
    icon: MessageSquare,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    title: "AI Coach Chat",
    body: "Ask anything — get coaching tips, navigate the app, or request a breakdown of your recent sessions. Available 24/7.",
  },
];

const STRENGTHS = [
  "Natural Confidence", "Clear Articulation", "Engaging Storytelling",
  "Good Pacing", "Logical Structure", "Emotional Connection",
];

const WEAKNESSES = [
  "Filler Words (um, uh)", "Speaking Too Fast", "Monotone Voice",
  "Freezing Under Pressure", "Lack of Eye Contact", "Vague Answers",
];

// ─────────────────────────────────────────────────────────────────────────────
// Steps: 0=welcome, 1=how-it-works, 2=meet-the-ai, 3=strengths, 4=weaknesses, 5=goal
// ─────────────────────────────────────────────────────────────────────────────
export const OnboardingModal = () => {
  const navigate = useNavigate();
  const { user, onboardingDone, tutorialDone, refreshUserStatus, statusLoading } = useAuth();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [selectedStrengths, setSelectedStrengths] = useState<string[]>([]);
  const [selectedWeaknesses, setSelectedWeaknesses] = useState<string[]>([]);

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
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  // user?.id (primitive) prevents spurious re-runs from session-object churn.
  }, [user?.id, onboardingDone, statusLoading]);

  const markDoneInDB = async (goalSelection?: string) => {
    if (!user) return;
    try {
      const updateData: any = {
        strengths: selectedStrengths,
        weaknesses: selectedWeaknesses,
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

  const dismiss = async () => {
    dismissedRef.current = true;
    // Persist to localStorage immediately so the guard holds across a refresh
    // even if the DB write hasn't completed (or fails).
    if (user) localStorage.setItem(dismissedLsKey(user.id), "1");
    setVisible(false);
    await markDoneInDB();
  };

  const selectGoal = async (id: string) => {
    dismissedRef.current = true;
    if (user) localStorage.setItem(dismissedLsKey(user.id), "1");
    setVisible(false);
    navigate("/pathway");
    // DB write happens after navigation; OnboardingModal stays mounted
    // outside <Routes> so this is safe.
    await markDoneInDB(id);
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
          {/* Skip button */}
          <button
            onClick={dismiss}
            className="absolute top-6 right-6 h-12 w-12 rounded-full border border-border/60 flex items-center justify-center opacity-30 hover:opacity-100 transition-opacity z-10"
          >
            <X className="h-5 w-5" />
          </button>

          <AnimatePresence mode="wait">

            {/* ── STEP 0: Welcome ─────────────────────────────────────────── */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.6, ease: "circOut" }}
                className="max-w-2xl w-full text-center space-y-8 md:space-y-12 py-8 md:py-16 max-h-[85vh] overflow-y-auto px-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 120, delay: 0.2 }}
                  className="h-24 w-24 mx-auto rounded-[2rem] bg-primary flex items-center justify-center shadow-glow shadow-primary/30"
                >
                  <Mic className="h-12 w-12 text-white" />
                </motion.div>

                <div className="space-y-4">
                  <h1 className="speak-serif text-5xl md:text-7xl tracking-tighter leading-[0.85]">
                    Welcome to <span className="text-primary italic">SpeakBold.</span>
                  </h1>
                  <p className="text-lg md:text-xl font-medium opacity-50 leading-relaxed max-w-lg mx-auto">
                    Public speaking is a learnable skill. We give you the drills and AI feedback to build it — free.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => setStep(1)}
                    className="button-pill px-12 py-5 bg-primary text-white shadow-glow group flex items-center justify-center gap-3"
                  >
                    <span className="text-xs font-black uppercase tracking-wide">Get started</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button
                    onClick={() => setStep(5)}
                    className="button-pill px-12 py-5 border border-border/60 text-foreground/50 hover:text-foreground hover:border-primary/30 transition-all text-xs font-black uppercase tracking-wide"
                  >
                    Choose my goal →
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 1: How It Works ─────────────────────────────────────── */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.6, ease: "circOut" }}
                className="max-w-3xl w-full space-y-8 md:space-y-12 py-8 md:py-16 max-h-[85vh] overflow-y-auto px-4"
              >
                <div className="text-center space-y-3">
                  <p className="text-xs font-black uppercase tracking-[0.6em] text-primary opacity-60">HOW IT WORKS</p>
                  <h2 className="speak-serif text-4xl md:text-6xl tracking-tighter leading-none">
                    Built for <span className="text-primary italic">real practice.</span>
                  </h2>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  {HOW_IT_WORKS.map((s, i) => {
                    const Icon = s.icon;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 + 0.2 }}
                        className="bg-muted/5 border border-border/60 rounded-[2rem] p-8 space-y-4 relative overflow-hidden"
                      >
                        <div className="h-12 w-12 rounded-[1rem] bg-primary/10 text-primary flex items-center justify-center">
                          <Icon className="h-6 w-6" />
                        </div>
                        <h3 className="speak-serif text-xl font-bold italic tracking-tight">{s.title}</h3>
                        <p className="text-sm font-medium opacity-60 leading-relaxed">{s.body}</p>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={() => setStep(2)}
                    className="button-pill px-12 py-5 bg-primary text-white shadow-glow group flex items-center gap-3"
                  >
                    <span className="text-xs font-black uppercase tracking-wide">Next: Meet the AI</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: Meet the AI (NEW) ─────────────────────────────────── */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.6, ease: "circOut" }}
                className="max-w-3xl w-full space-y-8 md:space-y-12 py-8 md:py-16 max-h-[85vh] overflow-y-auto px-4"
              >
                <div className="text-center space-y-3">
                  <p className="text-xs font-black uppercase tracking-[0.6em] text-primary opacity-60">THE AI BEHIND THE APP</p>
                  <h2 className="speak-serif text-4xl md:text-6xl tracking-tighter leading-none">
                    Four AIs. <span className="text-primary italic">One goal.</span>
                  </h2>
                  <p className="text-sm font-medium opacity-40 leading-relaxed max-w-md mx-auto">
                    Every feature in SpeakBold is powered by AI that watches, listens, and gives you feedback you can actually use.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  {AI_FEATURES.map((f, i) => {
                    const Icon = f.icon;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 + 0.2 }}
                        className="bg-muted/5 border border-border/60 rounded-[2rem] p-8 space-y-4 relative overflow-hidden"
                      >
                        <div className={cn("h-12 w-12 rounded-[1rem] flex items-center justify-center", f.bg, f.color)}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <h3 className="speak-serif text-xl font-bold italic tracking-tight">{f.title}</h3>
                        <p className="text-sm font-medium opacity-60 leading-relaxed">{f.body}</p>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={() => setStep(3)}
                    className="button-pill px-12 py-5 bg-primary text-white shadow-glow group flex items-center gap-3"
                  >
                    <span className="text-xs font-black uppercase tracking-wide">Next: Tell us about you</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: Strengths ────────────────────────────────────────── */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-2xl w-full space-y-8 md:space-y-12 py-8 max-h-[85vh] overflow-y-auto px-4"
              >
                <div className="text-center space-y-3">
                  <p className="text-xs font-black uppercase tracking-[0.6em] text-primary opacity-60">STEP 3 / 5</p>
                  <h2 className="speak-serif text-3xl md:text-6xl tracking-tighter leading-tight">
                    What are your <span className="text-primary italic">strengths</span>?
                  </h2>
                  <p className="text-xs md:text-sm font-medium opacity-60 leading-relaxed">
                    Select from the list or add your own.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {STRENGTHS.map(s => (
                      <button
                        key={s}
                        onClick={() => setSelectedStrengths(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                        className={cn(
                          "p-6 rounded-2xl border transition-all duration-300 text-left relative overflow-hidden",
                          selectedStrengths.includes(s)
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/60 bg-muted/5 text-foreground/60 hover:border-primary/30"
                        )}
                      >
                        <span className="text-sm font-bold">{s}</span>
                        {selectedStrengths.includes(s) && <Sparkles className="absolute top-2 right-2 h-3 w-3 animate-pulse" />}
                      </button>
                    ))}
                  </div>

                  <div className="relative group">
                    <input
                      type="text"
                      placeholder="Add a custom strength..."
                      className="w-full bg-muted/5 border border-border/60 rounded-2xl p-6 text-sm font-bold focus:border-primary/50 transition-all outline-none pr-16"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (val && !selectedStrengths.includes(val)) {
                            setSelectedStrengths(prev => [...prev, val]);
                            (e.target as HTMLInputElement).value = "";
                          }
                        }
                      }}
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black uppercase tracking-widest opacity-40 group-focus-within:opacity-100 transition-opacity">Enter</div>
                  </div>

                  {selectedStrengths.filter(s => !STRENGTHS.includes(s)).length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {selectedStrengths.filter(s => !STRENGTHS.includes(s)).map(s => (
                        <div key={s} className="px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary flex items-center gap-3">
                          {s}
                          <button onClick={() => setSelectedStrengths(prev => prev.filter(x => x !== s))} className="hover:text-foreground">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-center pt-8">
                  <button
                    onClick={() => setStep(4)}
                    className="button-pill px-12 py-5 bg-primary text-white shadow-glow transition-all"
                  >
                    <span className="text-xs font-black uppercase tracking-wide">
                      {selectedStrengths.length === 0 ? "Skip for now" : "Next step"}
                    </span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 4: Weaknesses ───────────────────────────────────────── */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-2xl w-full space-y-8 md:space-y-12 py-8 max-h-[85vh] overflow-y-auto px-4"
              >
                <div className="text-center space-y-3">
                  <p className="text-xs font-black uppercase tracking-[0.6em] text-primary opacity-60">STEP 4 / 5</p>
                  <h2 className="speak-serif text-3xl md:text-6xl tracking-tighter leading-tight">
                    Areas to <span className="text-primary italic">improve</span>?
                  </h2>
                  <p className="text-xs md:text-sm font-medium opacity-60 leading-relaxed">
                    What holds you back the most?
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {WEAKNESSES.map(w => (
                      <button
                        key={w}
                        onClick={() => setSelectedWeaknesses(prev => prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w])}
                        className={cn(
                          "p-6 rounded-2xl border transition-all duration-300 text-left relative overflow-hidden",
                          selectedWeaknesses.includes(w)
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/60 bg-muted/5 text-foreground/60 hover:border-primary/30"
                        )}
                      >
                        <span className="text-sm font-bold">{w}</span>
                      </button>
                    ))}
                  </div>

                  <div className="relative group">
                    <input
                      type="text"
                      placeholder="Add a custom area to improve..."
                      className="w-full bg-muted/5 border border-border/60 rounded-2xl p-6 text-sm font-bold focus:border-primary/50 transition-all outline-none pr-16"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (val && !selectedWeaknesses.includes(val)) {
                            setSelectedWeaknesses(prev => [...prev, val]);
                            (e.target as HTMLInputElement).value = "";
                          }
                        }
                      }}
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black uppercase tracking-widest opacity-40 group-focus-within:opacity-100 transition-opacity">Enter</div>
                  </div>

                  {selectedWeaknesses.filter(w => !WEAKNESSES.includes(w)).length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {selectedWeaknesses.filter(w => !WEAKNESSES.includes(w)).map(w => (
                        <div key={w} className="px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary flex items-center gap-3">
                          {w}
                          <button onClick={() => setSelectedWeaknesses(prev => prev.filter(x => x !== w))} className="hover:text-foreground">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-center pt-8">
                  <button
                    onClick={() => setStep(5)}
                    className="button-pill px-12 py-5 bg-primary text-white shadow-glow transition-all"
                  >
                    <span className="text-xs font-black uppercase tracking-wide">
                      {selectedWeaknesses.length === 0 ? "Skip for now" : "Almost done"}
                    </span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 5: What brings you here? ────────────────────────────── */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.6, ease: "circOut" }}
                className="max-w-3xl w-full space-y-8 md:space-y-12 py-8 max-h-[85vh] overflow-y-auto px-4"
              >
                <div className="text-center space-y-3">
                  <p className="text-xs font-black uppercase tracking-[0.6em] text-primary opacity-60">STEP 5 / 5</p>
                  <h2 className="speak-serif text-3xl md:text-6xl tracking-tighter leading-tight">
                    What brings you <span className="text-primary italic">here</span>?
                  </h2>
                  <p className="text-xs md:text-sm font-medium opacity-60 leading-relaxed">
                    No wrong answer — this helps us personalize your experience over time.
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-5">
                  {GOALS.map((goal, i) => {
                    const Icon = goal.icon;
                    return (
                      <motion.div
                        key={goal.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 + 0.2 }}
                      >
                        <button
                          onClick={() => selectGoal(goal.id)}
                          className={`group text-left block p-8 rounded-[2rem] border ${goal.border} bg-muted/5 hover:bg-muted/10 transition-all duration-500 space-y-5 h-full w-full relative overflow-hidden`}
                        >
                          <div className={`h-14 w-14 rounded-[1.2rem] ${goal.bg} ${goal.color} flex items-center justify-center`}>
                            <Icon className="h-7 w-7" />
                          </div>
                          <div className="space-y-2">
                            <h3 className="speak-serif text-xl font-bold italic tracking-tight leading-tight">{goal.title}</h3>
                            <p className="text-sm font-medium opacity-60 leading-relaxed">{goal.description}</p>
                          </div>
                        </button>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="text-center">
                  <button
                    onClick={dismiss}
                    className="text-xs font-black uppercase tracking-wide opacity-30 hover:opacity-70 transition-opacity"
                  >
                    Explore on my own
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          {/* Step dots — 6 total (0–5). Forward navigation is blocked; can only go back. */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                onClick={() => { if (i < step) setStep(i); }}
                disabled={i >= step}
                aria-label={i < step ? `Go back to step ${i + 1}` : undefined}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  step === i
                    ? "w-8 bg-primary shadow-glow"
                    : i < step
                    ? "w-3 bg-primary/30 hover:bg-primary/60 cursor-pointer"
                    : "w-3 bg-muted opacity-30 cursor-not-allowed"
                )}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
