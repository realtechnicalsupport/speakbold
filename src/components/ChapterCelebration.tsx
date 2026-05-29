import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Trophy, Sparkles } from "lucide-react";
import { Confetti } from "@/components/Confetti";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { cn } from "@/lib/utils";

interface ChapterCelebrationProps {
  open: boolean;
  chapterName: string;
  chapterIndex: number;
  level: string;
  /** Hex/CSS color for the accent glow + chapter badge. */
  color: string;
  /** How many drills the chapter contained — shown as "8 drills mastered". */
  drillCount: number;
  /** True when this completion also unlocked a new tier (intermediate / orator). */
  unlockedTier?: string | null;
  /** Caller dismisses when user taps Continue or after the auto-dismiss timer. */
  onClose: () => void;
}

/**
 * Full-screen celebration that fires the instant a chapter flips from
 * in-progress to complete. Plays the win-chord SFX, drops 50 confetti
 * particles, and shows a chunky trophy card on a coloured radial glow.
 *
 * Auto-dismisses after 4.5 s so the user can keep scrolling without
 * interaction; tapping Continue or the backdrop closes it earlier.
 */
export function ChapterCelebration({
  open,
  chapterName,
  chapterIndex,
  level,
  color,
  drillCount,
  unlockedTier,
  onClose,
}: ChapterCelebrationProps) {
  const sfx = useSoundEffects();

  // SFX + auto-dismiss are mount-scoped to the open=true state, so closing
  // and reopening for a different chapter fires both again cleanly.
  useEffect(() => {
    if (!open) return;
    sfx.win();
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-6 cursor-pointer"
          onClick={onClose}
        >
          {/* Dim backdrop with a tinted gradient toward the chapter colour */}
          <div className="absolute inset-0 bg-background/85 backdrop-blur-md" />
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 40%, ${color}55 0%, transparent 60%)`,
            }}
          />

          {/* Confetti rains from the top — own absolute layer, doesn't block clicks */}
          <Confetti />

          {/* Celebration card */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "relative z-10 max-w-md w-full",
              "bg-card border border-border rounded-[2.5rem] p-10 md:p-12",
              "shadow-2xl text-center space-y-7"
            )}
            style={{ boxShadow: `0 30px 80px -20px ${color}66, 0 0 0 1px ${color}30` }}
          >
            {/* Trophy badge with pulsing glow */}
            <div className="relative flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute h-32 w-32 rounded-full blur-3xl"
                style={{ backgroundColor: color }}
              />
              <motion.div
                initial={{ rotate: -180, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.15 }}
                className="relative h-24 w-24 rounded-[1.75rem] flex items-center justify-center shadow-lg"
                style={{ backgroundColor: color }}
              >
                <Trophy className="h-12 w-12 text-white stroke-[2.5]" />
                {/* Tiny check ribbon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.4 }}
                  className="absolute -bottom-2 -right-2 h-9 w-9 rounded-full bg-background border-2 border-white flex items-center justify-center"
                  style={{ borderColor: color }}
                >
                  <Check className="h-5 w-5 stroke-[4]" style={{ color }} />
                </motion.div>
              </motion.div>
            </div>

            {/* Chapter label */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="space-y-2"
            >
              <p
                className="text-[10px] font-black uppercase tracking-[0.4em]"
                style={{ color }}
              >
                CHAPTER {chapterIndex + 1} · {level.toUpperCase()}
              </p>
              <h2 className="speak-serif text-3xl md:text-4xl italic tracking-tighter leading-none">
                {chapterName}
              </h2>
              <div className="inline-flex items-center gap-2 mt-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                  Chapter complete
                </span>
              </div>
            </motion.div>

            {/* Stat strip */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-sm font-medium opacity-60 leading-relaxed"
            >
              {drillCount} {drillCount === 1 ? "drill" : "drills"} mastered.{" "}
              {unlockedTier ? (
                <span className="text-foreground">
                  You've unlocked the <span style={{ color }} className="font-bold">{unlockedTier}</span> tier.
                </span>
              ) : (
                <>Onto the next one — momentum matters.</>
              )}
            </motion.div>

            {/* Continue button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              onClick={onClose}
              className="button-pill w-full py-4 bg-primary text-white shadow-glow text-xs font-black uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-95 transition-all"
            >
              Keep going
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
