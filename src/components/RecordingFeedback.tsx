import { useEffect, useState } from "react";
import { Sparkles, Loader2, RefreshCw, Trophy, TrendingUp, AlertCircle, X, ShieldCheck, Zap, ArrowRight, Target, Microscope } from "lucide-react";
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

const DialogContentWithoutClose = ({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/60 backdrop-blur-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <DialogPrimitive.Content
      className={cn(
        "fixed left-[50%] top-[50%] z-50 w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] bg-background border border-border/60 rounded-[4rem] shadow-2xl duration-700 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] max-h-[90vh] overflow-hidden flex flex-col",
        className,
      )}
      {...props}
    >
      <div className="grain pointer-events-none" />
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

interface RecordingFeedbackModalProps {
  recordingId: string;
  trigger?: React.ReactNode;
  onScoreCalculated?: (score: number) => void;
}

export const RecordingFeedbackModal = ({ recordingId, trigger, onScoreCalculated }: RecordingFeedbackModalProps) => {
  const [feedback, setFeedback] = useState<RecordingFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [open, setOpen] = useState(false);
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
        toast.success(data.cached ? "Audit Result Retrieved" : "Analysis Protocol Complete");
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

  return (
    <>
      {button}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContentWithoutClose className="p-0 overflow-hidden">
          {/* Background Decoration */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px] animate-float opacity-40 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[130px] animate-float opacity-30 pointer-events-none" style={{ animationDelay: "-3s" }} />

          {/* Header */}
          <div className="p-12 md:p-20 pb-10 border-b border-border/60 flex justify-between items-start relative z-10">
            <div className="space-y-6">
              <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.6em] text-primary">
                <ShieldCheck className="h-4 w-4" />
                AI COACHING RESULT
              </div>
              <h2 className="speak-serif text-5xl md:text-8xl text-foreground leading-[0.8] tracking-tighter">
                {isInvalid ? "Insufficient Data" : (
                  <>
                    Practice <span className="text-primary italic">Feedback</span>.
                  </>
                )}
              </h2>
            </div>
            <DialogPrimitive.Close className="p-6 hover:bg-muted/50 rounded-full transition-all opacity-20 hover:opacity-100 group">
              <X className="h-8 w-8 group-hover:rotate-90 transition-transform duration-700" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 overflow-y-auto p-12 md:p-20 pt-12 space-y-24 relative z-10 scrollbar-hide">
            {!feedback && !loading && !isInvalid ? (
              <div className="text-center py-40 space-y-12">
                <div className="relative h-1 w-80 bg-muted rounded-full mx-auto overflow-hidden shadow-inner border border-border/60">
                  <motion.div 
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    className="absolute inset-0 bg-primary w-1/2 rounded-full shadow-glow"
                  />
                </div>
                <div className="space-y-4">
                  <p className="text-xs font-black uppercase tracking-[0.6em] text-primary animate-pulse">ANALYZING YOUR RECORDING...</p>
                  <p className="text-[11px] font-bold uppercase tracking-[0.4em] opacity-40 italic">POWERED BY AI · PLEASE WAIT</p>
                </div>
              </div>
            ) : loading ? (
              <div className="text-center py-40 space-y-12">
                <div className="relative h-1 w-80 bg-muted rounded-full mx-auto overflow-hidden shadow-inner border border-border/60">
                  <motion.div 
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    className="absolute inset-0 bg-primary w-1/2 rounded-full shadow-glow"
                  />
                </div>
                <div className="space-y-4">
                  <p className="text-xs font-black uppercase tracking-[0.6em] text-primary animate-pulse">ANALYZING SPEECH PATTERNS...</p>
                  <p className="text-[11px] font-bold uppercase tracking-[0.4em] opacity-40 italic">POWERED BY AI</p>
                </div>
              </div>
            ) : isInvalid ? (
              <div className="text-center py-40 space-y-12">
                <div className="h-24 w-24 rounded-[2rem] bg-destructive/5 flex items-center justify-center mx-auto border border-destructive/20 animate-float">
                  <AlertCircle className="h-10 w-10 text-destructive" />
                </div>
                <div className="space-y-6">
                   <h3 className="speak-serif text-4xl md:text-5xl italic tracking-tighter">Capture Cycle Aborted.</h3>
                   <p className="text-xl font-medium opacity-40 max-w-lg mx-auto leading-relaxed italic">
                    Not enough speech detected. Try recording again in a quiet place.
                  </p>
                </div>
              </div>
            ) : feedback ? (
              <div className="space-y-24">
                {/* Summary */}
                <div className="space-y-8">
                  <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.6em] text-primary">
                    <Microscope className="h-4 w-4" />
                    SUMMARY
                  </div>
                  <p className="speak-serif text-3xl md:text-5xl tracking-tighter text-foreground/90 leading-[1.1] italic border-l-2 border-primary/30 pl-12">
                    "{feedback.summary}"
                  </p>
                </div>

                {/* Scores Grid */}
                {Object.keys(feedback.scores).length > 0 && (
                  <div className="space-y-12">
                    <p className="text-xs font-black uppercase tracking-[0.6em] opacity-30">SCORE BREAKDOWN</p>
                    <div className="grid md:grid-cols-2 gap-16">
                      {Object.entries(feedback.scores).map(([key, value]) => {
                        const v = value as number;
                        const label = SCORE_LABELS[key] || key.replace(/_/g, " ");
                        return (
                          <div key={key} className="space-y-6 group">
                            <div className="flex items-end justify-between">
                              <span className="text-xs font-black uppercase tracking-[0.3em] opacity-30 group-hover:opacity-100 group-hover:text-primary transition-all duration-700">
                                {label.toUpperCase()}
                              </span>
                              <span className="speak-serif text-4xl font-bold italic tabular-nums group-hover:text-primary transition-colors duration-700">
                                {v}
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border/60 relative">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${v}%` }}
                                transition={{ duration: 1.5, ease: "circOut", delay: 0.3 }}
                                className="h-full bg-primary shadow-glow shadow-primary/40"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Strengths & Improvements */}
                <div className="grid lg:grid-cols-2 gap-20 pt-16 border-t border-border/60">
                  <div className="space-y-10">
                    <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.5em] text-primary">
                      <Zap className="h-4 w-4" />
                      WHAT YOU DID WELL
                    </div>
                    <ul className="space-y-8">
                      {feedback.strengths.map((s, i) => (
                        <motion.li 
                          key={i} 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * i + 0.5 }}
                          className="flex gap-8 group items-start"
                        >
                          <span className="text-primary text-3xl speak-serif italic opacity-40 group-hover:opacity-100 transition-opacity">✱</span>
                          <span className="text-lg font-medium tracking-tight opacity-40 leading-snug group-hover:opacity-100 transition-opacity duration-700 italic">"{s}"</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-10">
                    <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.5em] opacity-30">
                      <Target className="h-4 w-4" />
                      WHAT TO IMPROVE
                    </div>
                    <ul className="space-y-8">
                      {feedback.improvements.map((s, i) => (
                        <motion.li 
                          key={i} 
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * i + 0.5 }}
                          className="flex gap-8 group items-start"
                        >
                          <span className="text-3xl speak-serif italic opacity-10 group-hover:opacity-100 transition-opacity">✱</span>
                          <span className="text-lg font-medium tracking-tight opacity-40 leading-snug group-hover:opacity-100 transition-opacity duration-700 italic">"{s}"</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Next Drill */}
                {feedback.next_drill && (
                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="p-12 md:p-16 rounded-[4rem] bg-primary/[0.03] border border-primary/20 space-y-8 relative overflow-hidden group shadow-soft"
                  >
                    <div className="grain pointer-events-none" />
                    <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity duration-1000">
                       <Zap className="h-32 w-32 text-primary" />
                    </div>
                    <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.6em] text-primary relative z-10">
                       <Target className="h-4 w-4" />
                       RECOMMENDED NEXT DRILL
                    </div>
                    <p className="speak-serif text-2xl md:text-4xl italic tracking-tighter leading-relaxed relative z-10">"{feedback.next_drill}"</p>
                  </motion.div>
                )}

                {/* Transcript */}
                {feedback.transcript && (
                  <div className="space-y-10">
                    <button
                      type="button"
                      onClick={() => setShowTranscript((v) => !v)}
                      className="inline-flex items-center gap-6 text-xs font-black uppercase tracking-[0.6em] opacity-20 hover:opacity-100 hover:text-primary transition-all group"
                    >
                      <ArrowRight className={cn("h-4 w-4 transition-transform duration-700", showTranscript ? "rotate-90" : "")} />
                      {showTranscript ? "COLLAPSE" : "EXPAND"} SESSION TRANSCRIPT
                    </button>
                    <AnimatePresence>
                      {showTranscript && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.8, ease: "circOut" }}
                          className="text-lg font-medium opacity-40 leading-relaxed bg-muted/5 p-12 rounded-[3.5rem] italic border border-border/60 shadow-inner overflow-hidden"
                        >
                          <div className="grain pointer-events-none" />
                          "{feedback.transcript}"
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <div className="flex justify-center pt-20 border-t border-border/60">
                  <button 
                    onClick={() => generate(true)} 
                    disabled={loading}
                    className="text-xs font-black uppercase tracking-[0.5em] opacity-20 hover:opacity-100 hover:text-primary transition-all flex items-center gap-6 group"
                  >
                    <RefreshCw className={cn("h-4 w-4 transition-all duration-1000", loading ? "animate-spin" : "group-hover:rotate-180")} />
                    RE-ANALYZE RECORDING
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          
          <div className="p-10 bg-muted/5 border-t border-border/60 flex flex-col md:flex-row justify-between items-center gap-6 text-[11px] font-black uppercase tracking-[0.6em] opacity-20 relative z-10">
            <div className="flex items-center gap-4">
               <ShieldCheck className="h-4 w-4" />
               <span>ENCRYPTED PROTOCOL ACTIVE</span>
            </div>
            <div className="flex items-center gap-8">
              <span>AUDIT ID: {recordingId.slice(0, 12).toUpperCase()}</span>
              <span>SECURE AI ANALYSIS • END-TO-END VERIFIED</span>
            </div>
          </div>
        </DialogContentWithoutClose>
      </Dialog>
    </>
  );
};

export default RecordingFeedbackModal;
export const RecordingFeedback = RecordingFeedbackModal;
