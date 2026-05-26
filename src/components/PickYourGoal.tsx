import { Link } from "react-router-dom";
import { Briefcase, Sparkles, MessageSquareOff, Users, ArrowUpRight, Target, Zap, Mic, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { useRef } from "react";
import { useInView as useFramerInView } from "framer-motion";

const GOALS = [
  {
    icon: Briefcase,
    title: "Interview Mastery",
    label: "PROFESSIONAL DEPLOYMENT",
    desc: "STAR stories, salary negotiation, and an answer to 'tell me about yourself' that doesn't ramble.",
    href: "/tracks/interviews",
    cta: "ACCESS TRACK",
    color: "from-blue-500/10 to-primary/5",
  },
  {
    icon: Sparkles,
    title: "Public Speaking",
    label: "STAGE PRESENCE",
    desc: "A warm hook, a story with a turning point, and a toast that lands without notes.",
    href: "/tracks/public-speaking",
    cta: "ACCESS TRACK",
    color: "from-amber-500/10 to-primary/5",
  },
  {
    icon: MessageSquareOff,
    title: "Vocal Authority",
    label: "FLUENCY PROTOCOL",
    desc: "Pause drills, filler-word awareness, and the breath pattern that steadies a shaky voice.",
    href: "/tracks/body-language",
    cta: "ACCESS TRACK",
    color: "from-emerald-500/10 to-primary/5",
  },
  {
    icon: Users,
    title: "Impromptu Logic",
    label: "RAPID RESPONSE",
    desc: "Frameworks like PREP and What-So What-Now What so you're never caught flat-footed.",
    href: "/tracks/impromptu",
    cta: "ACCESS TRACK",
    color: "from-purple-500/10 to-primary/5",
  },
];

export const PickYourGoal = () => {
  const ref = useRef(null);
  const isInView = useFramerInView(ref, { once: true, margin: "-100px" });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 60, damping: 15 } }
  };

  return (
    <section className="container py-32 md:py-60 border-t border-border/60 relative overflow-hidden" ref={ref}>
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] animate-pulse-subtle pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/3 rounded-full blur-[120px] animate-pulse-subtle pointer-events-none" style={{ animationDelay: '-3s' }} />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        className="text-center mb-40 relative z-10"
      >
        <motion.div variants={itemVariants} className="flex items-center justify-center gap-4 text-xs font-bold uppercase tracking-[0.5em] mb-12 opacity-40">
          <span className="h-px w-12 bg-foreground/20" />
          SELECT SPECIALIZATION
          <span className="h-px w-12 bg-foreground/20" />
        </motion.div>
        <motion.h2 variants={itemVariants} className="speak-serif text-3xl md:text-9xl leading-[0.85] text-foreground mb-12 tracking-tighter">
          Pick the <span className="text-primary italic">moment</span> <br />
          you need to own.
        </motion.h2>
        <motion.p variants={itemVariants} className="text-lg md:text-2xl font-medium tracking-tight max-w-2xl mx-auto opacity-60 leading-relaxed">
          The room listens to who you are, not just what you say. Choose your training vector and begin your ascent.
        </motion.p>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 relative z-10"
      >
        {GOALS.map((g, i) => (
          <motion.div 
            key={g.title} 
            variants={itemVariants}
            className="group"
          >
            <Link
              to={g.href}
              className="flex flex-col h-full p-8 md:p-14 bg-muted/5 border border-border/60 rounded-[3.5rem] hover:border-primary/40 hover:bg-primary/[0.02] transition-all duration-700 relative overflow-hidden group"
            >
              {/* Subtle background gradient on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${g.color} opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`} />
              
              <div className="relative z-10 space-y-10">
                <div className="flex items-start justify-between">
                  <div className="flex items-center justify-center h-20 w-20 rounded-[1.5rem] bg-background border border-border/50 shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-500" style={{ animationDelay: `${i * 0.5}s`, animationDuration: '6s' }}>
                    <g.icon className="h-8 w-8 text-foreground group-hover:text-primary transition-colors" strokeWidth={1.5} />
                  </div>
                  <div className="h-10 w-10 rounded-full border border-border/60 flex items-center justify-center opacity-20 group-hover:opacity-100 group-hover:bg-primary group-hover:border-primary transition-all duration-500 animate-float">
                    <ArrowUpRight className="h-5 w-5 group-hover:text-white transition-colors" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-xs font-black uppercase tracking-[0.3em] text-primary opacity-60 group-hover:opacity-100 transition-opacity">
                    {g.label}
                  </div>
                  <h3 className="speak-serif text-2xl md:text-5xl text-foreground group-hover:text-primary transition-colors duration-500">
                    {g.title}
                  </h3>
                  <p className="text-lg font-medium tracking-tight opacity-40 group-hover:opacity-60 leading-tight transition-opacity duration-500">
                    {g.desc}
                  </p>
                </div>

                <div className="pt-4">
                  <div className="inline-flex items-center gap-4 px-8 py-3 rounded-full border border-border/50 text-xs font-black uppercase tracking-widest group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all duration-500 animate-float">
                    {g.cta}
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-40 text-center py-20 text-xs font-bold uppercase tracking-[0.5em] opacity-10">
        CORE TRAINING VECTORS • SYSTEM VERSION 2.4
      </div>
    </section>
  );
};
