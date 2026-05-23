import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sparkles, X, Brain, Target, Clock as ClockIcon, Zap, ChevronRight, ShieldCheck, Microscope } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AIPlanGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (answers: PlanAnswers) => void;
  daysUntilEvent: number;
  eventType: string;
}

export interface PlanAnswers {
  skillLevel: string;
  focusAreas: string[];
  timePerDay: number;
  goals: string;
  customDescription?: string;
  useCustomAI: boolean;
}

const SKILL_LEVELS = [
  { value: "beginner", label: "Foundational", desc: "Developing basic fluency & comfort." },
  { value: "intermediate", label: "Strategic", desc: "Refining structure & adaptive delivery." },
  { value: "advanced", label: "Authoritative", desc: "Mastering presence & deep resonance." },
];

const FOCUS_AREAS = [
  { value: "confidence", label: "Confidence", icon: "💪" },
  { value: "structure", label: "Structure", icon: "📋" },
  { value: "voice", label: "Voice", icon: "🎵" },
  { value: "body", label: "Body", icon: "🤸" },
  { value: "stories", label: "Stories", icon: "📖" },
  { value: "answers", label: "Q&A", icon: "❓" },
  { value: "timing", label: "Timing", icon: "⏱️" },
  { value: "flow", label: "Flow", icon: "🌊" },
];

