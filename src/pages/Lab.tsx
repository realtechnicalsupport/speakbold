import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Link } from "react-router-dom";
import {
  Mic, MessageSquare, Briefcase, Activity, FlaskConical, ArrowLeft, ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BodyLanguageCamera } from "@/components/BodyLanguageCamera";
import { CoachHub } from "@/components/CoachHub";
import { RecentPracticeStrip } from "@/components/RecentPracticeStrip";
import { GrowthReport } from "@/components/GrowthReport";

// ─── Lab Tools ─────────────────────────────────────────────────────
const LAB_TOOLS = [
  {
    title: "Speaking Practice",
    short: "Structured drills to sharpen delivery",
    icon: Mic,
    to: "/tracks/public-speaking",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    glow: "#3b82f6",
    inline: false,
    badge: null,
  },
  {
    title: "Quick Thinking",
    short: "Think on your feet, against the clock",
    icon: MessageSquare,
    to: "/tracks/impromptu",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    glow: "#a855f7",
    inline: false,
    badge: null,
  },
  {
    title: "Interview Practice",
    short: "Mock behavioral & technical questions",
    icon: Briefcase,
    to: "/tracks/interviews",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    glow: "#10b981",
    inline: false,
    badge: null,
  },
  {
    title: "Body Language",
    short: "Real-time posture & eye-contact AI",
    icon: Activity,
    to: null,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    glow: "#f97316",
    inline: true,
    badge: "Live",
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
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* ── Quick-launch: the 4 tracks as prominent destination cards,
                     always visible up top so self-directed practice leads. ── */}
              <div className="mb-12 md:mb-16">
                <div className="flex items-center gap-3 text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-primary mb-2">
                  <FlaskConical className="h-4 w-4" />
                  CHOOSE YOUR FOCUS
                </div>
                <p className="text-sm opacity-40 mb-6 md:mb-7">
                  Pick a scenario and start practising — each is a focused, timed drill.
                </p>
                <div id="lab-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                  {LAB_TOOLS.map((tool, index) => {
                    const Icon = tool.icon;
                    const inner = (
                      <>
                        {/* Track-coloured hover glow */}
                        <div
                          aria-hidden
                          className="absolute -top-10 -right-10 h-28 w-28 rounded-full blur-2xl opacity-0 group-hover:opacity-25 transition-opacity duration-500"
                          style={{ background: tool.glow }}
                        />
                        {tool.badge && (
                          <span className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-orange-500">
                            <span className="h-1 w-1 rounded-full bg-orange-500 animate-pulse" />
                            {tool.badge}
                          </span>
                        )}
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
                      </>
                    );
                    const tileClass =
                      "group relative flex flex-col gap-4 h-full w-full text-left p-5 md:p-6 rounded-2xl md:rounded-3xl glass-card border border-border/60 hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 overflow-hidden min-h-[160px] md:min-h-[200px]";
                    return (
                      <motion.div
                        key={tool.title}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.06 }}
                        className="h-full"
                      >
                        {tool.inline ? (
                          <button onClick={() => setShowBodyLanguage(true)} className={tileClass}>
                            {inner}
                          </button>
                        ) : (
                          <Link to={tool.to!} className={tileClass}>
                            {inner}
                          </Link>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* ── Proof of progress: the improvement curve, kept above the
                     coach so "look how far you've come" is the first thing seen
                     (this is also the kiosk/demo landing — RETAIL_HOME). ── */}
              <div className="mb-12 md:mb-16">
                <GrowthReport compact />
              </div>

              {/* ── Main feature: the adaptive AI coach ── */}
              <CoachHub />

              {/* ── Recent practice: history footer → expands to full popup ── */}
              <div className="border-t border-border/60 pt-12 md:pt-16 mt-12 md:mt-16">
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
