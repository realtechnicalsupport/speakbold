import { useState } from "react";
import { Link } from "react-router-dom";
import { Mic, MessageSquare, Briefcase, BookOpen, Lightbulb, Trophy, Sparkles, ArrowRight, Globe, Users, TrendingUp, ShieldCheck, Target, Zap, GraduationCap, Heart, BarChart3, FileText, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const SLIDES = [
  {
    id: "hero",
    title: "SpeakBold",
    subtitle: "COMMUNICATION SKILLS FOR EVERYONE.",
    tagline: "UN SDG 4 · Quality Education",
    hero: true,
  },
  {
    id: "problem",
    title: "The Gap",
    lead: "Communication is the #1 skill that creates or closes opportunity — and it is the least taught in schools.",
    points: [
      "75% of employers rank communication above technical skills when hiring",
      "Students from under-resourced schools get zero structured speaking practice",
      "Traditional coaching costs $150–500/hour — inaccessible to most learners",
    ],
    icon: "problem",
  },
  {
    id: "sdg",
    title: "Our SDG 4 Answer",
    lead: "SpeakBold democratizes elite communication training through AI-powered coaching — free, structured, and available to anyone with a device.",
    sdgPoints: [
      { icon: GraduationCap, label: "Inclusive Education", desc: "Free access for all learners, regardless of background" },
      { icon: Target, label: "Measurable Outcomes", desc: "AI-verified skill progression with transparent scoring" },
      { icon: Globe, label: "Global Reach", desc: "Mobile-first, works on any device, any location" },
    ],
  },
  {
    id: "solution",
    title: "How It Works",
    tracks: [
      { name: "Learning Path", icon: BookOpen, desc: "Structured drills from beginner to advanced. AI judges every attempt." },
      { name: "Daily Practice", icon: Sparkles, desc: "Focused 5-minute challenges that build habits and XP." },
      { name: "Interview Prep", icon: Briefcase, desc: "STAR-method coaching with instant AI feedback." },
      { name: "Peer Practice", icon: Users, desc: "Partner up for real-time speaking duels with AI judging." },
    ],
  },
  {
    id: "ai",
    title: "The AI Coach",
    lead: "Every recording is analyzed by AI across 6 skill dimensions. Learners get specific, actionable feedback — not generic tips.",
    features: [
      { icon: Mic, text: "Filler word detection & scoring" },
      { icon: TrendingUp, text: "Pace, clarity & structure grading" },
      { icon: BarChart3, text: "Confidence & delivery analysis" },
      { icon: Sparkles, text: "Personalized next-step recommendations" },
      { icon: ShieldCheck, text: "Transcript + full feedback breakdown" },
      { icon: Target, text: "Pass/fail thresholds per skill level" },
    ],
  },
  {
    id: "impact",
    title: "Real Impact",
    lead: "SpeakBold turns every learner's phone into a personal speaking coach — closing the gap that income, geography, and schooling create.",
    impactPoints: [
      { stat: "0", label: "Cost to access the full platform" },
      { stat: "6", label: "AI-assessed skill dimensions per attempt" },
      { stat: "4", label: "Structured learning units with AI mastery gates" },
      { stat: "24/7", label: "Coaching available, no scheduling needed" },
    ],
  },
  {
    id: "credentials",
    title: "Verifiable Outcomes",
    lead: "Education is only as valuable as the evidence it provides. SpeakBold generates official skills transcripts for every learner.",
    features: [
      { icon: FileText, text: "Printable Skill Transcripts & PDFs" },
      { icon: CheckCircle2, text: "AI-Verified Test Scores" },
      { icon: GraduationCap, text: "Unit Mastery Documentation" },
      { icon: ShieldCheck, text: "Unique Credential ID Tracking" },
    ],
  },
  {
    id: "tech",
    title: "Built to Scale",
    tech: ["React 18", "TypeScript", "Vite", "Supabase", "Framer Motion", "Google Gemini AI", "WebRTC"],
    techNote: "Real-time peer practice via WebRTC. AI analysis via Gemini. Zero infrastructure cost per user — built to scale to millions.",
  },
  {
    id: "cta",
    title: "Ready to speak boldly?",
    cta: true,
  },
];

export const PitchDeck = () => {
  const [slide, setSlide] = useState(0);
  const total = SLIDES.length;
  const current = SLIDES[slide];

  const goNext = () => setSlide(Math.min(total - 1, slide + 1));
  const goPrev = () => setSlide(Math.max(0, slide - 1));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      <div className="absolute top-[10%] right-[-5%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] animate-float opacity-30 pointer-events-none" />
      <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-accent/5 rounded-full blur-[130px] animate-float opacity-20 pointer-events-none" style={{ animationDelay: "-3s" }} />

      {/* Header */}
      <header className="border-b border-border/60 relative z-20">
        <div className="container flex items-center justify-between py-6">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shadow-glow transition-transform group-hover:scale-110">
              <Mic className="h-4 w-4 text-white" />
            </div>
            <span className="speak-serif text-2xl font-bold tracking-tighter">
              Speak<span className="text-primary italic">Bold</span>
            </span>
          </Link>
          <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.4em] opacity-40">
            <Globe className="h-4 w-4" />
            UN SDG 4 · QUALITY EDUCATION
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="h-0.5 bg-muted relative z-20">
        <motion.div
          className="h-full bg-primary shadow-glow"
          animate={{ width: `${((slide + 1) / total) * 100}%` }}
          transition={{ duration: 0.5, ease: "circOut" }}
        />
      </div>

      {/* Slide Content */}
      <main className="flex-1 flex items-center justify-center p-8 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.98 }}
            transition={{ duration: 0.7, ease: "circOut" }}
            className="w-full max-w-5xl"
          >
            {current.id === "hero" && (
              <div className="text-center space-y-12">
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
                  className="h-32 w-32 mx-auto rounded-[3rem] bg-primary flex items-center justify-center shadow-glow shadow-primary/20"
                >
                  <Mic className="h-16 w-16 text-white" />
                </motion.div>
                <div className="space-y-4">
                  <p className="text-xs font-black uppercase tracking-[0.6em] text-primary">{current.tagline}</p>
                  <h1 className="speak-serif text-8xl md:text-[12rem] font-bold leading-[0.8] tracking-tighter">
                    Speak<span className="text-primary italic">Bold</span>.
                  </h1>
                  <p className="text-xl md:text-3xl font-black uppercase tracking-[0.4em] opacity-20">
                    {current.subtitle}
                  </p>
                </div>
                <Link to="/" className="inline-flex items-center gap-3 button-pill px-16 py-6 bg-primary text-white shadow-glow group">
                  <span className="text-xs font-black uppercase tracking-[0.2em]">SEE THE PLATFORM</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-2 transition-transform duration-700" />
                </Link>
              </div>
            )}

            {(current.id === "problem" || current.id === "solution") && current.points && (
              <div className="space-y-16">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.6em] text-primary">
                    <Target className="h-4 w-4" /> SLIDE {slide + 1} / {total}
                  </div>
                  <h2 className="speak-serif text-6xl md:text-[8rem] font-bold leading-none tracking-tighter italic">{current.title}.</h2>
                  {current.lead && <p className="text-xl md:text-2xl font-medium opacity-50 max-w-3xl leading-relaxed">{current.lead}</p>}
                </div>
                <ul className="space-y-10">
                  {current.points.map((p, i) => (
                    <motion.li key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 + 0.3 }} className="flex items-start gap-8">
                      <div className="h-10 w-10 rounded-full border border-primary/40 flex items-center justify-center shrink-0 mt-2">
                        <span className="text-primary font-black text-sm">{i + 1}</span>
                      </div>
                      <span className="text-2xl md:text-4xl font-medium tracking-tight opacity-80 leading-snug">{p}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            )}

            {current.id === "sdg" && (
              <div className="space-y-16">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.6em] text-primary">
                    <Heart className="h-4 w-4" /> SDG 4 · QUALITY EDUCATION
                  </div>
                  <h2 className="speak-serif text-6xl md:text-[8rem] font-bold leading-none tracking-tighter italic">{current.title}.</h2>
                  <p className="text-xl md:text-2xl font-medium opacity-50 max-w-3xl leading-relaxed">{current.lead}</p>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                  {current.sdgPoints?.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 + 0.3 }}
                        className="p-10 rounded-[3rem] border border-primary/20 bg-primary/5 space-y-4 relative overflow-hidden">
                        <Icon className="h-10 w-10 text-primary" />
                        <h3 className="speak-serif text-2xl font-bold italic">{item.label}</h3>
                        <p className="text-base font-medium opacity-40 leading-relaxed">{item.desc}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {current.id === "solution" && current.tracks && (
              <div className="space-y-16">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.6em] text-primary">
                    <Zap className="h-4 w-4" /> HOW IT WORKS
                  </div>
                  <h2 className="speak-serif text-6xl md:text-[8rem] font-bold leading-none tracking-tighter italic">{current.title}.</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                  {current.tracks.map((t, i) => {
                    const Icon = t.icon;
                    return (
                      <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 + 0.3 }}
                        className="p-10 rounded-[3rem] border border-border/60 bg-muted/5 group hover:border-primary/40 transition-all duration-700 relative overflow-hidden">
                        <Icon className="h-10 w-10 text-primary mb-6 group-hover:scale-110 transition-transform" />
                        <h3 className="speak-serif text-3xl font-bold italic mb-4">{t.name}</h3>
                        <p className="text-lg font-medium opacity-40 leading-relaxed">{t.desc}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {current.id === "ai" && (
              <div className="space-y-16">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.6em] text-primary">
                    <Sparkles className="h-4 w-4" /> POWERED BY AI
                  </div>
                  <h2 className="speak-serif text-6xl md:text-[8rem] font-bold leading-none tracking-tighter italic">{current.title}.</h2>
                  <p className="text-xl md:text-2xl font-medium opacity-50 max-w-3xl leading-relaxed">{current.lead}</p>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  {current.features?.map((f, i) => {
                    const Icon = f.icon;
                    return (
                      <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 + 0.3 }}
                        className="flex items-center gap-6 p-8 rounded-[2rem] border border-border/60 bg-muted/5 group hover:border-primary/30 transition-all">
                        <Icon className="h-6 w-6 text-primary shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
                        <span className="text-sm font-bold opacity-40 group-hover:opacity-100 transition-opacity">{f.text}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {current.id === "impact" && (
              <div className="space-y-16">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.6em] text-primary">
                    <Globe className="h-4 w-4" /> EDUCATIONAL IMPACT
                  </div>
                  <h2 className="speak-serif text-6xl md:text-[8rem] font-bold leading-none tracking-tighter italic">{current.title}.</h2>
                  <p className="text-xl md:text-2xl font-medium opacity-50 max-w-3xl leading-relaxed">{current.lead}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  {current.impactPoints?.map((item, i) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 + 0.3 }}
                      className="text-center p-8 rounded-[2rem] border border-primary/20 bg-primary/5 space-y-3">
                      <p className="speak-serif text-5xl font-bold text-primary italic">{item.stat}</p>
                      <p className="text-xs font-black uppercase tracking-widest opacity-40">{item.label}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {current.id === "credentials" && (
              <div className="space-y-16">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.6em] text-primary">
                    <FileText className="h-4 w-4" /> LEARNER CREDENTIALS
                  </div>
                  <h2 className="speak-serif text-6xl md:text-[8rem] font-bold leading-none tracking-tighter italic">{current.title}.</h2>
                  <p className="text-xl md:text-2xl font-medium opacity-50 max-w-3xl leading-relaxed">{current.lead}</p>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  {current.features?.map((f, i) => {
                    const Icon = f.icon;
                    return (
                      <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 + 0.3 }}
                        className="flex items-center gap-6 p-8 rounded-[2rem] border border-border/60 bg-muted/5 group hover:border-primary/30 transition-all">
                        <Icon className="h-6 w-6 text-primary shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
                        <span className="text-xl font-bold opacity-40 group-hover:opacity-100 transition-opacity">{f.text}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {current.id === "tech" && (
              <div className="space-y-16">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.6em] text-primary">
                    <ShieldCheck className="h-4 w-4" /> TECHNOLOGY
                  </div>
                  <h2 className="speak-serif text-6xl md:text-[8rem] font-bold leading-none tracking-tighter italic">{current.title}.</h2>
                  <p className="text-xl md:text-2xl font-medium opacity-50 max-w-3xl leading-relaxed">{current.techNote}</p>
                </div>
                <div className="flex flex-wrap gap-4">
                  {current.tech?.map((t, i) => (
                    <motion.span key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 + 0.3 }}
                      className="px-8 py-4 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-black uppercase tracking-[0.4em] shadow-glow shadow-primary/5">
                      {t}
                    </motion.span>
                  ))}
                </div>
              </div>
            )}

            {current.id === "cta" && (
              <div className="text-center space-y-12">
                <div className="h-24 w-24 mx-auto rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <GraduationCap className="h-12 w-12 text-primary animate-pulse" />
                </div>
                <h1 className="speak-serif text-6xl md:text-9xl font-bold leading-[0.8] tracking-tighter">
                  Every learner deserves a <span className="text-primary italic">coach.</span>
                </h1>
                <p className="text-lg md:text-2xl font-medium opacity-40 max-w-2xl mx-auto leading-relaxed">
                  SpeakBold makes that possible — for free, for everyone, everywhere.
                </p>
                <div className="flex flex-col md:flex-row gap-8 justify-center mt-12">
                  <Link to="/" className="button-pill px-16 py-6 bg-primary text-white shadow-glow">
                    <span className="text-xs font-black uppercase tracking-[0.2em]">TRY SPEAKBOLD FREE</span>
                  </Link>
                  <a href="https://github.com/realtechnicalsupport/speakbold" target="_blank" rel="noreferrer" className="button-pill px-16 py-6 border-border/60 hover:bg-muted/10 opacity-40 hover:opacity-100 transition-all">
                    <span className="text-xs font-black uppercase tracking-[0.2em]">VIEW SOURCE</span>
                  </a>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <footer className="border-t border-border/60 relative z-20">
        <div className="container flex items-center justify-between py-8">
          <button onClick={goPrev} disabled={slide === 0}
            className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.4em] opacity-20 hover:opacity-100 hover:text-primary transition-all disabled:pointer-events-none group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> PREVIOUS
          </button>
          <div className="flex items-center gap-4">
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => setSlide(i)}
                className={cn("h-1 transition-all duration-700 rounded-full", slide === i ? "w-12 bg-primary shadow-glow shadow-primary/40" : "w-4 bg-muted hover:bg-primary/40")}
              />
            ))}
          </div>
          <button onClick={goNext} disabled={slide === total - 1}
            className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.4em] opacity-20 hover:opacity-100 hover:text-primary transition-all disabled:pointer-events-none group">
            NEXT <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </footer>
    </div>
  );
};

const ArrowLeft = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

export default PitchDeck;
