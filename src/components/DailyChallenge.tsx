import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Flame, CheckCircle2 } from "lucide-react";
import { useStreak } from "@/hooks/useStreak";
import { RecorderPanel } from "@/components/RecorderPanel";
import { useInView } from "@/hooks/useInView";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Expose supabase to window for debugging
if (typeof window !== 'undefined') (window as any).__SUPABASE_CLIENT__ = supabase;

// Test function you can call from console: window.testDailyXP()
if (typeof window !== 'undefined') {
  (window as any).testDailyXP = async (amount: number = 15) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { console.log("Not logged in!"); return; }
    
    console.log("[testDailyXP] Testing with", amount, "XP for", user.id);
    
    // Try user_xp
    const { data: xpData, error: xpError } = await supabase
      .from("user_xp")
      .select("total_xp")
      .eq("user_id", user.id)
      .maybeSingle();
    
    console.log("[testDailyXP] Current XP:", xpData, "Error:", xpError);
    
    if (xpError) {
      console.error("[testDailyXP] Cannot read user_xp:", xpError);
      return;
    }
    
    if (!xpData) {
      // Insert
      const { error } = await supabase
        .from("user_xp")
        .insert({ user_id: user.id, total_xp: amount });
      console.log("[testDailyXP] Inserted new XP. Error:", error);
    } else {
      // Update
      const newTotal = (xpData.total_xp || 0) + amount;
      const { error } = await supabase
        .from("user_xp")
        .update({ total_xp: newTotal })
        .eq("user_id", user.id);
      console.log("[testDailyXP] Updated XP to", newTotal, "Error:", error);
    }
    
    // Verify
    const { data: verify } = await supabase
      .from("user_xp")
      .select("total_xp")
      .eq("user_id", user.id)
      .maybeSingle();
    console.log("[testDailyXP] Verification - new total:", verify?.total_xp);
  };
}

const DAILY_PROMPTS = [
  "The best advice you've ever ignored.",
  "Describe a smell that instantly takes you somewhere.",
  "If you could ban one word from meetings, which and why?",
  "The smallest decision that changed your life.",
  "Convince me to try your favorite hobby in 60 seconds.",
  "A time you were wrong — and what you did about it.",
  "What does 'home' mean to you right now?",
  "The most underrated skill in your field.",
  "A rule you break on purpose.",
  "Something you believed at 15 that you don't anymore.",
  "The last thing that genuinely surprised you.",
  "If your week had a title, what would it be?",
  "A person who shaped you without knowing it.",
  "What you'd tell a room of nervous first-day interns.",
];

const dayOfYear = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000);
};

const DURATION = 60;

const awardDailyXP = async (userId: string, userEmail?: string) => {
  const xpReward = 15;
  console.log("[DailyChallenge] Awarding", xpReward, "XP to userId:", userId);
  console.log("[DailyChallenge] Using user_xp table");
  
  const { data: xpData, error: xpError } = await supabase
    .from("user_xp")
    .select("total_xp")
    .eq("user_id", userId)
    .maybeSingle();
  
  console.log("[DailyChallenge] xpData:", xpData, "xpError:", xpError);
  
  if (xpError) {
    console.error("[DailyChallenge] user_xp fetch error:", xpError);
    toast.error("Failed to fetch XP: " + xpError.message);
    return;
  }

  if (!xpData) {
    console.log("[DailyChallenge] Creating new user_xp record for userId:", userId);
    const displayName = userEmail?.split('@')[0] || 'Anonymous';
    const { error: insertError } = await supabase
      .from("user_xp")
      .insert({ user_id: userId, total_xp: xpReward, display_name: displayName });
    if (insertError) {
      console.error("[DailyChallenge] user_xp insert error:", insertError);
      toast.error("Failed to insert XP: " + insertError.message);
    } else {
      console.log("[DailyChallenge] XP inserted to user_xp:", xpReward);
      toast.success(`🎉 +${xpReward} XP awarded!`);
      window.dispatchEvent(new Event("xp-updated"));
    }
  } else {
    const newTotal = (xpData.total_xp || 0) + xpReward;
    const displayName = userEmail?.split('@')[0] || 'Anonymous';
    console.log("[DailyChallenge] Updating user_xp from", xpData.total_xp, "to", newTotal);
    const { error: updateError } = await supabase
      .from("user_xp")
      .update({ total_xp: newTotal, display_name: displayName })
      .eq("user_id", userId);
    if (updateError) {
      console.error("[DailyChallenge] user_xp update error:", updateError);
      toast.error("Failed to update XP: " + updateError.message);
    } else {
      console.log("[DailyChallenge] XP updated in user_xp:", newTotal);
      toast.success(`✨ +${xpReward} XP earned!`);
      window.dispatchEvent(new Event("xp-updated"));
    }
  }
};

