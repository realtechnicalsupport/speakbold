import { useEffect, useState } from "react";
import { Sparkles, Loader2, RefreshCw, TrendingUp, AlertCircle, X, Zap, ArrowRight, Target, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
} from "@/components/ui/dialog";
import type { RecordingFeedback } from "@/integrations/supabase/types";
import { FEEDBACK_SAVED_EVENT } from "@/hooks/useSkillProfile";

const DialogContentWithoutClose = ({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/60 backdrop-blur-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <DialogPrimitive.Content
      className={cn(
        "fixed left-[50%] top-[50%] z-50 w-full max-w-xl translate-x-[-50%] translate-y-[-50%] bg-background border border-border/60 rounded-[2rem] shadow-2xl duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 max-h-[90vh] overflow-hidden flex flex-col",
        className,
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
);

const SCORE_LABELS: Record<string, string> = {
  content_quality: "Message Quality",
  delivery: "Body Language",
  clarity: "Clarity",
  pace: "Speed",
  structure: "Structure",
  confidence: "Confidence",
};

const overallFrom = (scores: Record<string, number>): number => {
  if (typeof scores.overall === "number") return Math.round(scores.overall);
  const vals = Object.values(scores);
  if (vals.length === 0) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
};

const scoreLabel = (s: number) =>
  s >= 90 ? "Outstanding" : s >= 80 ? "Strong" : s >= 70 ? "Solid" : s >= 55 ? "Developing" : "Keep Working";

const scoreColor = (s: number): string =>
  s >= 80 ? "#34d399" : s >= 65 ? "#60a5fa" : s >= 50 ? "#fbbf24" : "#f87171";

const barColor = (s: number): string =>
  s >= 80 ? "bg-emerald-400" : s >= 65 ? "bg-blue-400" : s >= 50 ? "bg-amber-400" : "bg-red-400";

interface RecordingFeedbackModalProps {
  recordingId: string;
  trigger?: React.ReactNode;
  onScoreCalculated?: (score: number) => void;
  defaultOpen?: boolean;
  onClose?: () => void;
}

export const RecordingFeedbackModal = ({ recordingId, trigger, onScoreCalculated, defaultOpen, onClose }: RecordingFeedbackModalProps) => {
  const [feedback, setFeedback] = useState<RecordingFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("recording_feedback")
        .select("*")
        .eq("recording_id", recordingId)
        .maybeSingle();
      if (!cancelled) {
        if (data) {
          setFeedback(data as RecordingFeedback);
          const isInvalidRecording = (data as any).is_valid === false ||
            (data as any)?.summary?.startsWith("[INVALID]");
          if (isInvalidRecording) {
            setIsInvalid(true);
          } else {
            const overallScore = data.scores?.overall || Object.values(data.scores || {}).reduce((a: any, b: any) => a + b, 0) / (Object.keys(data.scores || {}).length || 1);
            if (onScoreCalculated) onScoreCalculated(Math.round(overallScore));
          }
        }
        setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recordingId]);

  const generate = async (force = false) => {
    setLoading(true);
    setIsInvalid(false);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-recording", {
        body: { recordingId, force },
      });
      if (error) {
        const msg = (error as any)?.context?.error || error.message || "";
        toast.error(msg || "Failed to generate feedback");
        setLoading(false);
        return;
      }
      if (data?.code === "INVALID_RECORDING" || data?.is_valid === false) {
        setIsInvalid(true);
        toast.error("Invalid attempt - no meaningful speech detected");
      } else if (data?.feedback) {
        setFeedback(data.feedback as RecordingFeedback);
        const fb = data.feedback;
        const overallScore = fb.scores?.overall || Object.values(fb.scores || {}).reduce((a: any, b: any) => a + b, 0) / (Object.keys(fb.scores || {}).length || 1);
        if (onScoreCalculated) onScoreCalculated(Math.round(overallScore));
        // New analysis changes the skill profile — notify the adaptive plan to recompute.
        if (!data.cached) window.dispatchEvent(new Event(FEEDBACK_SAVED_EVENT));
        toast.success(data.cached ? "Feedback retrieved" : "Analysis complete");
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) onClose?.();
    if (isOpen && !feedback && !fetching && !isInvalid) {
      generate(false);
    }
  };

  // Also auto-generate if fetching finished and no feedback exists
  useEffect(() => {
    if (open && !fetching && !feedback && !loading && !isInvalid) {
      generate(false);
    }
  }, [fetching, open]);

  if (fetching) return trigger ? <>{trigger}</> : null;

  const button = trigger ? (
    <button
      type="button"
      onClick={() => !isInvalid && setOpen(true)}
      className={cn(
        "flex items-center gap-4 text-xs font-black uppercase tracking-[0.4em] transition-all",
        isInvalid
          ? "text-red-500 hover:text-red-400 cursor-not-allowed"
          : "text-primary hover:opacity-70"
      )}
    >
      {isInvalid ? (
        <>
          <AlertCircle className="h-4 w-4" />
          INVALID ATTEMPT
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4 animate-pulse" />
          AI FEEDBACK
          {feedback?.xp ? (
            <span className="text-primary font-black italic ml-2">+{feedback.xp} XP</span>
          ) : null}
        </>
      )}
    </button>
  ) : (
    <Button
      variant="outline"
      size="sm"
      onClick={() => feedback ? setOpen(true) : generate(false)}
      disabled={loading || isInvalid}
      className={cn("w-full h-14 rounded-full border-primary/20 hover:border-primary/50 bg-primary/5 text-primary text-xs font-black uppercase tracking-[0.4em]", isInvalid && "border-red-500 text-red-500 hover:bg-red-500/10")}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-3" />
          SYNTHESIZING...
        </>
      ) : isInvalid ? (
        <>
          <AlertCircle className="h-4 w-4 mr-3" />
          INVALID DATA
        </>
      ) : feedback ? (
        <>
          <Sparkles className="h-4 w-4 mr-3" />
          RESULTS
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4 mr-3" />
          GET FEEDBACK
        </>
      )}
    </Button>
  );

  const overall = feedback ? overallFrom(feedback.scores) : 0;
  const breakdown = feedback ? Object.entries(feedback.scores).filter(([k]) => k !== "overall") : [];

  return (
    <>
      {button}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContentWithoutClose className="p-0">

          {/* ── Header ── */}
          <div className="px-6 md:px-8 pt-6 pb-5 border-b border-border/40 flex items-start justify-between gap-4 shrink-0">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                AI Coaching Result
              </div>
              <h2 className="speak-serif text-2xl md:text-3xl leading-none tracking-tight">
                {isInvalid ? "Insufficient Data" : <>Practice <span className="text-primary italic">Feedback</span></>}
              </h2>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {feedback?.xp && !isInvalid ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary bg-primary/8 border border-primary/20 px-3 py-1.5 rounded-full">
                  <Zap className="h-3 w-3" />+{feedback.xp} XP
                </span>
              ) : null}
              <DialogPrimitive.Close className="p-2 hover:bg-muted/50 rounded-full transition-all opacity-30 hover:opacity-100 group">
                <X className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6 scrollbar-hide">
            {(!feedback && !loading && !isInvalid) || loading ? (
              <div className="py-16 flex flex-col items-center gap-6">
                <div className="flex items-center gap-2.5">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-primary"
                      animate={{ opacity: [0.25, 1, 0.25], y: [0, -7, 0] }}
                      transition={{ duration: 1.3, delay: i * 0.18, repeat: Infinity, ease: "easeInOut" }}
                    />
                  ))}
                </div>
                <p className="text-xs font-medium opacity-40 tracking-wide">Analyzing your recording…</p>
              </div>
            ) : isInvalid ? (
              <div className="py-16 flex flex-col items-center gap-5 text-center">
                <div className="h-16 w-16 rounded-[1.5rem] bg-destructive/5 flex items-center justify-center border border-destructive/20">
                  <AlertCircle className="h-7 w-7 text-destructive" />
                </div>
                <div className="space-y-2">
                  <h3 className="speak-serif text-2xl italic tracking-tight">Not enough speech.</h3>
                  <p className="text-sm font-medium opacity-40 max-w-xs mx-auto leading-relaxed">
                    We couldn't detect meaningful speech. Try recording again in a quieter place.
                  </p>
                </div>
              </div>
            ) : feedback ? (
              <div className="space-y-5">

                {/* Score + summary hero */}
                <div className="flex items-center gap-5 rounded-[1.5rem] border border-border/30 bg-muted/4 p-5">
                  <div className="relative w-[88px] h-[88px] shrink-0 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 88 88" fill="none">
                      <circle cx="44" cy="44" r="34" stroke="currentColor" strokeWidth="3.5" className="text-foreground/8" />
                      <motion.circle
                        cx="44" cy="44" r="34" stroke={scoreColor(overall)} strokeWidth="3.5" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 34}
                        initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
                        animate={{ strokeDashoffset: (2 * Math.PI * 34) * (1 - overall / 100) }}
                        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                      />
                    </svg>
                    <span className="speak-serif text-[2.25rem] font-bold tabular-nums leading-none" style={{ color: scoreColor(overall) }}>
                      {overall}
                    </span>
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-30">{scoreLabel(overall)}</p>
                    <p className="speak-serif text-base italic leading-snug opacity-80">"{feedback.summary}"</p>
                  </div>
                </div>

                {/* Score breakdown */}
                {breakdown.length > 0 && (
                  <div className="rounded-[1.5rem] border border-border/30 bg-muted/4 p-5 space-y-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-30">Score Breakdown</p>
                    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
                      {breakdown.map(([key, value], i) => {
                        const v = value as number;
                        const label = SCORE_LABELS[key] || key.replace(/_/g, " ");
                        return (
                          <div key={key} className="space-y-1.5">
                            <div className="flex items-end justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">{label}</span>
                              <span className="text-sm font-black tabular-nums opacity-70">{v}</span>
                            </div>
                            <div className="h-1.5 w-full bg-foreground/8 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${v}%` }}
                                transition={{ duration: 1, ease: "circOut", delay: 0.2 + i * 0.06 }}
                                className={cn("h-full rounded-full", barColor(v))}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Strengths + improvements */}
                <div className="grid sm:grid-cols-2 gap-3">
                  {feedback.strengths.length > 0 && (
                    <div className="rounded-[1.5rem] border border-emerald-500/15 bg-emerald-500/3 p-5 space-y-3">
                      <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.4em] text-emerald-400/70">
                        <Zap className="h-3 w-3" />Did Well
                      </div>
                      <ul className="space-y-2.5">
                        {feedback.strengths.map((s, i) => (
                          <li key={i} className="flex gap-2.5 text-sm font-medium opacity-65 leading-snug">
                            <Check className="h-3.5 w-3.5 text-emerald-400/70 mt-0.5 shrink-0" strokeWidth={3} />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {feedback.improvements.length > 0 && (
                    <div className="rounded-[1.5rem] border border-amber-500/15 bg-amber-500/3 p-5 space-y-3">
                      <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.4em] text-amber-400/70">
                        <Target className="h-3 w-3" />To Improve
                      </div>
                      <ul className="space-y-2.5">
                        {feedback.improvements.map((s, i) => (
                          <li key={i} className="flex gap-2.5 text-sm font-medium opacity-65 leading-snug">
                            <ArrowRight className="h-3.5 w-3.5 text-amber-400/70 mt-0.5 shrink-0" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Next drill */}
                {feedback.next_drill && (
                  <div className="rounded-[1.5rem] border border-primary/25 bg-gradient-to-br from-primary/8 to-primary/3 p-5 flex items-start gap-4">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.5em] text-primary/50">Try This Next</p>
                      <p className="text-sm font-semibold leading-relaxed opacity-80">{feedback.next_drill}</p>
                    </div>
                  </div>
                )}

                {/* Transcript */}
                {feedback.transcript && (
                  <div className="rounded-[1.5rem] border border-border/25 bg-muted/3 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowTranscript(v => !v)}
                      className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-foreground/3 transition-colors"
                    >
                      <span className="text-[9px] font-black uppercase tracking-[0.5em] opacity-30">Your Transcript</span>
                      <motion.div animate={{ rotate: showTranscript ? 180 : 0 }} transition={{ duration: 0.25 }}>
                        <ChevronDown className="h-3.5 w-3.5 opacity-30" />
                      </motion.div>
                    </button>
                    <AnimatePresence initial={false}>
                      {showTranscript && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          transition={{ height: { duration: 0.3, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.2 } }}
                          className="overflow-hidden"
                        >
                          <p className="px-5 pb-5 border-t border-border/15 pt-4 text-sm font-medium opacity-45 leading-relaxed italic">
                            "{feedback.transcript}"
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Re-analyze */}
                <div className="flex justify-center pt-1">
                  <button
                    onClick={() => generate(true)}
                    disabled={loading}
                    className="text-[9px] font-black uppercase tracking-[0.4em] opacity-25 hover:opacity-100 hover:text-primary transition-all flex items-center gap-2.5 group py-2"
                  >
                    <RefreshCw className={cn("h-3 w-3 transition-transform duration-700", loading ? "animate-spin" : "group-hover:rotate-180")} />
                    Re-analyze
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContentWithoutClose>
      </Dialog>
    </>
  );
};

export default RecordingFeedbackModal;
export const RecordingFeedback = RecordingFeedbackModal;
