import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X, Sparkles, Target, Mic, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface Step {
  targetId: string;
  title: string;
  content: string;
  icon: React.ElementType;
  position: "top" | "bottom" | "left" | "right" | "center";
  redirectTo?: string;
}

const STEPS: Step[] = [
  {
    targetId: "pathway-hero",
    title: "Personalized Roadmap",
    content: "Your path is unique. Whether your goal is mastering Interviews, Public Speaking, or Impromptu, we've reordered the curriculum to prioritize your focus area.",
    icon: Target,
    position: "bottom",
  },
  {
    targetId: "pathway-units",
    title: "The Learning Loop",
    content: "Each unit is a mission. You'll watch a concept, practice the drill, and get instant AI feedback on filler words, pacing, and tone. Completing drills earns XP and unlocks higher tiers.",
    icon: Mic,
    position: "top",
  },
  {
    targetId: "arena-grid",
    title: "The Lounge: Live Stakes",
    content: "Ready to test your skills under pressure? The Practice Lounge is where you can battle the AI or other learners in real-time scenarios.",
    icon: Trophy,
    position: "center",
    redirectTo: "/arena"
  },
  {
    targetId: "arena-gamemodes",
    title: "Game Modes",
    content: "Choose your battlefield: 'Blitz' for quick logic puzzles, 'Pitch' for selling bizarre inventions, 'Debate' for controversial motions, or 'Standard' for deep thematic topics.",
    icon: Sparkles,
    position: "bottom",
  },
  {
    targetId: "arena-online-users",
    title: "Challenge Peers",
    content: "See who's online and send an invite. Try inviting 'Alex (Trainer)' now to see how an online duel works! You'll both get the same prompt and the AI will judge the winner.",
    icon: Mic,
    position: "top",
  },
  {
    targetId: "profile-stats",
    title: "Your Digital Resume",
    content: "Your profile tracks your growth. Here you can see your total impact, detailed feedback history, and your current global rank in the SpeakBold community.",
    icon: Trophy,
    position: "bottom",
    redirectTo: "/profile"
  },
];

export const TutorialOverlay = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!user) return;
    const pending = localStorage.getItem(`speakbold_tutorial_pending_${user.id}`);
    if (pending === "true") {
      // Only start if we are on the pathway page
      if (location.pathname === "/pathway" && !isVisible) {
        const timer = setTimeout(() => {
          setCurrentStep(0);
          setIsVisible(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [location.pathname, isVisible, user]);

  useEffect(() => {
    if (!isVisible || currentStep === null) return;

    let rafId: number;
    const updatePosition = () => {
      const step = STEPS[currentStep];
      const el = document.getElementById(step.targetId);

      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
      } else {
        setTargetRect(null);
      }

      rafId = requestAnimationFrame(updatePosition);
    };

    updatePosition();
    return () => cancelAnimationFrame(rafId);
  }, [currentStep, isVisible]);

  useEffect(() => {
    if (currentStep !== null && isVisible) {
      const step = STEPS[currentStep];
      const el = document.getElementById(step.targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentStep, isVisible]);

  const handleNext = () => {
    if (currentStep === null) return;
    if (currentStep < STEPS.length - 1) {
      const nextStep = STEPS[currentStep + 1];
      if (nextStep.redirectTo) {
        navigate(nextStep.redirectTo);
      }
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    if (user) {
      localStorage.removeItem(`speakbold_tutorial_pending_${user.id}`);
    }
    setCurrentStep(null);
  };

  if (!isVisible || currentStep === null) return null;

  const step = STEPS[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-[300] pointer-events-none">
      {/* Backdrop with hole */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-background/60 backdrop-blur-sm pointer-events-auto"
        style={{
          clipPath: targetRect
            ? `polygon(0% 0%, 0% 100%, ${targetRect.left - 8}px 100%, ${targetRect.left - 8}px ${targetRect.top - 8}px, ${targetRect.right + 8}px ${targetRect.top - 8}px, ${targetRect.right + 8}px ${targetRect.bottom + 8}px, ${targetRect.left - 8}px ${targetRect.bottom + 8}px, ${targetRect.left - 8}px 100%, 100% 100%, 100% 0%)`
            : "none"
        }}
        transition={{ type: "spring", stiffness: 1000, damping: 60, mass: 0.5 }}
        onClick={handleComplete}
      />

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            top: targetRect
              ? (window.innerWidth < 768
                ? Math.min(targetRect.bottom + 12, window.innerHeight - 200)
                : (step.position === "bottom"
                  ? Math.min(targetRect.bottom + 24, window.innerHeight - 300)
                  : Math.max(targetRect.top - 280, 20)))
              : "50%",
            left: targetRect
              ? (window.innerWidth < 768 
                  ? "20px" 
                  : Math.max(160, Math.min(targetRect.left + targetRect.width / 2, window.innerWidth - 160)))
              : "50%",
          }}
          drag
          dragMomentum={false}
          whileDrag={{ scale: 1.05, boxShadow: "0 30px 60px rgba(0,0,0,0.3)", cursor: "grabbing" }}
          transition={{ 
            type: "spring", 
            stiffness: 1000, 
            damping: 50,
            opacity: { duration: 0.2 },
            scale: { type: "spring", stiffness: 400, damping: 25 },
            top: { type: "spring", stiffness: 1000, damping: 60, mass: 0.5 },
            left: { type: "spring", stiffness: 1000, damping: 60, mass: 0.5 }
          }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className={cn(
            "absolute pointer-events-auto w-[calc(100vw-40px)] md:w-[320px] bg-card border border-border shadow-2xl rounded-[2rem] p-6 md:p-8 space-y-4 md:space-y-6 z-[301] touch-none cursor-grab active:cursor-grabbing",
            !targetRect && "-translate-x-1/2 -translate-y-1/2",
            targetRect && (window.innerWidth < 768 ? "" : "-translate-x-1/2")
          )}
        >
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Icon className="h-5 w-5" />
            </div>
            <button onClick={handleComplete} className="opacity-30 hover:opacity-100 transition-opacity">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            <h3 className="speak-serif text-xl font-bold italic tracking-tight">{step.title}</h3>
            <p className="text-sm font-medium opacity-50 leading-relaxed">
              {step.content}
            </p>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 rounded-full transition-all duration-500",
                    i === currentStep ? "w-4 bg-primary" : "w-1 bg-muted"
                  )}
                />
              ))}
            </div>
            <button
              onClick={handleNext}
              className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary group"
            >
              {currentStep === STEPS.length - 1 ? "Finish" : "Next"}
              <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
