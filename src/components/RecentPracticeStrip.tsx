import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, ChevronRight, X, Mic } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRecordings } from "@/hooks/useRecordings";
import { RecordingsList } from "@/components/RecordingsList";

const fmtDur = (ms: number) => {
  const s = Math.floor((ms ?? 0) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * Compact "recent practice" teaser for the Lab. Shows the latest few saved
 * recordings; tapping any row — or "View all" — expands into a popup containing
 * the FULL history (the existing RecordingsList, with playback + feedback). Keeps
 * the Lab focused on the coach while still surfacing where past work lives.
 */
export const RecentPracticeStrip = () => {
  const { user } = useAuth();
  const { items, loading } = useRecordings();
  const [showAll, setShowAll] = useState(false);

  if (!user) return null;
  if (loading && items.length === 0) return null;

  const recent = items.slice(0, 4);

  return (
    <div className="rounded-[2rem] border border-border/60 bg-muted/5 p-6 md:p-8">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-[0.4em] text-primary">
          <History className="h-3.5 w-3.5" /> Recent practice
        </div>
        {items.length > 0 && (
          <button
            onClick={() => setShowAll(true)}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
          >
            View all {items.length > recent.length && <span className="opacity-60">({items.length})</span>}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-3 py-2 opacity-50">
          <Mic className="h-4 w-4 shrink-0" />
          <p className="text-sm">
            No saved recordings yet — turn on <span className="font-semibold">Record this attempt</span> in a drill and they'll show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {recent.map((r) => (
            <button
              key={r.id}
              onClick={() => setShowAll(true)}
              className="group w-full text-left flex items-center gap-4 p-3.5 rounded-2xl border border-border/50 bg-background/40 hover:border-primary/40 hover:bg-primary/[0.03] transition-all"
            >
              <div className="h-9 w-9 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Mic className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{r.prompt_text ?? "Untitled prompt"}</p>
                <p className="text-[11px] opacity-40 tabular-nums">
                  {r.difficulty ?? "—"} · {fmtDur(r.duration_ms)} · {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Full-history popup */}
      <AnimatePresence>
        {showAll && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-background/85 backdrop-blur-xl"
            onClick={() => setShowAll(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-2.5 text-xs font-black uppercase tracking-[0.4em] text-primary">
                  <History className="h-4 w-4" /> Your practice history
                </div>
                <button
                  onClick={() => setShowAll(false)}
                  aria-label="Close"
                  className="h-9 w-9 rounded-full flex items-center justify-center opacity-50 hover:opacity-100 hover:bg-muted/40 transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="overflow-y-auto min-h-0">
                <RecordingsList />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
