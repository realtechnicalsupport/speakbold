import { Link } from "react-router-dom";
import { Mic, Zap, Briefcase, Activity, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { useRef } from "react";
import { useInView as useFramerInView } from "framer-motion";

const TRACKS = [
  {
    icon: Mic,
    name: "Public Speaking",
    duration: "6 drills · timed practice",
    desc: "Build a talk that lands. Hooks, structure, pacing, and the pause that earns attention.",
    accent: "from-primary/20 to-transparent",
    href: "/tracks/public-speaking",
  },
  {
    icon: Zap,
    name: "Impromptu Speech",
    duration: "24 prompts · 3 difficulties",
    desc: "Train the muscle that responds when you're put on the spot — meetings, toasts, hot seats.",
    accent: "from-accent/20 to-transparent",
    href: "/tracks/impromptu",
  },
  {
    icon: Briefcase,
    name: "Job Interviews",
    duration: "10 questions · STAR + examples",
    desc: "STAR stories, salary talk, and the answer to 'tell me about yourself' that doesn't ramble.",
    accent: "from-primary/20 to-transparent",
    href: "/tracks/interviews",
  },
  {
    icon: Activity,
    name: "Body Language",
    duration: "4 gesture drills · posture + eyes",
    desc: "Stance, gestures, eye contact, and the breath patterns that quiet a shaky voice.",
    accent: "from-accent/20 to-transparent",
    href: "/tracks/body-language",
  },
];

export const Tracks = () => {
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
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 60, damping: 15 } }
  };

  return (
    <section id="tracks" className="container py-32 md:py-60 border-t border-border/60" ref={ref}>
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-32"
      >
        <div className="max-w-3xl">
          <motion.div variants={itemVariants} className="text-sm font-bold uppercase tracking-[0.4em] mb-12 opacity-40">
            SPECIALIZED CURRICULUM
          </motion.div>
          <motion.h2 variants={itemVariants} className="speak-serif text-3xl md:text-8xl leading-[0.9] text-foreground">
            Select your <br />
            <span className="text-primary italic">mastery</span> next.
          </motion.h2>
        </div>
        <motion.p variants={itemVariants} className="text-lg font-medium max-w-sm tracking-tight opacity-60 leading-relaxed">
          Each track is a deep dive into the mechanics of presence. 
          Drills, real-time feedback, and the protocols used by global leaders.
        </motion.p>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        className="grid md:grid-cols-2 gap-8"
      >
        {TRACKS.map((t, i) => (
          <motion.div 
            key={t.name} 
            variants={itemVariants}
            className="group"
          >
            <Link
              to={t.href}
              className="p-8 md:p-20 flex flex-col h-full border border-border/60 rounded-[3rem] hover:border-primary/40 hover:bg-primary/5 transition-all duration-500 group"
            >
              <div className="flex items-start justify-between mb-20">
                <div className="flex items-center justify-center h-14 w-14 rounded-full bg-muted group-hover:bg-primary/10 transition-colors">
                  <t.icon className="h-6 w-6 text-foreground group-hover:text-primary transition-colors" strokeWidth={1.5} />
                </div>
                <div className="text-sm font-bold uppercase tracking-widest opacity-40">
                  {t.duration}
                </div>
              </div>

              <div className="mt-auto">
                <h3 className="speak-serif text-2xl md:text-5xl text-foreground mb-6">
                  {t.name}
                </h3>
                <p className="text-lg font-medium tracking-tight opacity-40 mb-12 max-w-md">
                  {t.desc}
                </p>
                <div className="button-pill inline-flex items-center gap-4 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all duration-500">
                  <span className="text-sm font-bold uppercase tracking-widest">ACCESS TRACK</span>
                  <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
};
