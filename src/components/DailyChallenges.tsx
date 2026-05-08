import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Zap,
  Clock,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Gift,
  Mic,
  MicOff,
  ShieldCheck,
  Target,
  Microscope,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useMyXp } from "@/hooks/useLeaderboard";
import { useRecordings } from "@/hooks/useRecordings";
import { RecordingFeedbackModal } from "@/components/RecordingFeedback";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { setRecordingActive } from "@/lib/recordingState";
import { motion, AnimatePresence } from "framer-motion";

type DailyChallenge = {
  id: string;
  title: string;
  prompt: string;
  duration: number; // seconds
  difficulty: "easy" | "medium" | "hard";
  category: string;
  xp: number;
};

const DAILY_CHALLENGES: DailyChallenge[] = [
  {
    id: "elevator-pitch",
    title: "Elevator Pitch",
    prompt: "Introduce yourself in 30 seconds. Imagine you're meeting someone important.",
    duration: 30,
    difficulty: "easy",
    category: "Identity",
    xp: 10,
  },
  {
    id: "explain-it-simply",
    title: "Simplify It",
    prompt: "Explain a difficult idea to a 10-year-old. Keep it simple and clear.",
    duration: 60,
    difficulty: "medium",
    category: "Precision",
    xp: 20,
  },
  {
    id: "impromptu-story",
    title: "Storytelling",
    prompt: "Tell a story about a time you failed and what you learned from it.",
    duration: 90,
    difficulty: "hard",
    category: "Narrative",
    xp: 30,
  },
];

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getStorageKey = (userId?: string | null) => {
  if (!userId) return null;
  return `speakbold.dailyChallenges.v1.${userId}`;
};

const readState = (userId?: string | null) => {
  const key = getStorageKey(userId);
  if (!key) return { date: todayKey(), completed: [] };
  
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { date: todayKey(), completed: [] };
    const parsed = JSON.parse(raw);
    if (parsed.date !== todayKey()) return { date: todayKey(), completed: [] };
    return parsed;
  } catch {
    return { date: todayKey(), completed: [] };
  }
};

const writeState = (state: any, userId?: string | null) => {
  const key = getStorageKey(userId);
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch { /* noop */ }
};

