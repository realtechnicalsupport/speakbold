import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Link } from "react-router-dom";
import {
  Mic, MessageSquare, Briefcase, Activity, Dumbbell, ArrowLeft, ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BodyLanguageCamera } from "@/components/BodyLanguageCamera";
import { CoachHub } from "@/components/CoachHub";
import { RecentPracticeStrip } from "@/components/RecentPracticeStrip";
import { GrowthReport } from "@/components/GrowthReport";

// ─── Secondary practice tracks ─────────────────────────────────────
// Body Language is NOT here — it's promoted to its own co-headline card
// alongside the coach. These three are the "more ways to practice" row.
const PRACTICE_TRACKS = [
  {
    title: "Speaking Practice",
    short: "Structured drills to sharpen delivery",
    icon: Mic,
    to: "/tracks/public-speaking",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    glow: "#3b82f6",
  },
  {
    title: "Quick Thinking",
    short: "Think on your feet, against the clock",
    icon: MessageSquare,
    to: "/tracks/impromptu",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    glow: "#a855f7",
  },
  {
    title: "Interview Practice",
    short: "Mock behavioral & technical questions",
    icon: Briefcase,
    to: "/tracks/interviews",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    glow: "#10b981",
  },
];

// ─── Inline Body Language Panel ────────────────────────────────────
const BodyLanguagePanel = ({ onBack }: { onBack: () => void }) => (
  <motion.div
    key="bl-panel"
    initial={{ opacity: 0, y: 32 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 16 }}
    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    className="space-y-10 md:space-y-16"
  >
    <button
      onClick={onBack}
      className="inline-flex items-center gap-3 text-xs font-black uppercase tracking-[0.3em] text-primary opacity-40 hover:opacity-100 transition-all"
    >
      <ArrowLeft className="h-4 w-4" />
      BACK TO THE LAB
    </button>

    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.4em] text-orange-500">
        <Activity className="h-4 w-4" />
        FREE PRACTICE — BODY LANGUAGE
      </div>
      <h2 className="speak-serif text-4xl md:text-6xl tracking-tighter leading-[0.9]">
        Your body speaks{" "}
        <span className="text-primary italic">before you do.</span>
      </h2>
      <p className="text-sm md:text-base font-medium opacity-40 leading-relaxed">
        Real-time AI analysis of your posture, eye contact, expression, and gestures.
        All processing happens in your browser — nothing is uploaded.
      </p>
    </div>

    <BodyLanguageCamera />
  </motion.div>
);

// ─── Body Language co-headline card ────────────────────────────────
// The crown-jewel feature, given equal billing to the coach: a full-width
// hero card (not a 1/4 grid tile) so it can't be missed. Tapping opens the
// in-Lab camera panel.
const BodyLanguageHeroCard = ({ onOpen }: { onOpen: () => void }) => (
  <button
    onClick={onOpen}
    className="group relative w-full text-left overflow-hidden rounded-3xl md:rounded-[2.5rem] glass-card border border-orange-500/20 hover:border-orange-500/45 hover:-translate-y-1 transition-all duration-300 p-7 md:p-12"
  >
    <div
      aria-hidden
      className="absolute -top-20 -right-16 h-60 w-60 rounded-full bg-orange-500/15 blur-[100px] opacity-70 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
    />
    <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-7 md:gap-12">
      <div className="flex-1 min-w-0 space-y-4 md:space-y-5">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-orange-500">
            <Activity className="h-4 w-4" />
            BODY LANGUAGE
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-[9px] font-black uppercase tracking-widest text-orange-500">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
            Live
          </span>
        </div>
        <h2 className="speak-serif text-3xl md:text-5xl tracking-tighter leading-[0.95]">
          Your body speaks{" "}
          <span className="text-primary italic">before you do.</span>
        </h2>
        <p className="text-sm md:text-base font-medium opacity-50 leading-relaxed max-w-lg">
          A real-time AI read on your posture, eye contact, expression, and gestures —
          all on-device, nothing uploaded. The half of speaking nobody else measures.
        </p>
        <span className="inline-flex items-center gap-2.5 text-[11px] md:text-xs font-black uppercase tracking-[0.25em] text-orange-500 group-hover:gap-4 transition-all duration-300">
          Start camera session
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>

      {/* Oversized presence disc — the visual anchor that gives this card
          its co-headline weight next to the coach. */}
      <div className="shrink-0 self-start md:self-center">
        <div className="h-20 w-20 md:h-32 md:w-32 rounded-[1.75rem] md:rounded-[2.25rem] bg-orange-500/10 text-orange-500 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
          <Activity className="h-10 w-10 md:h-16 md:w-16" />
        </div>
      </div>
    </div>
  </button>
);

