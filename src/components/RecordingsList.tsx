import { useAuth } from "@/context/AuthContext";
import { useRecordings } from "@/hooks/useRecordings";
import { Button } from "@/components/ui/button";
import { Trash2, CloudOff, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { RecordingFeedback } from "@/components/RecordingFeedback";

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export const RecordingsList = () => {
  const { user } = useAuth();
  const { items, loading, remove, refresh } = useRecordings();

  if (!user) {
    return (
      <div className="border border-dashed border-border/60 rounded-[2rem] p-5 flex items-center gap-3 bg-muted/5">
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
    <div className="border border-border/60 rounded-2xl md:rounded-[3rem] p-4 md:p-6 bg-muted/5 min-w-0 overflow-hidden">
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
        <ul className="space-y-4 max-h-96 overflow-auto pr-2">
          {items.map((r) => (
            <li key={r.id} className="border border-border/60 rounded-xl md:rounded-[2rem] p-3 md:p-4 space-y-4 bg-muted/5 min-w-0 overflow-hidden">
              <div className="flex items-start justify-between gap-2 md:gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground/90 truncate font-medium">
                    {r.prompt_text ?? "Untitled prompt"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {r.difficulty ?? "—"} · {fmt(r.duration_ms)}
                    {r.target_seconds ? ` / ${fmt(r.target_seconds * 1000)}` : ""} ·{" "}
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(r)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {r.signedUrl && <audio controls src={r.signedUrl} className="w-full h-10" />}
              <RecordingFeedback recordingId={r.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
