import { useState } from "react";
import { motion } from "framer-motion";
import { TrackShell } from "@/components/TrackShell";
import { BodyLanguageCamera } from "@/components/BodyLanguageCamera";
import { Activity, Eye, Smile, Hand, Sparkles, Zap, Shield, Shuffle } from "lucide-react";

const METRICS_EXPLAINED = [
  {
    icon: Activity,
    color: "#f97316",
    label: "POSTURE",
    title: "Stand like you own it.",
    body: "Shoulder alignment, head position, spine angle. Slouching costs you authority before you say a word.",
    measure: "33-point skeletal tracking via MediaPipe Pose.",
  },
  {
    icon: Eye,
    color: "#38bdf8",
    label: "EYE CONTACT",
    title: "Hold their attention.",
    body: "Facing the lens or scanning the room? Looking away mid-sentence breaks the connection instantly.",
    measure: "Iris gaze direction from 478-point Face Mesh.",
  },
  {
    icon: Smile,
    color: "#a78bfa",
    label: "EXPRESSION",
    title: "Show you mean it.",
    body: "Monotone faces lose audiences. Subtle smiles and brow movement keep them leaning in.",
    measure: "ARKit-style blendshapes for smile & brow detection.",
  },
  {
    icon: Hand,
    color: "#34d399",
    label: "GESTURE",
    title: "Move with purpose.",
    body: "Frozen hands feel nervous. Wild flailing distracts. Measured, deliberate gestures land your points.",
    measure: "Wrist velocity & arm extension over time.",
  },
];

const PROMPTS = [
  "Tell me about a time you changed your mind about something important.",
  "Pitch your favorite hobby to someone who has never heard of it.",
  "What's a small skill you've been quietly mastering?",
  "Describe the best meal you've ever had — make me hungry.",
  "If you could give a TED talk on anything, what would it be?",
  "What's a controversial opinion you can actually defend?",
  "Walk me through your morning routine — make it sound interesting.",
  "Convince me a book you love is worth reading.",
  "Describe a place that has shaped who you are.",
  "What's the most useful thing you learned this year?",
  "Sell me on the city or town you live in.",
  "What's a small life upgrade everyone should make?",
  "Defend a movie that critics hated but you loved.",
  "What advice do you wish you'd received at 18?",
  "Describe your dream weekend — leave nothing out.",
];

const BodyLanguage = () => {
  const [promptIdx, setPromptIdx] = useState(() => Math.floor(Math.random() * PROMPTS.length));

  const shufflePrompt = () => {
    let next = promptIdx;
    while (next === promptIdx && PROMPTS.length > 1) {
      next = Math.floor(Math.random() * PROMPTS.length);
    }
    setPromptIdx(next);
  };

  return (
    <TrackShell
      eyebrow="MODULE 04 — KINETICS"
      title={
        <>
          Your body speaks <span className="text-primary italic">before you do.</span>
        </>
      }
      intro="Real-time AI analysis of your posture, eye contact, facial expression, and gestures — all running in your browser. Stand up, speak, and watch the feedback land in real time."
    >
      {/* Ambient glow */}
      <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-primary/5 rounded-full blur-[150px] animate-float opacity-30 pointer-events-none" />

      <div className="space-y-12 md:space-y-20 relative z-10">
        {/* 1 — What the AI measures */}
        <div className="space-y-8">
          <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.5em] opacity-40">
            <Sparkles className="h-3 w-3" />
            WHAT THE AI MEASURES
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {METRICS_EXPLAINED.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4 }}
                className="p-6 rounded-2xl md:rounded-[2rem] bg-muted/5 border border-border/60 hover:border-primary/30 transition-colors space-y-4 group relative overflow-hidden"
              >
                <div
                  className="absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-0 group-hover:opacity-20 blur-2xl transition-opacity duration-700"
                  style={{ background: m.color }}
                />
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center relative z-10"
                  style={{ background: `${m.color}15`, color: m.color }}
                >
                  <m.icon className="h-5 w-5" />
                </div>
                <div className="space-y-2 relative z-10">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">{m.label}</p>
                  <h3 className="speak-serif text-xl italic leading-tight">{m.title}</h3>
                </div>
                <p className="text-xs font-medium opacity-50 leading-relaxed relative z-10">{m.body}</p>
                <div className="pt-3 border-t border-border/30 relative z-10">
                  <p className="text-[10px] font-medium opacity-30 leading-relaxed">{m.measure}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 2 — Speaking prompt */}
        <div className="p-6 md:p-10 rounded-2xl md:rounded-[3rem] bg-gradient-to-br from-primary/[0.06] via-primary/[0.02] to-transparent border border-primary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] animate-float opacity-50 pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center gap-6 relative z-10">
            <div className="flex-1 space-y-4 min-w-0">
              <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.4em] text-primary">
                <Zap className="h-3.5 w-3.5" />
                YOUR SPEAKING PROMPT
              </div>
              <motion.p
                key={promptIdx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="speak-serif text-xl md:text-2xl italic leading-snug"
              >
                "{PROMPTS[promptIdx]}"
              </motion.p>
              <p className="text-xs font-medium opacity-30">
                Aim for 60–90 seconds. Don't script — just speak.
              </p>
            </div>
            <button
              onClick={shufflePrompt}
              className="shrink-0 group flex items-center gap-3 px-6 py-3 rounded-full border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-500"
            >
              <Shuffle className="h-3.5 w-3.5 opacity-50 group-hover:rotate-180 group-hover:opacity-100 transition-all duration-500" />
              <span className="text-xs font-black uppercase tracking-[0.3em]">Shuffle</span>
            </button>
          </div>
        </div>

        {/* 3 — The Studio (camera + live analysis + report) */}
        <BodyLanguageCamera />

        {/* 4 — Privacy footer */}
        <div className="flex flex-col items-center gap-3 pt-4">
          <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.5em] opacity-30">
            <Shield className="h-3 w-3" />
            ON-DEVICE INFERENCE
          </div>
          <p className="text-xs font-medium opacity-20 text-center max-w-md">
            Your video stream is processed entirely in your browser via MediaPipe. No frames are
            uploaded, recorded, or sent to any server.
          </p>
        </div>
      </div>
    </TrackShell>
  );
};

export default BodyLanguage;