// ─── Main Lab Page ──────────────────────────────────────────────────
const Lab = () => {
  const [showBodyLanguage, setShowBodyLanguage] = useState(false);

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Passive ambient glows */}
      <div className="absolute top-[10%] right-[-5%] w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-primary/5 rounded-full blur-[150px] animate-float opacity-30 pointer-events-none" />
      <div className="absolute bottom-[5%] left-[-10%] w-[400px] h-[400px] bg-primary/3 rounded-full blur-[130px] opacity-20 pointer-events-none" style={{ animationDelay: "-4s" }} />
      <div className="absolute top-[50%] left-[40%] w-[200px] h-[200px] bg-primary/4 rounded-full blur-[100px] opacity-15 pointer-events-none hidden lg:block" />
      <SiteHeader />

      <section className="px-4 md:container pt-20 md:pt-48 pb-32 lg:pb-16 relative z-10">
        <AnimatePresence mode="wait">
          {!showBodyLanguage ? (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* ── 1. The AI Coach — the main event, leads the page ── */}
              <CoachHub />

              {/* ── 2. Body Language — co-headline crown jewel, equal billing ── */}
              <div className="mt-16 md:mt-28">
                <BodyLanguageHeroCard onOpen={() => setShowBodyLanguage(true)} />
              </div>

              {/* ── 3. More ways to practice — the three structured tracks ── */}
              <div className="mt-16 md:mt-24">
                <div className="flex items-center gap-3 text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-primary mb-5 md:mb-7">
                  <Dumbbell className="h-4 w-4" />
                  MORE WAYS TO PRACTICE
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
                  {PRACTICE_TRACKS.map((tool, index) => {
                    const Icon = tool.icon;
                    return (
                      <motion.div
                        key={tool.title}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.06 }}
                        className="h-full"
                      >
                        <Link
                          to={tool.to}
                          className="group relative flex flex-col gap-4 h-full w-full text-left p-5 md:p-6 rounded-2xl md:rounded-3xl glass-card border border-border/60 hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 overflow-hidden min-h-[150px] md:min-h-[180px]"
                        >
                          <div
                            aria-hidden
                            className="absolute -top-10 -right-10 h-28 w-28 rounded-full blur-2xl opacity-0 group-hover:opacity-25 transition-opacity duration-500"
                            style={{ background: tool.glow }}
                          />
                          <div className={`h-12 w-12 md:h-14 md:w-14 rounded-2xl ${tool.bg} ${tool.color} flex items-center justify-center shrink-0 relative z-10 group-hover:scale-105 transition-transform duration-300`}>
                            <Icon className="h-6 w-6 md:h-7 md:w-7" />
                          </div>
                          <div className="relative z-10 flex-1">
                            <p className="text-base md:text-lg font-bold tracking-tight leading-tight">{tool.title}</p>
                            <p className="text-[11px] md:text-xs opacity-50 mt-1 leading-snug">{tool.short}</p>
                          </div>
                          <div className="relative z-10 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-primary opacity-50 group-hover:opacity-100 group-hover:gap-2.5 transition-all duration-300">
                            Start <ArrowRight className="h-3.5 w-3.5" />
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* ── 4. Proof of progress: the improvement curve ── */}
              <div className="mt-16 md:mt-24">
                <GrowthReport compact />
              </div>

              {/* ── 5. Recent practice: history footer → expands to full popup ── */}
              <div className="border-t border-border/60 pt-12 md:pt-16 mt-16 md:mt-24">
                <RecentPracticeStrip />
              </div>
            </motion.div>
          ) : (
            <BodyLanguagePanel onBack={() => setShowBodyLanguage(false)} />
          )}
        </AnimatePresence>
      </section>
    </main>
  );
};

export default Lab;
