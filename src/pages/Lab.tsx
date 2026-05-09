import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Link } from "react-router-dom";
import {
  Mic, MessageSquare, Briefcase, Activity, FlaskConical,
  Camera, Check, Zap, ChevronRight, Eye, Microscope,
  ShieldCheck, ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { RecorderPanel } from "@/components/RecorderPanel";
import { RecordingsList } from "@/components/RecordingsList";

// ─── Body Language Data ────────────────────────────────────────────
const POSTURE_CHECK = [
  "Feet shoulder-width apart, weight even on both legs.",
  "Knees soft — never locked.",
  "Shoulders down and back, chest open.",
  "Chin level with the floor — not raised, not tucked.",
  "Hands visible, ready to gesture.",
  "Eyes scanning in 3-second holds.",
];

const GESTURES = [
  {
    name: "The Container",
    use: "DEFINING BOUNDARIES",
    how: "Hands shoulder-width apart, palms facing each other, as if holding a box.",
    mistake: "Hands too close together — looks like you're holding something tiny.",
    drill: "Say: 'There are three points I want to make.' Use the container for each point.",
  },
  {
    name: "The Reveal",
    use: "INTRODUCING CONCEPTS",
    how: "One hand opens outward from your chest, palm up, ending shoulder-height.",
    mistake: "Palm faces down — looks like you're pushing something away.",
    drill: "Say: 'And that's when it hit me.' Open your hand on 'hit.'",
  },
  {
    name: "The List",
    use: "SEQUENTIAL PRECISION",
    how: "Touch your thumb to each finger as you say each item. Don't wave the whole hand.",
    mistake: "Whole hand waving — looks like you're conducting an orchestra.",
    drill: "Say: 'I have three priorities: speed, quality, and safety.' Touch fingers on each.",
  },
  {
    name: "The Pause-Down",
    use: "LANDING FINALITY",
    how: "Lower both hands slowly to your sides as you say the line. Then hold still.",
    mistake: "Hands stop halfway — looks like you're giving up, not landing.",
    drill: "Say: 'This is the only number that matters.' Lower hands on 'matters.'",
  },
];

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
const BodyLanguagePanel = ({ onBack }: { onBack: () => void }) => {
  const [checked, setChecked] = useState<boolean[]>(POSTURE_CHECK.map(() => false));
  const [activeGesture, setActiveGesture] = useState<number | null>(null);

  return (
    <motion.div
      key="bl-panel"
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-10 md:space-y-16"
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-3 text-xs font-black uppercase tracking-[0.3em] text-primary opacity-40 hover:opacity-100 transition-all"
      >
        <ArrowLeft className="h-4 w-4" />
        BACK TO THE LAB
      </button>

      {/* Header */}
      <div className="space-y-4 max-w-2xl">
        <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.4em] text-orange-500">
          <Activity className="h-4 w-4" />
          FREE PRACTICE — BODY LANGUAGE
        </div>
        <h2 className="speak-serif text-4xl md:text-6xl tracking-tighter leading-[0.9]">
          Stand like the room is{" "}
          <span className="text-primary italic">already yours.</span>
        </h2>
        <p className="text-sm md:text-base font-medium opacity-40 leading-relaxed">
          Unlimited sessions. No progress tracked. No lessons. Just reps.
        </p>
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8 lg:gap-12">
        {/* Left: Posture Checklist */}
        <div className="bg-muted/5 border border-border/60 rounded-2xl md:rounded-[4rem] p-6 md:p-12 shadow-soft relative overflow-hidden group">
          <div className="grain pointer-events-none" />
          <div className="space-y-4 relative z-10 mb-8">
            <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.4em] text-primary">
              <Camera className="h-4 w-4" />
              ALIGNMENT PROTOCOL
            </div>
            <h3 className="speak-serif text-2xl md:text-4xl leading-[1.1] tracking-tighter max-w-lg">
              The Physics of Authority
            </h3>
            <p className="text-sm font-medium opacity-40 max-w-sm">
              Run through each line in front of a mirror or camera. Check off once aligned.
            </p>
          </div>

          <ul className="space-y-3 relative z-10">
            {POSTURE_CHECK.map((p, i) => (
              <li key={i}>
                <button
                  onClick={() => {
                    const next = [...checked];
                    next[i] = !next[i];
                    setChecked(next);
                  }}
                  className={cn(
                    "w-full flex items-center gap-5 p-5 rounded-[1.5rem] border transition-all duration-500 text-left group",
                    checked[i]
                      ? "bg-primary/[0.03] border-primary/40"
                      : "bg-background/50 border-border/60 hover:border-primary/20"
                  )}
                >
                  <div className={cn(
                    "h-7 w-7 rounded-full border-2 flex items-center justify-center transition-all duration-500 shrink-0",
                    checked[i]
                      ? "bg-primary border-primary text-white"
                      : "border-border/60 text-transparent group-hover:border-primary/30"
                  )}>
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <span className={cn(
                    "text-sm font-medium tracking-tight transition-all duration-500",
                    checked[i] ? "opacity-20 line-through" : "opacity-70 group-hover:opacity-100"
                  )}>{p}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: Eye Contact + Gesture Repo */}
        <div className="space-y-8">
          {/* Eye Contact */}
          <div className="p-6 md:p-8 rounded-2xl md:rounded-[3rem] bg-muted/5 border border-border/60 space-y-4 hover:border-primary/30 transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Eye className="h-20 w-20" />
            </div>
            <p className="text-xs font-black uppercase tracking-[0.4em] text-primary">STRATEGIC FOCUS</p>
            <h4 className="speak-serif text-2xl italic">The 3-Second Rule</h4>
            <p className="text-sm font-medium opacity-50 leading-relaxed">
              Pick three points in the room: left, centre, right. Hold each for 3–5 seconds.
              Move only on punctuation. If nervous, focus on the forehead.
            </p>
          </div>

          {/* Gesture Repo */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.5em] opacity-40">
              <Zap className="h-3 w-3" />
              GESTURE REPO
            </div>
            <div className="grid gap-3">
              {GESTURES.map((g, i) => (
                <motion.div
                  key={i}
                  layout
                  className={cn(
                    "border rounded-2xl md:rounded-[2rem] overflow-hidden transition-all duration-500",
                    activeGesture === i
                      ? "bg-primary/[0.03] border-primary/40 shadow-glow"
                      : "bg-muted/5 border-border/60 hover:border-primary/20"
                  )}
                >
                  <button
                    onClick={() => setActiveGesture(activeGesture === i ? null : i)}
                    className="w-full p-6 text-left flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary opacity-60">{g.use}</p>
                      <h5 className="speak-serif text-lg md:text-xl">{g.name}</h5>
                    </div>
                    <ChevronRight className={cn(
                      "h-5 w-5 transition-transform duration-500",
                      activeGesture === i ? "rotate-90 text-primary" : "opacity-20"
                    )} />
                  </button>
                  <AnimatePresence>
                    {activeGesture === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-6 pb-6 space-y-4"
                      >
                        <div className="p-4 rounded-xl bg-background/50 border border-border/60 space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">EXECUTION</p>
                          <p className="text-sm font-medium opacity-70 leading-relaxed">{g.how}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-destructive">MISTAKE</p>
                            <p className="text-xs font-medium opacity-50">{g.mistake}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary">DRILL</p>
                            <p className="text-xs font-medium opacity-50">{g.drill}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recorder */}
      <div className="p-6 md:p-12 rounded-2xl md:rounded-[4rem] bg-muted/5 border border-border/60 space-y-8 relative overflow-hidden shadow-soft">
        <div className="grain pointer-events-none" />
        <div className="space-y-4 text-center max-w-lg mx-auto">
          <div className="flex justify-center gap-3 text-xs font-black uppercase tracking-[0.5em] text-primary">
            <Microscope className="h-4 w-4" />
            KINETIC AUDIT
          </div>
          <h3 className="speak-serif text-2xl md:text-4xl">Capture &amp; Review</h3>
          <p className="text-sm font-medium opacity-40 leading-relaxed">
            Record a 60-second freestyle session. Watch it back with the sound OFF.
            Focus purely on your silhouette and hands.
          </p>
        </div>

        <RecorderPanel
          label="SILENT PERFORMANCE AUDIT"
          hint="Capture your movement. Sound is optional. Focus on kinetic clarity."
        />

        <div className="flex items-center gap-4 text-[11px] font-black uppercase tracking-[0.5em] opacity-20 justify-center">
          <ShieldCheck className="h-3 w-3" />
          SECURE VISUAL STREAM
        </div>
      </div>

      <RecordingsList />
    </motion.div>
  );
};

// ─── Main Lab Page ──────────────────────────────────────────────────
const Lab = () => {
  const [showBodyLanguage, setShowBodyLanguage] = useState(false);

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute top-[10%] right-[-5%] w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-primary/5 rounded-full blur-[150px] opacity-30 pointer-events-none" />
      <SiteHeader />

      <section className="px-4 md:container pt-32 md:pt-48 pb-32 relative z-10">
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
                      <div className="grain pointer-events-none opacity-50" />
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
                          className="group block w-full text-left p-8 rounded-[2rem] glass-card transition-all duration-300 relative overflow-hidden h-full"
                        >
                          {inner}
                        </button>
                      ) : (
                        <Link
                          to={tool.to!}
                          className="group block p-8 rounded-[2rem] glass-card transition-all duration-300 relative overflow-hidden h-full"
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
