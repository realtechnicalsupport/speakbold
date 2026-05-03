import { X, Sparkles, ThumbsUp, ThumbsDown, Lightbulb, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RecordingFeedback } from "@/services/geminiService";

interface FeedbackModalProps {
  feedback: RecordingFeedback;
  onClose: () => void;
}

export function FeedbackModal({ feedback, onClose }: FeedbackModalProps) {
  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-500";
    if (score >= 6) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreBg = (score: number) => {
    if (score >= 8) return "bg-green-500/10 border-green-500/30";
    if (score >= 6) return "bg-yellow-500/10 border-yellow-500/30";
    return "bg-red-500/10 border-red-500/30";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background border border-border rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-display font-semibold">AI Feedback</h2>
              <p className="text-xs text-muted-foreground">Analysis complete</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Overall Score */}
        <div className="p-6 border-b border-border">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Overall Score</p>
            <div className={cn("text-6xl font-display font-bold", getScoreColor(feedback.overallScore))}>
              {feedback.overallScore}
              <span className="text-2xl text-muted-foreground">/10</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{feedback.summary}</p>
          </div>
        </div>

        {/* Individual Scores */}
        <div className="p-6 border-b border-border">
          <div className="grid grid-cols-3 gap-4">
            <div className={cn("rounded-xl p-4 border text-center", getScoreBg(feedback.clarityScore))}>
              <p className="text-xs text-muted-foreground mb-1">Clarity</p>
              <p className={cn("text-2xl font-bold", getScoreColor(feedback.clarityScore))}>{feedback.clarityScore}</p>
            </div>
            <div className={cn("rounded-xl p-4 border text-center", getScoreBg(feedback.paceScore))}>
              <p className="text-xs text-muted-foreground mb-1">Pace</p>
              <p className={cn("text-2xl font-bold", getScoreColor(feedback.paceScore))}>{feedback.paceScore}</p>
            </div>
            <div className={cn("rounded-xl p-4 border text-center", getScoreBg(feedback.structureScore))}>
              <p className="text-xs text-muted-foreground mb-1">Structure</p>
              <p className={cn("text-2xl font-bold", getScoreColor(feedback.structureScore))}>{feedback.structureScore}</p>
            </div>
          </div>
        </div>

        {/* Strengths */}
        {feedback.strengths.length > 0 && (
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <ThumbsUp className="h-4 w-4 text-green-500" />
              <h3 className="font-semibold text-sm">What you did well</h3>
            </div>
            <ul className="space-y-2">
              {feedback.strengths.map((s, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-green-500">✓</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvements */}
        {feedback.improvements.length > 0 && (
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <ThumbsDown className="h-4 w-4 text-yellow-500" />
              <h3 className="font-semibold text-sm">Areas to improve</h3>
            </div>
            <ul className="space-y-2">
              {feedback.improvements.map((s, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-yellow-500">•</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tips */}
        {feedback.tips.length > 0 && (
          <div className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Quick tips</h3>
            </div>
            <ul className="space-y-2">
              {feedback.tips.map((s, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                  <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 rounded-b-3xl">
          <Button onClick={onClose} className="w-full">
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}