export function AIPlanGenerator({ isOpen, onClose, onGenerate, daysUntilEvent, eventType }: AIPlanGeneratorProps) {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<PlanAnswers>({
    skillLevel: "",
    focusAreas: [],
    timePerDay: 5,
    goals: "",
    customDescription: "",
    useCustomAI: false,
  });
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleSkillSelect = (level: string) => {
    setAnswers({ ...answers, skillLevel: level });
  };

  const toggleFocusArea = (area: string) => {
    const newAreas = answers.focusAreas.includes(area)
      ? answers.focusAreas.filter(a => a !== area)
      : [...answers.focusAreas, area];
    setAnswers({ ...answers, focusAreas: newAreas });
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setTimeout(() => {
      onGenerate(answers);
      setIsGenerating(false);
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-background/60 backdrop-blur-2xl" 
        onClick={onClose} 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-background border border-border/60 rounded-[3rem] md:rounded-[4rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col mx-4"
      >
        {/* Background Grain & Glow */}
        <div className="grain pointer-events-none" />
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px] animate-pulse-subtle pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between p-8 md:p-16 pb-4 md:pb-8 relative z-10">
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-[0.5em] text-primary opacity-60 flex items-center gap-3">
              <Sparkles className="h-3 w-3 animate-pulse" />
              AI PROTOCOL ENGINE
            </div>
            <h2 className="speak-serif text-4xl md:text-6xl text-foreground leading-[0.9] tracking-tighter">
              Initialize <span className="text-primary italic">Strategy</span>.
            </h2>
          </div>
          <button onClick={onClose} className="p-4 hover:bg-muted/50 rounded-full transition-all opacity-20 hover:opacity-100 group">
            <X className="h-6 w-6 group-hover:rotate-90 transition-transform duration-500" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-16 flex gap-3 relative z-10">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full transition-all duration-700",
                s <= step ? "bg-primary shadow-glow shadow-primary/20" : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 md:p-16 space-y-10 md:space-y-12 relative z-10 scrollbar-hide">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-12"
              >
                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-40">STEP 01 — IDENTITY</p>
                  <h3 className="speak-serif text-3xl md:text-4xl leading-tight">What is your current authority level?</h3>
                </div>
                
                <div className="grid gap-6">
                  {SKILL_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      onClick={() => handleSkillSelect(level.value)}
                      className={cn(
                        answers.skillLevel === level.value
                          ? "border-primary bg-primary/[0.03] shadow-soft ring-1 ring-primary/10"
                          : "border-border/60 hover:border-primary/30 hover:bg-muted/10"
                      )}
                    >
                      <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-5 transition-opacity">
                         <Target className="h-16 w-16" />
                      </div>
                      <div className={cn(
                        "speak-serif text-2xl mb-1 transition-colors",
                        answers.skillLevel === level.value ? "text-primary" : "text-foreground"
                      )}>{level.label}</div>
                      <div className="text-xs font-bold uppercase tracking-widest opacity-40">{level.desc}</div>
                    </button>
                  ))}
                </div>
                
                <div className="pt-8">
                  <button
                    onClick={() => setStep(2)}
                    disabled={!answers.skillLevel}
                    className="button-pill w-full py-6 flex items-center justify-center gap-6 group shadow-glow"
                  >
                    <span className="text-sm font-black uppercase tracking-[0.2em]">NEXT PROTOCOL</span>
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-12"
              >
                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-40">STEP 02 — VECTORS</p>
                  <h3 className="speak-serif text-3xl md:text-4xl leading-tight">Select up to 3 focus vectors.</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {FOCUS_AREAS.map((area) => (
                    <button
                      key={area.value}
                      onClick={() => toggleFocusArea(area.value)}
                      disabled={!answers.focusAreas.includes(area.value) && answers.focusAreas.length >= 3}
                      className={cn(
                        answers.focusAreas.includes(area.value)
                          ? "border-primary bg-primary/[0.03] shadow-glow shadow-primary/5"
                          : "border-border/60 hover:border-primary/20 opacity-60 hover:opacity-100"
                      )}
                    >
                      <span className="text-3xl animate-float" style={{ animationDelay: `${Math.random()}s`, animationDuration: '5s' }}>{area.icon}</span>
                      <span className="text-xs font-black uppercase tracking-[0.2em]">{area.label}</span>
                    </button>
                  ))}
                </div>

                <div className="pt-8">
                  <button
                    onClick={() => setStep(3)}
                    disabled={answers.focusAreas.length === 0}
                    className="button-pill w-full py-6 flex items-center justify-center gap-6 group shadow-glow"
                  >
                    <span className="text-sm font-black uppercase tracking-[0.2em]">FINAL CONFIGURATION</span>
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-12"
              >
                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-40">STEP 03 — CONTEXT</p>
                  <h3 className="speak-serif text-3xl md:text-4xl leading-tight">Investment & Context.</h3>
                </div>

                <div className="space-y-10">
                  <div className="space-y-4">
                    <p className="text-xs font-bold uppercase tracking-widest opacity-40">DAILY TIME ALLOTMENT</p>
                    <div className="grid grid-cols-3 gap-6">
                      {[5, 10, 15].map((mins) => (
                        <button
                          key={mins}
                          onClick={() => setAnswers({ ...answers, timePerDay: mins })}
                          className={cn(
                            answers.timePerDay === mins
                            ? "border-primary bg-primary/[0.03] shadow-glow"
                            : "border-border/60 hover:border-primary/20"
                          )}
                        >
                          <div className={cn(
                            "text-4xl font-sans-bold transition-colors italic",
                            answers.timePerDay === mins ? "text-primary" : "text-foreground opacity-60"
                          )}>{mins}</div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.3em] opacity-40">MINS</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-10 rounded-[3rem] border border-border/60 bg-muted/5 space-y-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                       <Microscope className="h-16 w-16" />
                    </div>
                    <label className="flex items-start gap-6 cursor-pointer relative z-10">
                      <div className="relative flex items-center justify-center h-6 w-6 mt-1">
                        <input
                          type="checkbox"
                          checked={answers.useCustomAI}
                          onChange={(e) => setAnswers({ ...answers, useCustomAI: e.target.checked })}
                          className="peer appearance-none h-6 w-6 rounded-lg border-2 border-primary/60 checked:bg-primary checked:border-primary transition-all cursor-pointer"
                        />
                        <Zap className="absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="currentColor" />
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-black uppercase tracking-widest text-foreground/80">ENABLE SCENARIO ENGINE</span>
                        <p className="text-sm font-medium opacity-40 mt-2 leading-relaxed">
                          Describe the specific high-stakes moment you are preparing for.
                        </p>
                      </div>
                    </label>
                    <AnimatePresence>
                      {answers.useCustomAI && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="relative z-10"
                        >
                          <textarea
                            value={answers.customDescription || ""}
                            onChange={(e) => setAnswers({ ...answers, customDescription: e.target.value })}
                            placeholder="e.g. A Google PM interview, or a Toast for a destination wedding..."
                            className="w-full p-8 rounded-[2rem] border border-border/60 bg-background/50 resize-none text-sm font-medium focus:border-primary/50 transition-all outline-none"
                            rows={3}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="pt-8">
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="button-pill w-full py-6 bg-primary text-white flex items-center justify-center gap-6 group shadow-glow"
                  >
                    {isGenerating ? (
                      <>
                        <Sparkles className="h-5 w-5 animate-spin" />
                        <span className="text-sm font-black uppercase tracking-[0.3em] animate-pulse">SYNTHESIZING PROTOCOL...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        <span className="text-sm font-black uppercase tracking-[0.2em]">INITIALIZE TRAINING PLAN</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-10 border-t border-border/60 bg-muted/5 flex justify-between items-center text-[11px] font-black uppercase tracking-[0.4em] opacity-40 relative z-10">
          <div className="flex items-center gap-3">
             <ShieldCheck className="h-3 w-3" />
             <span>ENCRYPTED CORE</span>
          </div>
          <span>{daysUntilEvent} DAYS TO OBJECTIVE</span>
          <span>SYNERGY ENGINE v2.4</span>
        </div>
      </motion.div>
    </div>
  );
}
