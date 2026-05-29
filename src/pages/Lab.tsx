import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Link } from "react-router-dom";
import {
  Mic, MessageSquare, Briefcase, Activity, FlaskConical, ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BodyLanguageCamera } from "@/components/BodyLanguageCamera";

// ─── Lab Tools ─────────────────────────────────────────────────────
const LAB_TOOLS = [
  {
    title: "Speaking Practice",
    description: "Practice your public speaking with structured drills.",
    icon: Mic,
    to: "/tracks/public-speaking",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    inline: false,
  },
  {
    title: "Quick Thinking",
    description: "Think on your feet with random topics and limited time.",
    icon: MessageSquare,
    to: "/tracks/impromptu",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    inline: false,
  },
  {
    title: "Interview Practice",
    description: "Practice behavioral and technical interview questions with AI.",
    icon: Briefcase,
    to: "/tracks/interviews",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    inline: false,
  },
  {
    title: "Body Language",
    description: "Unlimited free practice — posture, gestures, and video review. No syllabus.",
    icon: Activity,
    to: null,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    inline: true,
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
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 mb-16 max-w-2xl"
              >
                <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.3em] text-primary">
                  <FlaskConical className="h-4 w-4" />
                  THE LAB
                </div>
                <h1 className="speak-serif text-4xl md:text-7xl tracking-tighter leading-[0.85]">
                  Free <span className="text-primary italic">Practice.</span>
                </h1>
                <p className="text-base md:text-xl font-medium opacity-40 leading-relaxed">
                  Practice specific skills on your own terms outside of the main path.
                </p>
              </motion.div>

              <div id="lab-grid" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {LAB_TOOLS.map((tool, index) => {
                  const Icon = tool.icon;
                  const inner = (
                    <>
                      <div className={`h-14 w-14 rounded-full ${tool.bg} ${tool.color} flex items-center justify-center mb-6`}>
                        <Icon className="h-7 w-7" />
                      </div>
                      <h3 className="speak-serif text-2xl mb-3 tracking-tight">{tool.title}</h3>
                      <p className="text-sm opacity-50 font-medium leading-relaxed mb-6">{tool.description}</p>
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        {tool.inline ? "OPEN PRACTICE" : "ENTER LAB"}{" "}
                        <span className="text-lg leading-none">→</span>
                      </div>
                    </>
                  );

                  return (
                    <motion.div
                      key={tool.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      {tool.inline ? (
                        <button
                          onClick={() => setShowBodyLanguage(true)}
                          className="group block w-full text-left p-5 md:p-8 rounded-2xl md:rounded-[2rem] glass-card transition-all duration-300 relative overflow-hidden h-full"
                        >
                          {inner}
                        </button>
                      ) : (
                        <Link
                          to={tool.to!}
                          className="group block p-5 md:p-8 rounded-2xl md:rounded-[2rem] glass-card transition-all duration-300 relative overflow-hidden h-full"
                        >
                          {inner}
                        </Link>
                      )}
                    </motion.div>
                  );
                })}
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
