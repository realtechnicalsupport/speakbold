import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRecordings } from "@/hooks/useRecordings";
import { Button } from "@/components/ui/button";
import { Trash2, CloudOff, RefreshCw, Sparkles, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { analyzeRecording, type RecordingFeedback } from "@/services/geminiService";
import { FeedbackModal } from "@/components/FeedbackModal";

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export const RecordingsList = () => {
  const { user } = useAuth();
  const { items, loading, remove, refresh } = useRecordings();
  const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<RecordingFeedback | null>(null);

  const handleGetFeedback = async (rec: typeof items[0]) => {
    setFeedbackLoading(rec.id);
    try {
      const result = await analyzeRecording(rec.prompt_text || "Practice session", rec.difficulty || "Medium");
      setFeedback(result);
    } catch (error) {
      console.error("Failed to get feedback:", error);
    } finally {
      setFeedbackLoading(null);
    }
  };

  if (!user) {
    return (
      <div className="border border-dashed border-border rounded-2xl p-5 flex items-center gap-3 bg-muted/20">
        <CloudOff className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground flex-1">
          Sign in to save your recordings to your account and access them anywhere.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-2xl p-6 bg-card-gradient">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <p className="text-xs uppercase tracking-widest text-primary font-semibold">
            Your saved recordings
          </p>
          <button 
            onClick={() => refresh()} 
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh recordings"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <span className="text-xs text-muted-foreground">{items.length} total</span>
      </div>
      {loading && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No recordings yet. Turn on "Record this attempt" and finish a drill.
        </p>
      ) : (
        <ul className="space-y-3 max-h-96 overflow-auto pr-2">
          {items.map((r) => (
            <li key={r.id} className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground/90 truncate">
                    {r.prompt_text ?? "Untitled prompt"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.difficulty ?? "—"} · {fmt(r.duration_ms)}
                    {r.target_seconds ? ` / ${fmt(r.target_seconds * 1000)}` : ""} ·{" "}
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleGetFeedback(r)}
                    disabled={feedbackLoading === r.id}
                    title="Get AI Feedback"
                  >
                    {feedbackLoading === r.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-primary" />
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(r)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {r.signedUrl && <audio controls src={r.signedUrl} className="w-full" />}
            </li>
          ))}
        </ul>
      )}

      {feedback && (
        <FeedbackModal feedback={feedback} onClose={() => setFeedback(null)} />
      )}
    </div>
  );
};
