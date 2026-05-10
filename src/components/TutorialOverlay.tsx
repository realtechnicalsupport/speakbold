import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X, Sparkles, Target, Mic, Trophy, GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface Step {
  targetId: string;
  title: string;
  content: string;
  icon: React.ElementType;
  position: "top" | "bottom" | "left" | "right" | "center";
  redirectTo?: string;
  actionRequired?: boolean;
  actionId?: string;
  allowScroll?: boolean;
  advanceOnAppearance?: boolean;
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
    targetId: "tutorial-current-node",
    title: "Start Your Mission",
    content: "This is your current focus. Click the node to open the Drill Modal and see your specific tactical objectives.",
    icon: Target,
    position: "top",
    actionRequired: true,
    actionId: "tutorial-current-node"
  },
  {
    targetId: "tutorial-drill-content",
    title: "The Point of No Return",
    content: "Read your prompt and instructions carefully. When you're ready to speak, click BEGIN DRILL to start the timer.",
    icon: Mic,
    position: "top",
    actionRequired: true,
    actionId: "tutorial-begin-drill"
  },
  {
    targetId: "tutorial-recording-content",
    title: "Vocal Endurance",
    content: "The timer is now running! Speak clearly and try to use the full time. Silence is where growth happens—the tutorial will advance once you finish or the timer hits zero.",
    icon: Sparkles,
    position: "top",
    actionRequired: true,
    actionId: "tutorial-finish-analyze"
  },
  {
    targetId: "tutorial-audit-results",
    title: "High-Stakes AI Audit",
    content: "Once the timer hits zero, our AI dissects your speech. You'll get a score based on pacing, clarity, and objective fulfillment. Use the 'Model Speech' to see exactly how to level up. You can scroll through the results now. Click CONTINUE to see your progress.",
    icon: Sparkles,
    position: "top",
    allowScroll: true,
    actionRequired: true,
    actionId: "tutorial-close-drill"
  },
  {
    targetId: "pathway-progress",
    title: "Mastery Metrics",
    content: "This bar tracks your total progress across the units. Every successful drill adds to your XP. Reach 100% to unlock your final certification and the 'Elite Orator' status.",
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
    content: "The Arena is the ultimate test. This is where you put your training into practice against AI personalities or other real users in real-time. Let's head there now.",
    icon: Trophy,
    position: "bottom",
    redirectTo: "/arena"
  },
  {
    targetId: "arena-gamemodes",
    title: "Strategic Modes",
    content: "Choose your battle format. Blitz is fast, Pitch is for persuasion, and Debate is for logic. Each has a different timer and judging criteria.",
    icon: Sparkles,
    position: "bottom",
  },
  {
    targetId: "tutorial-find-partner",
    title: "Initiate Matchmaking",
    content: "Ready to test your skills? Click FIND PARTNER to enter the global matchmaking queue. The system will search for an opponent with a similar ELO rating.",
    icon: Target,
    position: "top",
    actionRequired: true,
    actionId: "tutorial-find-partner"
  },
  {
    targetId: "tutorial-matchmaking-radar",
    title: "Scanning the Network",
    content: "The system is searching for an opponent. Stay here—once a match is found, the tutorial will advance automatically.",
    icon: Mic,
    position: "center",
    actionRequired: true,
    actionId: "tutorial-arena-battle-view",
    advanceOnAppearance: true
  },
  {
    targetId: "tutorial-arena-battle-view",
    title: "Combat Synced",
    content: "Match secured! Read the prompt and click READY UP to begin. Both of you will answer the same topic. The tutorial will continue once the results are in.",
    icon: Sparkles,
    position: "center",
    actionRequired: true,
    actionId: "tutorial-elo-update",
    advanceOnAppearance: true,
    allowScroll: true
  },
  {
    targetId: "tutorial-elo-update",
    title: "Winning the ELO",
    content: "Victory in the Arena awards you ELO points. High ELO unlocks new ranks and prestige. Be warned: forfeiting a battle results in an automatic loss and heavy point deduction.",
    icon: Trophy,
    position: "center",
  },
  {
    targetId: "tutorial-arena-history",
    title: "Battle Archives",
    content: "Your previous combat data is stored here. You can review transcripts and AI scores to study your wins and losses.",
    icon: Target,
    position: "top",
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
  const { user, onboardingDone, tutorialDone, refreshUserStatus } = useAuth();
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    // Developer Utilities
    (window as any).resetOnboarding = async () => {
      if (!user) {
        console.error("🚫 Must be logged in to reset.");
        return;
      }

      if (confirm("Reset all onboarding and tutorial progress?")) {
        try {
          const { supabase } = await import("@/integrations/supabase/client");
          
          // Reset profiles table flags
          await supabase
            .from("profiles")
            .update({ 
              onboarding_done: false, 
              tutorial_done: false,
              pathway_progress: {},
              strengths: [],
              weaknesses: []
            })
            .eq("id", user.id);
            
          localStorage.clear();
          await refreshUserStatus();
          
          console.log("✅ SpeakBold DB Records, Onboarding & Tutorial reset. Refreshing page...");
          window.location.reload();
        } catch (err) {
          console.error("❌ Failed to reset DB records:", err);
        }
      }
    };

    (window as any).startTutorial = () => {
      if (!user) {
        console.error("Γ¥î Must be logged in to start tutorial.");
        return;
      }
      localStorage.setItem(`speakbold_tutorial_pending_${user.id}`, "true");
      console.log("Γî» Tutorial queued for next visit to /pathway. Redirecting...");
      window.location.href = "/pathway";
    };

    (window as any).startArenaTutorial = () => {
      if (!user) {
        console.error("Γ¥î Must be logged in to start tutorial.");
        return;
      }
      setCurrentStep(9); // Index 9 is "The Arena: Live Combat"
      setIsVisible(true);
      if (window.location.pathname !== "/arena") {
        navigate("/arena");
      }
      console.log("Γî» Arena Tutorial started.");
    };

    (window as any).jumpToStep = (index: number) => {
      if (index >= 0 && index < STEPS.length) {
        const step = STEPS[index];
        if (step.redirectTo) {
          navigate(step.redirectTo);
        }
        setCurrentStep(index);
        setIsVisible(true);
        console.log(`Γî» Jumped to tutorial step ${index}: ${step.title}`);
      } else {
        console.error("Γ¥î Invalid step index.");
      }
    };

    return () => {
      delete (window as any).resetOnboarding;
      delete (window as any).startTutorial;
      delete (window as any).startArenaTutorial;
      delete (window as any).jumpToStep;
    };
  }, [user, refreshUserStatus]);

  useEffect(() => {
    if (!user) return;
    
    // Auto-start tutorial if onboarding is done but tutorial is not
    if (onboardingDone && !tutorialDone) {
      const pending = localStorage.getItem(`speakbold_tutorial_pending_${user.id}`);
      
      // We also check a local flag to see if it's "pending" (this allows us to delay it until /pathway)
      if (pending === "true" || !tutorialDone) {
        if (location.pathname === "/pathway" && !isVisible && currentStep === null) {
          const timer = setTimeout(() => {
            console.log("Γî¼ Starting In-Depth Tutorial Flow...");
            setCurrentStep(0);
            setIsVisible(true);
          }, 1500);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [location.pathname, isVisible, user, onboardingDone, tutorialDone, currentStep]);

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

  const handleNext = React.useCallback(() => {
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
  }, [currentStep, navigate]);

  // Listener for interactive actions
  useEffect(() => {
    if (!isVisible || currentStep === null) return;
    const step = STEPS[currentStep];
    if (!step.actionRequired || !step.actionId) return;

    // We use a MutationObserver to watch for the element if it doesn't exist yet (e.g. in a modal)
    const checkForElement = () => {
      const el = document.getElementById(step.actionId!);
      if (el) {
        if (step.advanceOnAppearance) {
          handleNext();
          return true;
        }
        const handleAction = () => {
          setTimeout(() => handleNext(), 300);
        };
        el.addEventListener("click", handleAction, { once: true });
        
        // Also listen for custom events (e.g. timer finished)
        const handleCustomEvent = (e: any) => {
          if (e.detail?.id === step.actionId) {
             handleAction();
          }
        };
        window.addEventListener("tutorial-action-complete", handleCustomEvent, { once: true });
        
        return () => {
          el.removeEventListener("click", handleAction);
          window.removeEventListener("tutorial-action-complete", handleCustomEvent);
        };
      }
      return null;
    };

    let cleanup = checkForElement();
    if (cleanup) return typeof cleanup === "function" ? cleanup : undefined;

    const observer = new MutationObserver(() => {
      cleanup = checkForElement();
      if (cleanup) observer.disconnect();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (typeof cleanup === "function") cleanup();
    };
  }, [currentStep, isVisible, handleNext]);

  const handleComplete = async () => {
    setIsVisible(false);
    if (user) {
      localStorage.removeItem(`speakbold_tutorial_pending_${user.id}`);
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        // Update profile directly
        await supabase
          .from("profiles")
          .update({ tutorial_done: true })
          .eq("id", user.id);
          
        await refreshUserStatus();
        console.log("Γ£à Tutorial completion saved to Profile and synced.");
      } catch (err) {
        console.error("Failed to save tutorial completion to Profile:", err);
      }
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
        className={cn(
          "absolute inset-0 bg-background/60 backdrop-blur-sm",
          step.allowScroll ? "pointer-events-none" : "pointer-events-auto"
        )}
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
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity">
            <GripHorizontal className="h-3 w-3" />
            <span className="text-[6px] font-black tracking-[0.2em] uppercase">DRAG TO MOVE</span>
          </div>

          <div className="flex items-center justify-between mt-2">
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
            {!step.actionRequired && (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary group"
              >
                {currentStep === STEPS.length - 1 ? "Finish" : "Next"}
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
            {step.actionRequired && (
               <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">
                  Perform Action to Continue
               </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
