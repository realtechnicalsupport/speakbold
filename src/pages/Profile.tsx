import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useRecordings } from "@/hooks/useRecordings";
import { useSyncedPrompts } from "@/hooks/useSyncedPrompts";
import { useSyncedStreak } from "@/hooks/useRecordings";
import { useState } from "react";
import { Mic, Trash2, ChevronRight, Calendar, Clock, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";

const formatDuration = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const Profile = () => {
  const { user, signOut } = useAuth();
  const { items: recordings, loading: recordingsLoading, remove: removeRecording } = useRecordings();
  const { customPrompts } = useSyncedPrompts();
  const { count: streak, practicedToday } = useSyncedStreak();
  const [activeTab, setActiveTab] = useState<"recordings" | "prompts">("recordings");

  if (!user) {
    return (
      <div className="min-h-screen bg-background p-6 md:p-12 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Please sign in to view your profile.</p>
          <Button asChild variant="hero" size="lg">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="p-6 md:p-12">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-primary mb-1">Profile</p>
          <h1 className="font-display text-4xl md:text-5xl font-semibold mb-2">
            Your <em className="text-primary not-italic">progress.</em>
          </h1>
          <p className="text-muted-foreground mb-4">{user.email}</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full">
              <Flame className="h-5 w-5 text-primary" />
              <span className="font-display text-xl font-semibold">{streak}</span>
              <span className="text-sm text-muted-foreground">day streak</span>
            </div>
            {practicedToday && (
              <span className="text-sm text-primary">Practiced today ✓</span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("recordings")}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${
              activeTab === "recordings"
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:border-foreground"
            }`}
          >
            Recordings ({recordings.length})
          </button>
          <button
            onClick={() => setActiveTab("prompts")}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${
              activeTab === "prompts"
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:border-foreground"
            }`}
          >
            Custom Prompts ({customPrompts.length})
          </button>
        </div>

        {/* Content */}
        {activeTab === "recordings" && (
          <div className="border border-border rounded-3xl p-6 md:p-8">
            {recordingsLoading ? (
              <p className="text-muted-foreground">Loading recordings...</p>
            ) : recordings.length === 0 ? (
              <div className="text-center py-8">
                <Mic className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No recordings yet.</p>
                <Button asChild variant="hero" size="lg">
                  <Link to="/tracks/impromptu">Go to Impromptu →</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-4">
                {recordings.map((r) => (
                  <li key={r.id} className="border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground/90 truncate">
                          {r.prompt_text ?? "Untitled prompt"}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(r.created_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(r.duration_ms)}
                          </span>
                          {r.difficulty && <span>· {r.difficulty}</span>}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRecording(r)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {r.signedUrl && (
                      <audio controls src={r.signedUrl} className="w-full mt-3" />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === "prompts" && (
          <div className="border border-border rounded-3xl p-6 md:p-8">
            {customPrompts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No custom prompts yet.</p>
                <Button asChild variant="hero" size="lg">
                  <Link to="/tracks/impromptu">Go to Impromptu →</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {customPrompts.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-4 p-4 border border-border rounded-xl"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground/90 truncate">{p.text}</p>
                      {p.difficulty && (
                        <p className="text-xs text-muted-foreground mt-1">{p.difficulty}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Quick links</p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/tracks/body-language"
              className="px-4 py-2 bg-card border border-border rounded-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Body Language
            </Link>
            <Link
              to="/tracks/interviews"
              className="px-4 py-2 bg-card border border-border rounded-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Interviews
            </Link>
            <Link
              to="/tracks/public-speaking"
              className="px-4 py-2 bg-card border border-border rounded-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Public Speaking
            </Link>
            <Link
              to="/pre-flight"
              className="px-4 py-2 bg-card border border-border rounded-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Pre-Flight Checklist
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;