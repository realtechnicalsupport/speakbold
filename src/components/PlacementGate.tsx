import { motion } from "framer-motion";
import { Compass, Play, Mic, ArrowRight } from "lucide-react";
import { TIERS } from "@/hooks/usePathway";

// Blocking gate shown before a fresh user can access the Pathway. They must
// either take the 60-second placement test or explicitly skip (start as a
// Beginner). The pathway itself is not rendered until one of those resolves.
export const PlacementGate = ({
  userName,
  onTakeTest,
  onSkip,
}: {
  userName: string;
  onTakeTest: () => void;
  onSkip: () => void;
}) => {
  return (
    <section className="px-4 md:container pt-28 md:pt-44 pb-24 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-2xl mx-auto text-center space-y-8 md:space-y-10"
      >
        <div className="inline-flex h-16 w-16 md:h-20 md:w-20 rounded-[1.5rem] md:rounded-[2rem] bg-primary/10 border border-primary/20 text-primary items-center justify-center mx-auto">
          <Compass className="h-8 w-8 md:h-10 md:w-10" />
        </div>

        <div className="space-y-4">
          <p className="text-xs font-black uppercase tracking-[0.5em] text-primary">First, your starting line</p>
          <h1 className="speak-serif text-4xl md:text-6xl leading-[0.95] tracking-tighter">
            Let's find where <br className="hidden sm:block" />
            <span className="text-primary italic">you begin</span>.
          </h1>
          <p className="text-sm md:text-lg font-medium opacity-50 max-w-lg mx-auto leading-relaxed">
            Take a 60-second speaking test and we'll drop you at the right tier — no slogging through
            drills you've already outgrown. Prefer to start from scratch? You can skip.
          </p>
        </div>

        {/* Tier preview */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 max-w-lg mx-auto">
          {TIERS.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-border/60 bg-muted/5 p-3 md:p-4 space-y-1"
            >
              <p className="speak-serif text-base md:text-xl italic">{t.name}</p>
              <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-30">
                Tier
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4 pt-2">
          <button
            onClick={onTakeTest}
            className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 px-10 py-4 rounded-full bg-primary text-white shadow-glow hover:scale-[1.03] active:scale-95 transition-transform"
          >
            <Play className="h-4 w-4 fill-current" />
            <span className="text-sm font-black uppercase tracking-wide">Take the 60s placement test</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={onSkip}
            className="text-xs font-black uppercase tracking-widest opacity-30 hover:opacity-80 transition-opacity"
          >
            Skip — start as a Beginner
          </button>

          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-30">
            <Mic className="h-3 w-3" /> The test records 60 seconds of audio
          </p>
        </div>
      </motion.div>
    </section>
  );
};