export const DailyChallenge = () => {
  const { user } = useAuth();
  const prompt = useMemo(() => DAILY_PROMPTS[dayOfYear() % DAILY_PROMPTS.length], []);
  const [left, setLeft] = useState(DURATION);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const ref = useRef<number | null>(null);
  const { count, practicedToday, markPracticed } = useStreak();
  const { ref: sectionRef, isInView } = useInView({ threshold: 0.05 });
  
  const recorderRef = useRef<{ start: () => void; pause: () => void; resume: () => void; stop: () => void } | null>(null);
  
  useEffect(() => {
    if (running && recorderRef.current) {
      if (left === DURATION) {
        recorderRef.current.start();
      } else {
        recorderRef.current.resume();
      }
    } else if (!running && recorderRef.current && left < DURATION && !finished) {
      recorderRef.current.pause();
    } else if (finished && recorderRef.current) {
      // Don't auto-stop - let user manually stop
      // recorderRef.current.stop();
    }
  }, [running, finished, left]);

  useEffect(() => {
    if (!running) return;
    ref.current = window.setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          window.clearInterval(ref.current!);
          setRunning(false);
          setFinished(true);
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => {
      if (ref.current) window.clearInterval(ref.current);
    };
  }, [running]);

  // Award XP when timer finishes (separate effect)
  useEffect(() => {
    console.log("[DailyChallenge] useEffect triggered, finished:", finished, "user:", user?.id);
    if (!finished) return;
    markPracticed();
    // Award XP if user is logged in
    if (user) {
      console.log("[DailyChallenge] Timer ended, user logged in, awarding XP...");
      awardDailyXP(user.id, user.email);
    } else {
      console.log("[DailyChallenge] Timer ended, user NOT logged in, skipping XP");
    }
  }, [finished, user]);

  const reset = () => {
    if (ref.current) window.clearInterval(ref.current);
    setLeft(DURATION);
    setRunning(false);
    setFinished(false);
  };

  const pct = ((DURATION - left) / DURATION) * 100;

  return (
    <section className="container py-20 md:py-28 border-t border-border" ref={sectionRef}>
      <div className="grid md:grid-cols-5 gap-6">
        <div className={`md:col-span-3 relative bg-card-gradient border border-border rounded-3xl p-8 md:p-12 overflow-hidden ${isInView ? "animate-fade-right" : "opacity-0"}`}>
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative">
            <div className="flex items-center gap-3 text-primary text-xs font-semibold tracking-[0.25em] uppercase mb-6">
              <span className="h-px w-10 bg-primary" />
              Today's 60-second challenge
            </div>

            <h2 className="font-display text-3xl md:text-5xl font-semibold leading-[1.1] mb-8 text-balance">
              "{prompt}"
            </h2>

            <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-4">
              <div
                className="h-full bg-warm transition-all duration-1000 ease-linear"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex items-baseline justify-between mb-8">
              <span className="font-display text-5xl md:text-6xl font-semibold tabular-nums">
                0:{String(left).padStart(2, "0")}
              </span>
              {finished && (
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary animate-fade-up">
                  <CheckCircle2 className="h-4 w-4" /> Counted toward your streak
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {!running && left === DURATION && !finished && (
                <Button variant="hero" size="lg" onClick={() => { console.log("[DailyChallenge] START clicked"); setRunning(true); }}>
                  <Play className="h-4 w-4" /> Start speaking
                </Button>
              )}
              {running && (
                <Button variant="spotlight" size="lg" onClick={() => setRunning(false)}>
                  <Pause className="h-4 w-4" /> Pause
                </Button>
              )}
              {!running && left < DURATION && !finished && (
                <Button variant="hero" size="lg" onClick={() => setRunning(true)}>
                  <Play className="h-4 w-4" /> Resume
                </Button>
              )}
              {(left < DURATION || finished) && (
                <Button variant="outline" size="lg" onClick={reset}>
                  <RotateCcw className="h-4 w-4" /> Reset
                </Button>
              )}
              <Button variant="ghost" size="lg" asChild>
                <Link to="/tracks/impromptu">Full impromptu track →</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className={`md:col-span-2 bg-card-gradient border border-border rounded-3xl p-8 md:p-10 flex flex-col ${isInView ? "animate-fade-left" : "opacity-0"}`} style={{ animationDelay: "150ms" }}>
          <div className="flex items-center gap-3 text-primary text-xs font-semibold tracking-[0.25em] uppercase mb-6">
            <span className="h-px w-10 bg-primary" />
            Your streak
          </div>

          <div className="flex items-end gap-4 mb-2">
            <Flame className={`h-12 w-12 ${count > 0 ? "text-primary animate-float" : "text-muted-foreground"}`} />
            <div>
              <div className="font-display text-6xl font-semibold leading-none">{count}</div>
              <div className="text-sm text-muted-foreground mt-2">
                {count === 1 ? "day" : "days"} in a row
              </div>
            </div>
          </div>

          <p className="text-muted-foreground text-pretty leading-relaxed mt-6 mb-auto">
            {practicedToday
              ? "You've practiced today. Come back tomorrow to keep the flame alive."
              : count === 0
                ? "Finish today's 60-second challenge to start a streak. No account needed — it lives on your device."
                : "One more minute today keeps your streak going."}
          </p>

          <div className="grid grid-cols-7 gap-1.5 mt-8">
            {Array.from({ length: 7 }).map((_, i) => {
              const filled = i < Math.min(count, 7);
              return (
                <div
                  key={i}
                  className={`h-8 rounded-md ${filled ? "bg-warm" : "bg-muted"} transition-colors`}
                  aria-hidden
                />
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">Last 7 days</p>
        </div>

        <div className={`md:col-span-5 ${isInView ? "animate-fade-up" : "opacity-0"}`} style={{ animationDelay: "300ms" }}>
          <RecorderPanel
            ref={recorderRef}
            label="Your response"
            hint="Recording syncs with the timer. Hit Start speaking above, speak for 60 seconds, then play it back to hear yourself."
            recorderStartRef={() => {}}
            recorderPauseRef={() => {}}
            recorderResumeRef={() => {}}
            recorderStopRef={() => {}}
          />
        </div>
      </div>
    </section>
  );
};