export const DailyChallenges = () => {
  const { user } = useAuth();
  const { xp: realXp } = useMyXp();
  
  const [state, setState] = useState({ date: todayKey(), completed: [] as {id: string, completedAt: string}[] });
  const [activeChallenge, setActiveChallenge] = useState<DailyChallenge | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [recordEnabled, setRecordEnabled] = useState(false);
  const [currentRecordingId, setCurrentRecordingId] = useState<string | null>(null);
  const [isProcessingFeedback, setIsProcessingFeedback] = useState(false);
  const timerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  
  useEffect(() => { setState(readState(user?.id)); }, [user?.id]);
  
  useEffect(() => {
    if (!isRunning || !activeChallenge) return;
    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timerRef.current!);
          setIsRunning(false);
          setIsComplete(true);
          handleComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [isRunning, activeChallenge]);
  
  const handleComplete = useCallback(async () => {
    if (!activeChallenge) return;
    
    // Award XP via supabase
    if (user) {
        const { data: xpData } = await supabase.from("user_xp").select("total_xp").eq("user_id", user.id).maybeSingle();
        const xpAmount = activeChallenge.xp;
        const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous';
        if (!xpData) {
            await supabase.from("user_xp").insert({ user_id: user.id, total_xp: xpAmount, display_name: displayName });
        } else {
            await supabase.from("user_xp").update({ total_xp: (xpData.total_xp || 0) + xpAmount, display_name: displayName }).eq("user_id", user.id);
        }
        window.dispatchEvent(new Event("xp-updated"));
        toast.success(`+${xpAmount} XP earned!`);
    }
    
    if (recordEnabled && activeChallenge && user) {
      setIsProcessingFeedback(true);
      await stopRecording();
      const blob = getRecordingBlob();
      if (blob) {
        const fileName = `${user.id}/${activeChallenge.id}-${Date.now()}.webm`;
        const { error: uploadError } = await supabase.storage.from("Recordings").upload(fileName, blob);
        if (!uploadError) {
          const { data: recData } = await supabase.from("recordings").insert({
            user_id: user.id,
            prompt_text: activeChallenge.title,
            difficulty: activeChallenge.difficulty,
            duration_ms: activeChallenge.duration * 1000,
            target_seconds: activeChallenge.duration,
            storage_path: fileName,
          }).select("id").single();
          if (recData) {
            setCurrentRecordingId(recData.id);
          }
        }
      }
      setIsProcessingFeedback(false);
    }
    
    setState((prev) => {
      const alreadyCompleted = prev.completed.some((c) => c.id === activeChallenge.id);
      if (alreadyCompleted) return prev;
      const next = {
        ...prev,
        completed: [...prev.completed, { id: activeChallenge.id, completedAt: new Date().toISOString() }],
      };
      writeState(next, user?.id);
      setShowReward(true);
      setRecordingActive(false);
      return next;
    });
  }, [activeChallenge, user?.id, recordEnabled]);

  const startChallenge = (challenge: DailyChallenge) => {
    setActiveChallenge(challenge);
    setTimeLeft(challenge.duration);
    setIsRunning(false);
    setIsComplete(false);
    setShowReward(false);
    setCurrentRecordingId(null);
    setRecordEnabled(false);
    stopRecording();
  };

  const startRecording = async () => {
    if (!recordEnabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.start(100);
    } catch (err) { console.error(err); }
  };

  const stopRecording = () => {
    return new Promise<void>((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = () => {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
          resolve();
        };
        mediaRecorderRef.current.stop();
      } else {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        resolve();
      }
    });
  };

  const getRecordingBlob = () => chunksRef.current.length === 0 ? null : new Blob(chunksRef.current, { type: 'audio/webm' });

  const toggleTimer = async () => {
    if (!isRunning && recordEnabled) {
      await startRecording();
      setRecordingActive(true);
    } else if (isRunning) {
      stopRecording();
      setRecordingActive(false);
    }
    setIsRunning((prev) => !prev);
  };

  const resetTimer = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (activeChallenge) setTimeLeft(activeChallenge.duration);
    setIsRunning(false);
    setIsComplete(false);
    setShowReward(false);
    stopRecording();
    setRecordingActive(false);
  };

  const closeChallenge = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setActiveChallenge(null);
    setIsRunning(false);
    setIsComplete(false);
    setShowReward(false);
  };

  const isCompleted = (id: string) => state.completed.some((c) => c.id === id);
  const completedCount = state.completed.length;
  const progressPct = (completedCount / DAILY_CHALLENGES.length) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-12" id="daily-challenges-container">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
        <div className="space-y-6">
          <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.6em] text-primary">
            <Target className="h-4 w-4" />
            DAILY PRACTICE
          </div>
          <h2 className="speak-serif text-4xl md:text-7xl leading-none tracking-tighter">
            Daily <span className="text-primary italic">Challenges</span>.
          </h2>
          <p className="text-lg font-medium opacity-40 max-w-xl leading-relaxed italic">
            New challenges every day. Practice consistently to build your confidence.
          </p>
        </div>
        
        <div className="flex items-center gap-10">
          <div className="text-right">
             <div className="speak-serif text-5xl font-bold tabular-nums italic text-primary leading-none">{realXp ?? 0}</div>
             <p className="text-xs font-black uppercase tracking-[0.4em] opacity-30 mt-2">TOTAL XP</p>
          </div>
          <div className="h-16 w-16 rounded-[2rem] bg-primary shadow-glow shadow-primary/20 flex items-center justify-center animate-pulse">
            <Zap className="h-8 w-8 text-white" />
          </div>
        </div>
      </div>

      {/* Global Progress */}
      <div className="bg-muted/5 border border-border/50 rounded-[4rem] p-12 space-y-10 relative overflow-hidden shadow-soft">
        <div className="grain pointer-events-none" />
        <div className="flex items-center justify-between relative z-10">
          <span className="text-xs font-black uppercase tracking-[0.4em] opacity-40">
            {completedCount} OF {DAILY_CHALLENGES.length} CHALLENGES DONE
          </span>
          {completedCount === DAILY_CHALLENGES.length && (
            <span className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.4em] text-primary">
              <Sparkles className="h-4 w-4" /> ALL DONE!
            </span>
          )}
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/60 relative z-10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 1.5, ease: "circOut" }}
            className="h-full bg-primary shadow-glow shadow-primary/40"
          />
        </div>
      </div>

      {/* Challenges Stack */}
      <div className="grid gap-6">
        {DAILY_CHALLENGES.map((challenge, index) => {
          const completed = isCompleted(challenge.id);
          const isActive = activeChallenge?.id === challenge.id;

          return (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "relative bg-muted/5 border rounded-[3rem] transition-all duration-700 overflow-hidden shadow-soft",
                completed ? "border-primary/30 opacity-60" : isActive ? "border-primary shadow-glow shadow-primary/5" : "border-border/60 hover:border-primary/20"
              )}
            >
              <div className="grain pointer-events-none" />
              
              {/* Challenge Top Bar */}
              <button
                className="w-full p-10 md:p-12 text-left flex items-center gap-10 disabled:cursor-default"
                onClick={() => !completed && !isActive && startChallenge(challenge)}
                disabled={completed}
              >
                <div className={cn(
                  "h-16 w-16 rounded-[1.5rem] flex items-center justify-center speak-serif text-2xl font-bold italic transition-all duration-700 shrink-0",
                  completed ? "bg-primary text-white" : "bg-muted/20 text-foreground/20"
                )}>
                  {completed ? <CheckCircle2 className="h-6 w-6" /> : `0${index + 1}`}
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-4">
                    <h3 className="speak-serif text-3xl italic tracking-tighter">{challenge.title}</h3>
                    <span className={cn(
                      "text-[11px] font-black uppercase tracking-[0.4em] px-3 py-1 rounded-full",
                      challenge.difficulty === "easy" ? "bg-primary/10 text-primary" : challenge.difficulty === "medium" ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"
                    )}>{challenge.difficulty}</span>
                  </div>
                  <p className="text-sm font-medium opacity-40 leading-relaxed italic truncate max-w-lg">"{challenge.prompt}"</p>
                  <div className="flex items-center gap-6 pt-2 text-[11px] font-black uppercase tracking-[0.4em] opacity-20">
                    <span className="flex items-center gap-2"><Clock className="h-3 w-3" /> {formatTime(challenge.duration)}</span>
                    <span className="flex items-center gap-2"><MessageSquare className="h-3 w-3" /> {challenge.category}</span>
                    <span className="flex items-center gap-2 text-primary opacity-100"><Zap className="h-3 w-3" /> +{challenge.xp} XP</span>
                  </div>
                </div>

                {!completed && !isActive && <ChevronRight className="h-8 w-8 opacity-10 group-hover:opacity-40 transition-opacity" />}
              </button>

              {/* Active Drill Interface */}
              <AnimatePresence>
                {isActive && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.8, ease: "circOut" }}
                    className="border-t border-border/60 bg-primary/[0.02]"
                  >
                    <div className="p-12 md:p-16 space-y-16">
                       {!isComplete ? (
                         <div className="space-y-16">
                            {/* Visual Timer */}
                            <div className="flex flex-col items-center gap-12">
                               <div className="relative h-40 w-40 md:h-52 md:w-52 flex items-center justify-center">
                                  <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                                     <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted/10" />
                                     <motion.circle 
                                       cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" 
                                       className="text-primary shadow-glow"
                                       strokeDasharray="301.6"
                                       animate={{ strokeDashoffset: 301.6 * (1 - timeLeft / challenge.duration) }}
                                       transition={{ duration: 1, ease: "linear" }}
                                     />
                                  </svg>
                                   <div className="text-center space-y-2 relative z-10">
                                      <div className="speak-serif text-4xl md:text-7xl font-bold tabular-nums italic leading-none">{formatTime(timeLeft)}</div>
                                      <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-20">TIME LEFT</p>
                                   </div>
                               </div>

                               <div className="p-8 rounded-[3rem] bg-background/50 border border-border/60 max-w-xl text-center shadow-soft">
                                  <p className="speak-serif text-xl md:text-2xl italic opacity-80 leading-relaxed">"{challenge.prompt}"</p>
                               </div>
                            </div>

                            {/* Controls Area */}
                            <div className="flex flex-col items-center gap-10">
                               {!isRunning && timeLeft === challenge.duration && (
                                 <div className="flex items-center gap-6 p-4 rounded-full bg-muted/10 border border-border/60">
                                    <div className="flex items-center gap-3 px-6 border-r border-border/60">
                                       {recordEnabled ? <Mic className="h-4 w-4 text-primary" /> : <MicOff className="h-4 w-4 text-foreground/20" />}
                                       <span className="text-xs font-black uppercase tracking-widest">{recordEnabled ? "RECORDING ON" : "RECORDING OFF"}</span>
                                    </div>
                                    <button onClick={() => setRecordEnabled(!recordEnabled)} className="text-xs font-black uppercase tracking-widest text-primary hover:opacity-70 transition-opacity pr-6">
                                       {recordEnabled ? "OFF" : "ON"}
                                    </button>
                                 </div>
                               )}

                               <div className="flex items-center gap-8">
                                  <button onClick={toggleTimer} className={cn("button-pill px-16 py-6 group", isRunning ? "bg-white text-primary border-white" : "bg-primary text-white shadow-glow")}>
                                     {isRunning ? <><Pause className="h-5 w-5 fill-primary" /> <span className="text-xs font-black uppercase tracking-[0.3em]">PAUSE</span></> : <><Play className="h-5 w-5 fill-white" /> <span className="text-xs font-black uppercase tracking-[0.3em]">{timeLeft === challenge.duration ? "START" : "RESUME"}</span></>}
                                  </button>
                                  <button onClick={resetTimer} className="h-16 w-16 rounded-full border border-border/60 flex items-center justify-center opacity-30 hover:opacity-100 transition-all group">
                                     <RotateCcw className="h-5 w-5 group-hover:rotate-[-45deg] transition-transform" />
                                  </button>
                                  <button onClick={closeChallenge} className="text-xs font-black uppercase tracking-[0.3em] opacity-20 hover:opacity-100 transition-all">EXIT</button>
                               </div>
                            </div>
                         </div>
                       ) : (
                         /* Success Module */
                         <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-12 py-10">
                            <div className="h-32 w-32 rounded-[3rem] bg-primary shadow-glow shadow-primary/20 mx-auto flex items-center justify-center animate-float">
                               <Gift className="h-12 w-12 text-white" />
                            </div>
                            <div className="space-y-4">
                               <h3 className="speak-serif text-4xl italic tracking-tighter">Challenge Complete!</h3>
                               <p className="text-sm font-medium opacity-40 uppercase tracking-[0.4em]">REWARD: <span className="text-primary font-black">+{challenge.xp} XP</span></p>
                            </div>

                             <div className="flex flex-col items-center gap-10">
                               {isProcessingFeedback ? (
                                 <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.5em] opacity-20 animate-pulse">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    PROCESSING RECORDING...
                                 </div>
                               ) : currentRecordingId ? (
                                 <RecordingFeedbackModal 
                                   recordingId={currentRecordingId}
                                   trigger={
                                     <button className="button-pill px-12 py-5 bg-white text-primary border-white shadow-xl group">
                                       <Sparkles className="h-4 w-4 mr-2" />
                                       <span className="text-xs font-black uppercase tracking-[0.2em]">SEE AI FEEDBACK</span>
                                     </button>
                                   } 
                                 />
                               ) : (
                                 <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.5em] opacity-20">
                                    <Microscope className="h-4 w-4" />
                                    {recordEnabled ? "FEEDBACK NOT AVAILABLE" : "RECORD TO SEE AI FEEDBACK"}
                                 </div>
                               )}

                               <div className="flex items-center gap-8 border-t border-border/60 pt-10 w-full justify-center">
                                  <button onClick={closeChallenge} className="text-xs font-black uppercase tracking-[0.3em] opacity-20 hover:opacity-100 transition-all">CLOSE</button>
                                  {completedCount < DAILY_CHALLENGES.length && (
                                    <button onClick={() => {
                                      const next = DAILY_CHALLENGES.find((c) => !isCompleted(c.id));
                                      if (next) startChallenge(next);
                                      else closeChallenge();
                                    }} className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.3em] text-primary group">
                                       NEXT CHALLENGE <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                  )}
                               </div>
                            </div>
                         </motion.div>
                       )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Track Upgrade Card */}
      <div className="bg-muted/5 border border-dashed border-primary/40 rounded-[4rem] p-12 md:p-20 relative overflow-hidden group">
        <div className="grain pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12 relative z-10">
          <div className="flex items-center gap-8">
            <div className="h-20 w-20 rounded-[2.5rem] bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-3">
              <h4 className="speak-serif text-3xl md:text-4xl italic tracking-tighter">Want more?</h4>
              <p className="text-lg font-medium opacity-40 leading-relaxed max-w-sm">Get more practice in the Impromptu track.</p>
            </div>
          </div>
          <Link to="/tracks/impromptu" className="button-pill px-12 py-5 border-border/60 hover:border-primary/40 hover:bg-primary/[0.03] transition-all">
             <span className="text-xs font-black uppercase tracking-[0.2em]">EXPLORE TRACK</span>
             <ChevronRight className="h-4 w-4 ml-2" />
          </Link>
        </div>
      </div>
    </div>
  );
};
