import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Briefcase, Zap, ArrowRight, Globe, GraduationCap, X, Mic, Sparkles, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const ONBOARDING_KEY = "speakbold_onboarding_v2"; // Incremented version to force reset

const PATHS = [
  {
    id: "vocal",
    icon: Mic,
    title: "Vocal Delivery",
    description: "Eliminate filler words ('um', 'uh') and project confidence with your tone.",
    cta: "Build My Pathway",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
  {
    id: "interviews",
    icon: Briefcase,
    title: "Interview Prep",
    description: "Master the STAR method, answer tough questions, and land the offer.",
    cta: "Build My Pathway",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
  {
    id: "impromptu",
    icon: Zap,
    title: "Quick Thinking",
    description: "Learn to speak clearly on the spot. Never freeze when put on the spot.",
    cta: "Build My Pathway",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30",
  },
];

const STEPS = [
  {
    icon: Globe,
    title: "Free for everyone",
    body: "No paywalls. No subscriptions. Elite communication coaching — accessible to any learner, anywhere in the world.",
  },
  {
    icon: Mic,
    title: "Practice. Record. Improve.",
    body: "Every drill is timed and recorded. You speak, our AI listens, and gives you specific feedback — not generic tips.",
  },
  {
    icon: Sparkles,
    title: "AI that coaches, not just scores",
    body: "You'll see your strengths, what to fix, and what to practice next — after every single attempt.",
  },
  {
    icon: GraduationCap,
    title: "Built for real outcomes",
    body: "Whether it's a job interview, a class presentation, or speaking up in a room — SpeakBold prepares you for the moment that matters.",
  },
];

const STRENGTHS = [
  "Natural Confidence", "Clear Articulation", "Engaging Storytelling", 
  "Good Pacing", "Logical Structure", "Emotional Connection"
];

const WEAKNESSES = [
  "Filler Words (um, uh)", "Speaking Too Fast", "Monotone Voice", 
  "Freezing Under Pressure", "Lack of Eye Contact", "Vague Answers"
];

export const OnboardingModal = () => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0); // 0=intro, 1=why, 2=strengths, 3=weaknesses, 4=pick path
  const [selectedStrengths, setSelectedStrengths] = useState<string[]>([]);
  const [selectedWeaknesses, setSelectedWeaknesses] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      console.log("[Onboarding] No user yet");
      return;
    }
    
    let active = true;
    const checkOnboarded = async () => {
      try {
        // 1. Check local storage first (user-specific)
        const userOnboardingKey = `${ONBOARDING_KEY}_${user.id}`;
        const localDone = localStorage.getItem(userOnboardingKey);
        console.log("[Onboarding] Local status:", localDone);
        if (localDone && active) return;

        // 2. Check DB as backup
        const { data, error } = await supabase
          .from("custom_prompts")
          .select("id")
          .eq("user_id", user.id)
          .eq("client_id", "system_onboarding_done")
          .maybeSingle();

        if (error) {
          console.error("[Onboarding] DB check error:", error);
        }

        if (data && active) {
          console.log("[Onboarding] DB says already onboarded");
          localStorage.setItem(userOnboardingKey, "true");
          return;
        }

        // 3. Not found anywhere? Show it.
        if (active) {
          console.log("[Onboarding] Showing modal in 1.2s...");
          const t = setTimeout(() => {
            if (active) setVisible(true);
          }, 1200);
          return t;
        }
      } catch (err) {
        console.error("[Onboarding] Unexpected error:", err);
        // Fallback to showing it if we can't confirm they've seen it
        if (active) setVisible(true);
      }
    };

    let timer: NodeJS.Timeout | undefined;
    checkOnboarded().then(t => { if (t) timer = t; });

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [user]);

  const markDoneInDB = async (pathwaySelection?: string) => {
    if (!user) return;
    try {
      await supabase.from("custom_prompts").upsert({
        user_id: user.id,
        client_id: "system_onboarding_done",
        difficulty: "Low",
        text: "Onboarding Complete",
        framework: "System",
        points: { done: true } as any
      });

      const updateData: any = {
        strengths: selectedStrengths,
        weaknesses: selectedWeaknesses
      };

      if (pathwaySelection) {
        updateData.pathway_selection = pathwaySelection;
      }

      await supabase.from("profiles").update(updateData).eq("id", user.id);

      localStorage.setItem(`speakbold_tutorial_pending_${user.id}`, "true");
    } catch (e) {
      console.error("[Onboarding] Failed to save selections:", e);
    }
  };

  const dismiss = async () => {
    localStorage.setItem(`${ONBOARDING_KEY}_${user?.id}`, "true");
    await markDoneInDB();
    setVisible(false);
  };

  const selectPath = async (id: string) => {
    localStorage.setItem(`speakbold_pathway_selection_${user?.id}`, id);
    localStorage.setItem(`${ONBOARDING_KEY}_${user?.id}`, "true");
    localStorage.setItem(`speakbold_tutorial_pending_${user?.id}`, "true");
    await markDoneInDB(id);
    setVisible(false);
    window.location.href = "/pathway";
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
            {/* ── STEP 0: Welcome ── */}
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
                  <p className="text-xs font-black uppercase tracking-[0.6em] text-primary">UN SDG 4 · QUALITY EDUCATION</p>
                  <h1 className="speak-serif text-5xl md:text-7xl tracking-tighter leading-[0.85]">
                    Welcome to <span className="text-primary italic">SpeakBold.</span>
                  </h1>
                  <p className="text-lg md:text-xl font-medium opacity-50 leading-relaxed max-w-lg mx-auto">
                    Communication skills open doors. We make sure no one is locked out because they couldn't afford a coach.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => setStep(1)}
                    className="button-pill px-12 py-5 bg-primary text-white shadow-glow group flex items-center justify-center gap-3"
                  >
                    <span className="text-xs font-black uppercase tracking-[0.3em]">GET STARTED</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button
                    onClick={() => setStep(4)}
                    className="button-pill px-12 py-5 border border-border/60 text-foreground/50 hover:text-foreground hover:border-primary/30 transition-all text-xs font-black uppercase tracking-[0.3em]"
                  >
                    SKIP TO PATHWAY
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 1: How it works ── */}
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
                    Your <span className="text-primary italic">AI Coach</span>.
                  </h2>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  {STEPS.map((s, i) => {
                    const Icon = s.icon;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 + 0.2 }}
                        className="bg-muted/5 border border-border/60 rounded-[2rem] p-8 space-y-4 relative overflow-hidden"
                      >
                        <div className="grain pointer-events-none" />
                        <div className="h-12 w-12 rounded-[1rem] bg-primary/10 text-primary flex items-center justify-center">
                          <Icon className="h-6 w-6" />
                        </div>
                        <h3 className="speak-serif text-xl font-bold italic tracking-tight">{s.title}</h3>
                        <p className="text-sm font-medium opacity-40 leading-relaxed">{s.body}</p>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={() => setStep(2)}
                    className="button-pill px-12 py-5 bg-primary text-white shadow-glow group flex items-center gap-3"
                  >
                    <span className="text-xs font-black uppercase tracking-[0.3em]">NEXT: YOUR PROFILE</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: Strengths ── */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-2xl w-full space-y-8 md:space-y-12 py-8 max-h-[85vh] overflow-y-auto px-4"
              >
                <div className="text-center space-y-3">
                  <p className="text-xs font-black uppercase tracking-[0.6em] text-primary opacity-60">STEP 2 / 4</p>
                  <h2 className="speak-serif text-3xl md:text-6xl tracking-tighter leading-tight">
                    What are your <span className="text-primary italic">strengths</span>?
                  </h2>
                  <p className="text-xs md:text-sm font-medium opacity-40 leading-relaxed">
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
                        if (e.key === 'Enter') {
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (val && !selectedStrengths.includes(val)) {
                            setSelectedStrengths(prev => [...prev, val]);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest opacity-20 group-focus-within:opacity-100 transition-opacity">PRESS ENTER</div>
                  </div>

                  {selectedStrengths.filter(s => !STRENGTHS.includes(s)).length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {selectedStrengths.filter(s => !STRENGTHS.includes(s)).map(s => (
                        <div key={s} className="px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-3">
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
                    onClick={() => setStep(3)}
                    className="button-pill px-12 py-5 bg-primary text-white shadow-glow transition-all"
                  >
                    <span className="text-xs font-black uppercase tracking-[0.3em]">
                      {selectedStrengths.length === 0 ? "SKIP FOR NOW" : "NEXT STEP"}
                    </span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: Weaknesses ── */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-2xl w-full space-y-8 md:space-y-12 py-8 max-h-[85vh] overflow-y-auto px-4"
              >
                <div className="text-center space-y-3">
                  <p className="text-xs font-black uppercase tracking-[0.6em] text-primary opacity-60">STEP 3 / 4</p>
                  <h2 className="speak-serif text-3xl md:text-6xl tracking-tighter leading-tight">
                    Areas to <span className="text-primary italic">improve</span>?
                  </h2>
                  <p className="text-xs md:text-sm font-medium opacity-40 leading-relaxed">
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
                        if (e.key === 'Enter') {
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (val && !selectedWeaknesses.includes(val)) {
                            setSelectedWeaknesses(prev => [...prev, val]);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest opacity-20 group-focus-within:opacity-100 transition-opacity">PRESS ENTER</div>
                  </div>

                  {selectedWeaknesses.filter(w => !WEAKNESSES.includes(w)).length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {selectedWeaknesses.filter(w => !WEAKNESSES.includes(w)).map(w => (
                        <div key={w} className="px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-3">
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
                    onClick={() => setStep(4)}
                    className="button-pill px-12 py-5 bg-primary text-white shadow-glow transition-all"
                  >
                    <span className="text-xs font-black uppercase tracking-[0.3em]">
                      {selectedWeaknesses.length === 0 ? "SKIP FOR NOW" : "CUSTOMIZE MY PATH"}
                    </span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 4: Pick a path ── */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.6, ease: "circOut" }}
                className="max-w-3xl w-full space-y-8 md:space-y-12 py-8 max-h-[85vh] overflow-y-auto px-4"
              >
                <div className="text-center space-y-3">
                  <p className="text-xs font-black uppercase tracking-[0.6em] text-primary opacity-60">STEP 4 / 4</p>
                  <h2 className="speak-serif text-3xl md:text-6xl tracking-tighter leading-tight">
                    What's your <span className="text-primary italic">goal</span>?
                  </h2>
                  <p className="text-xs md:text-sm font-medium opacity-40 leading-relaxed">
                    Based on your profile, pick a primary focus.
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-5">
                  {PATHS.map((path, i) => {
                    const Icon = path.icon;
                    return (
                      <motion.div
                        key={path.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 + 0.2 }}
                      >
                        <button
                          onClick={() => selectPath(path.id)}
                          className={`group text-left block p-8 rounded-[2rem] border ${path.border} bg-muted/5 hover:bg-muted/10 transition-all duration-500 space-y-5 h-full w-full relative overflow-hidden`}
                        >
                          <div className="grain pointer-events-none" />
                          <div className={`h-14 w-14 rounded-[1.2rem] ${path.bg} ${path.color} flex items-center justify-center`}>
                            <Icon className="h-7 w-7" />
                          </div>
                          <div className="space-y-2">
                            <h3 className="speak-serif text-2xl font-bold italic tracking-tight">{path.title}</h3>
                            <p className="text-sm font-medium opacity-40 leading-relaxed">{path.description}</p>
                          </div>
                          <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest ${path.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
                            {path.cta} <ArrowRight className="h-3 w-3" />
                          </div>
                        </button>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="text-center">
                  <button
                    onClick={dismiss}
                    className="text-xs font-black uppercase tracking-[0.4em] opacity-20 hover:opacity-60 transition-opacity"
                  >
                    EXPLORE ON MY OWN
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step dots */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all duration-500 ${step === i ? "w-8 bg-primary shadow-glow" : "w-3 bg-muted"}`}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
