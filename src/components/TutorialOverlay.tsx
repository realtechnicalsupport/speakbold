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
    title: "The SpeakBold Mission",
    content: "Welcome, Operator. You're looking at your Personalized Pathway. We analyze your focus areas—Interviews, Public Speaking, or Impromptu—and reorder the entire curriculum to get you to mastery as fast as possible.",
    icon: Sparkles,
    position: "bottom",
  },
  {
    targetId: "pathway-units",
    title: "The 3-Step Learning Loop",
    content: "1. LEARN the strategy. 2. DRILL the specific skill. 3. AUDIT your results. The AI won't let you progress until you demonstrate a 'Pass' score of 70% or higher.",
    icon: Target,
    position: "top",
  },
  {
    targetId: "nav-lab",
    title: "The Lab: Skill Surgery",
    content: "The Lab is for unguided practice. If you find your 'Filler Word' score is low, come here to perform 'Skill Surgery' on specific techniques without any progress pressure.",
    icon: Mic,
    position: "bottom",
    redirectTo: "/lab"
  },
  {
    targetId: "lab-grid",
    title: "Free-Form Tools",
    content: "Each tool here serves a different outcome. 'Quick Thinking' generates high-pressure random topics, while 'Interview Practice' allows you to simulate high-stakes professional meetings.",
    icon: Target,
    position: "top",
  },
  {
    targetId: "nav-arena",
    title: "The Arena: Live Combat",
    content: "The Arena is the ultimate test. This is where you put your training into practice against AI personalities or other real users in real-time.",
    icon: Trophy,
    position: "bottom",
    redirectTo: "/arena"
  },
  {
    targetId: "arena-grid",
    title: "The Battle Flow: 4 Phases",
    content: "Battles have 4 phases: 1. MATCHMAKING (Find a peer). 2. SYNCED RECORDING (Both answer the same prompt). 3. AI AUDIT (Dual-analysis). 4. VERDICT (Winner takes the ELO).",
    icon: Mic,
    position: "bottom",
  },
  {
    targetId: "arena-gamemodes",
    title: "Strategic Modes",
    content: "Choose Blitz for speed, Pitch for sales/persuasion, or Debate for logic. Each mode uses different AI judging criteria for the final score.",
    icon: Sparkles,
    position: "bottom",
  },
  {
    targetId: "coach-chat-trigger",
    title: "Your 24/7 Tactical AI",
    content: "The AI Coach isn't just for chat. It can navigate you to any page, give you tips on rhetoric, or help you understand your recent performance metrics.",
    icon: Sparkles,
    position: "top",
  },
  {
    targetId: "nav-profile",
    title: "The Digital Resume",
    content: "Your profile is a living document of your growth. Let's look at the metrics that define your SpeakBold ranking.",
    icon: Trophy,
    position: "bottom",
    redirectTo: "/profile"
  },
  {
    targetId: "daily-challenges-container",
    title: "Daily Consistency",
    content: "Consistency is the only path to mastery. Daily Challenges reward you with XP and help you maintain your Streak. Completing all three challenges grants a massive bonus.",
    icon: Target,
    position: "top",
  },
  {
    targetId: "profile-recordings-tab",
    title: "The Vault: Technical History",
    content: "Every recording you ever make is saved here. You can review your filler word count, pacing charts, and AI feedback from weeks ago to see exactly how far you've come.",
    icon: Mic,
    position: "top",
  },
  {
    targetId: "nav-leaderboard",
    title: "Global Rankings",
    content: "Want to see how you stack up? The Leaderboard shows the top operators in the world. Compete for the #1 spot and make your mark on the SpeakBold community.",
    icon: Trophy,
    position: "bottom",
    redirectTo: "/leaderboard"
  },
  {
    targetId: "site-navigation",
    title: "The Path Forward",
    content: "You now know the ins and outs. The goal isn't perfection—it's progress. Start your first mission on the Pathway and find your voice. Good luck, Operator.",
    icon: Sparkles,
    position: "center",
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
    // Developer Utilities
    (window as any).resetOnboarding = async () => {
      localStorage.removeItem("speakbold_onboarding_v2");
      localStorage.removeItem("speakbold_tutorial_pending");
      localStorage.removeItem("speakbold_pathway_selection");
      
      if (user) {
        localStorage.removeItem(`speakbold_tutorial_pending_${user.id}`);
        localStorage.removeItem(`speakbold_onboarding_v2_${user.id}`);
        
        try {
          const { supabase } = await import("@/integrations/supabase/client");
          // Clear onboarding flag in DB
          await supabase
            .from("custom_prompts")
            .delete()
            .eq("user_id", user.id)
            .eq("client_id", "system_onboarding_done");
            
          // Reset profile fields
          await supabase
            .from("profiles")
            .update({ 
              strengths: [], 
              weaknesses: [], 
              pathway_selection: null,
              pathway_progress: {} 
            })
            .eq("id", user.id);
            
          console.log("✅ SpeakBold DB Records, Onboarding & Tutorial reset. Refreshing page...");
        } catch (err) {
          console.error("❌ Failed to reset DB records:", err);
        }
      }
      
      window.location.reload();
    };

    (window as any).startTutorial = () => {
      if (!user) {
        console.error("❌ Must be logged in to start tutorial.");
        return;
      }
      localStorage.setItem(`speakbold_tutorial_pending_${user.id}`, "true");
      console.log("🎯 Tutorial queued for next visit to /pathway. Redirecting...");
      window.location.href = "/pathway";
    };

    return () => {
      delete (window as any).resetOnboarding;
      delete (window as any).startTutorial;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const pending = localStorage.getItem(`speakbold_tutorial_pending_${user.id}`);
    if (pending === "true") {
      // Only start if we are on the pathway page
      if (location.pathname === "/pathway" && !isVisible) {
        const timer = setTimeout(() => {
          console.log("🎬 Starting In-Depth Tutorial Flow...");
          setCurrentStep(0);
          setIsVisible(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [location.pathname, isVisible, user]);

  useEffect(() => {
    setTargetRect(null);
  }, [currentStep]);

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
      />

      {/* Target Highlight Pulse */}
      <AnimatePresence>
        {targetRect && targetRect.width < 400 && targetRect.height < 150 && (
          <motion.div 
            key={`pulse-${currentStep}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 1, 0], scale: [1, 1.2, 1.4] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
              className="absolute border-2 border-primary/50 rounded-2xl pointer-events-none z-[301] shadow-glow shadow-primary/20"
              style={{
                top: targetRect.top - 12,
                left: targetRect.left - 12,
                width: targetRect.width + 24,
                height: targetRect.height + 24,
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 0.5, 0], scale: [1, 1.4, 1.8] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
              className="absolute border border-primary/30 rounded-2xl pointer-events-none z-[301]"
              style={{
                top: targetRect.top - 12,
                left: targetRect.left - 12,
                width: targetRect.width + 24,
                height: targetRect.height + 24,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          style={{
            top: targetRect
              ? (window.innerWidth < 768
                ? Math.max(10, Math.min(targetRect.bottom + 12, window.innerHeight - 250))
                : (step.position === "bottom"
                  ? Math.max(80, Math.min(targetRect.bottom + 24, window.innerHeight - 320))
                  : Math.max(20, Math.min(targetRect.top - 300, window.innerHeight - 350))))
              : "50%",
            left: targetRect
              ? (window.innerWidth < 768
                ? "20px"
                : Math.max(20, Math.min(targetRect.left + targetRect.width / 2 - 160, window.innerWidth - 340)))
              : "50%",
          }}
          drag
          dragElastic={0.1}
          dragMomentum={false}
          whileDrag={{
            scale: 1.02,
            boxShadow: "0 40px 80px rgba(0,0,0,0.4)",
            cursor: "grabbing",
            transition: { duration: 0.1 }
          }}
          transition={{
            type: "spring",
            stiffness: 1000,
            damping: 50,
            opacity: { duration: 0.2 },
            scale: { type: "spring", stiffness: 400, damping: 25 },
          }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className={cn(
            "absolute pointer-events-auto w-[calc(100vw-40px)] md:w-[320px] bg-card border border-border shadow-2xl rounded-[2rem] p-6 md:p-8 space-y-4 md:space-y-6 z-[301] touch-none cursor-grab active:cursor-grabbing",
            !targetRect && "-translate-x-1/2 -translate-y-1/2"
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
