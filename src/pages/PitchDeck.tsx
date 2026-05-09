import { useState } from "react";
import { Link } from "react-router-dom";
import { Mic, MessageSquare, Briefcase, BookOpen, Lightbulb, Trophy, Sparkles, ArrowRight, Globe, Users, TrendingUp, ShieldCheck, Target, Zap, GraduationCap, Heart, BarChart3, FileText, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const SLIDES = [
  {
    id: "cover",
    title: "SpeakBold",
    subtitle: "DEMOCRATIZING ELITE COMMUNICATION SKILLS.",
    tagline: "UN SDG 4 · QUALITY EDUCATION FOR ALL",
    hero: true,
  },
  {
    id: "problem",
    title: "The Silence Gap",
    lead: "Communication is the #1 predictor of social mobility — yet it is the least taught skill in global education systems.",
    points: [
      "Economic Barrier: Private coaching costs $200+/hour, creating an elite-only skill tier.",
      "SDG 4 Gap: Lack of structured speaking practice prevents 'Quality Education' for all.",
      "Direct Impact: Targets SDG 4.4 (Skills for employment) and 4.7 (Education for sustainable development).",
    ],
    icon: "Target",
  },
  {
    id: "solution",
    title: "The AI Equalizer",
    lead: "SpeakBold solves SDG 4 challenges by turning every smartphone into a private speaking laboratory at zero cost.",
    points: [
      "Scalable Literacy: Democratizing advanced soft skills for billions of learners.",
      "Bias-Free Feedback: AI coaching that provides objective, standard-based analysis.",
      "Gamified Equity: Bridging the confidence gap through structured, verifiable mastery.",
    ],
    icon: "Zap",
  },
  {
    id: "how-it-works-1",
    title: "The Mastery Loop",
    lead: "Our platform uses a 3-step pedagogical loop to ensure skill retention and measurable growth.",
    steps: [
      { name: "1. LEARN", desc: "Watch tactical strategy modules on specific speaking techniques." },
      { name: "2. DRILL", desc: "Perform high-intensity 60-second speaking tasks in The Lab." },
      { name: "3. AUDIT", desc: "Receive instant AI breakdowns and 'pass' gates to advance." },
    ],
  },
  {
    id: "how-it-works-2",
    title: "User Journey",
    lead: "From first record to verified mastery — a seamless flow designed for growth.",
    journey: [
      { step: "Onboarding", desc: "Identify skill level and set global ranking goals." },
      { step: "Training", desc: "Navigate the 'Pathway' with AI-locked progression." },
      { step: "Validation", desc: "Earn skill transcripts and move up the Leaderboard." },
    ],
  },
  {
    id: "how-it-works-3",
    title: "Practice Ecosystem",
    lead: "Two distinct environments for technical growth and real-world application.",
    tracks: [
      { name: "Skill Surgery (The Lab)", icon: Mic, desc: "Focused, unguided practice to refine specific mechanics like filler word reduction." },
      { name: "The Arena (Peer Battle)", icon: Users, desc: "Real-time 1v1 speaking duels judged by AI for true competitive pressure." },
    ],
  },
  {
    id: "impact",
    title: "Global Impact",
    lead: "SpeakBold isn't just an app; it's a direct intervention in global education equity.",
    impactPoints: [
      { stat: "SDG 4", label: "Direct alignment with Quality Education goals" },
      { stat: "0.00", label: "Cost to the learner for elite-level coaching" },
      { stat: "Verifiable", label: "Skills transcripts that boost employability" },
      { stat: "Inclusive", label: "Built for low-bandwidth, high-impact reach" },
    ],
  },
  {
    id: "risks",
    title: "Risks & Mitigation",
    lead: "Proactive management of technical and ethical challenges.",
    riskPoints: [
      { 
        risk: "AI Hallucinations", 
        mitigation: "Strict prompt engineering and threshold-based scoring to ensure consistent feedback." 
      },
      { 
        risk: "Data Privacy", 
        mitigation: "Encrypted recording storage and transparent data deletion policies for learner safety." 
      },
      { 
        risk: "Accessibility", 
        mitigation: "Optimized for low-bandwidth environments to reach rural and under-resourced areas." 
      },
    ],
  },
  {
    id: "roadmap",
    title: "Next Steps",
    lead: "The roadmap from a tool to a global standard.",
    points: [
      "Multi-Language Support: Expanding AI coaching to Spanish, French, and Hindi.",
      "LMS Integration: API for schools to embed SpeakBold into their curricula.",
      "Certification: Partnering with industry leaders for 'AI-Verified Communication' badges.",
    ],
  },
  {
    id: "team",
    title: "Elite Builders",
    lead: "A lean, high-velocity team dedicated to the SpeakBold mission.",
    team: [
      { name: "Lead Operator", role: "Product Strategy & Architecture", exp: "Full-stack builder focused on high-impact UX." },
      { name: "AI Strategist", role: "Model Fine-Tuning", exp: "Specializing in real-time NLP and scoring systems." },
      { name: "SDG Advocate", role: "Community & Impact", exp: "Ensuring global alignment with UN Education goals." },
    ],
  },
  {
    id: "cta",
    title: "Ready to SpeakBold?",
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
            {current.id === "cover" && (
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

            {(current.id === "problem" || current.id === "solution" || current.id === "roadmap") && current.points && (
              <div className="space-y-16">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.6em] text-primary">
                    <Target className="h-4 w-4" /> SLIDE {slide + 1} / {total}
                  </div>
                  <h2 className="speak-serif text-6xl md:text-[8rem] font-bold leading-none tracking-tighter italic">{current.title}.</h2>
                  {current.lead && <p className="text-xl md:text-2xl font-medium opacity-50 max-w-3xl leading-relaxed">{current.lead}</p>}
                </div>
                <ul className="space-y-10">
                  {current.points.map((p: any, i: number) => (
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

            {current.id === "how-it-works-1" && current.steps && (
              <div className="space-y-16">
                <div className="space-y-4">
                   <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.6em] text-primary">
                    <Zap className="h-4 w-4" /> THE MASTERY LOOP
                  </div>
                  <h2 className="speak-serif text-6xl md:text-[8rem] font-bold leading-none tracking-tighter italic">{current.title}.</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                  {current.steps.map((s: any, i: number) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 + 0.3 }}
                      className="p-10 rounded-[3rem] border border-primary/20 bg-primary/5 space-y-6 relative overflow-hidden group">
                      <div className="h-14 w-14 rounded-2xl bg-primary text-white flex items-center justify-center text-2xl font-black italic shadow-glow">
                        0{i + 1}
                      </div>
                      <div className="space-y-2">
                        <h3 className="speak-serif text-3xl font-bold italic">{s.name}</h3>
                        <p className="text-lg font-medium opacity-40 leading-relaxed">{s.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {current.id === "how-it-works-2" && current.journey && (
              <div className="space-y-16">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.6em] text-primary">
                    <TrendingUp className="h-4 w-4" /> THE USER FLOW
                  </div>
                  <h2 className="speak-serif text-6xl md:text-[8rem] font-bold leading-none tracking-tighter italic">{current.title}.</h2>
                </div>
                <div className="relative pt-12">
                  <div className="absolute top-[60px] left-0 right-0 h-0.5 bg-border/40 hidden md:block" />
                  <div className="grid md:grid-cols-3 gap-12 relative z-10">
                    {current.journey.map((j: any, i: number) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.2 + 0.3 }}
                        className="space-y-6">
                        <div className="h-12 w-12 rounded-full bg-background border-4 border-primary flex items-center justify-center text-sm font-black italic shadow-glow">
                          {i + 1}
                        </div>
                        <div className="space-y-2">
                          <h3 className="speak-serif text-3xl font-bold italic">{j.step}</h3>
                          <p className="text-lg font-medium opacity-40 leading-relaxed">{j.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {current.id === "how-it-works-3" && current.tracks && (
              <div className="space-y-16">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.6em] text-primary">
                    <Sparkles className="h-4 w-4" /> PRACTICE ECOSYSTEM
                  </div>
                  <h2 className="speak-serif text-6xl md:text-[8rem] font-bold leading-none tracking-tighter italic">{current.title}.</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                  {current.tracks.map((t: any, i: number) => {
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
                  {current.impactPoints?.map((item: any, i: number) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 + 0.3 }}
                      className="text-center p-8 rounded-[2rem] border border-primary/20 bg-primary/5 space-y-3">
                      <p className="speak-serif text-5xl font-bold text-primary italic">{item.stat}</p>
                      <p className="text-xs font-black uppercase tracking-widest opacity-40">{item.label}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {current.id === "risks" && current.riskPoints && (
              <div className="space-y-16">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.6em] text-primary">
                    <ShieldCheck className="h-4 w-4" /> RISKS & MITIGATION
                  </div>
                  <h2 className="speak-serif text-6xl md:text-[8rem] font-bold leading-none tracking-tighter italic">{current.title}.</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  {current.riskPoints.map((r: any, i: number) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 + 0.3 }}
                      className="p-8 rounded-[2rem] border border-border/60 bg-muted/5 space-y-6">
                      <div className="space-y-2">
                        <p className="text-xs font-black uppercase tracking-widest text-primary">RISK</p>
                        <h3 className="speak-serif text-2xl font-bold italic">{r.risk}</h3>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-black uppercase tracking-widest opacity-30">MITIGATION</p>
                        <p className="text-sm font-medium opacity-60 leading-relaxed">{r.mitigation}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {current.id === "team" && current.team && (
              <div className="space-y-16">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.6em] text-primary">
                    <Users className="h-4 w-4" /> ELITE BUILDERS
                  </div>
                  <h2 className="speak-serif text-6xl md:text-[8rem] font-bold leading-none tracking-tighter italic">{current.title}.</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                  {current.team.map((m: any, i: number) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 + 0.3 }}
                      className="p-10 rounded-[3.5rem] border border-border/60 bg-muted/5 text-center space-y-6 group hover:border-primary/40 transition-all duration-700">
                      <div className="h-24 w-24 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                        <Users className="h-10 w-10 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="speak-serif text-3xl font-bold italic">{m.name}</h3>
                        <p className="text-xs font-black uppercase tracking-widest text-primary">{m.role}</p>
                      </div>
                      <p className="text-sm font-medium opacity-40 leading-relaxed">{m.exp}</p>
                    </motion.div>
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
