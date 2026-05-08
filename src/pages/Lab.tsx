import { SiteHeader } from "@/components/SiteHeader";
import { Link } from "react-router-dom";
import { Mic, MessageSquare, Briefcase, Activity, FlaskConical } from "lucide-react";
import { motion } from "framer-motion";

const LAB_TOOLS = [
  {
    title: "Speaking Practice",
    description: "Practice your public speaking with structured drills.",
    icon: Mic,
    to: "/tracks/public-speaking",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    title: "Quick Thinking",
    description: "Think on your feet with random topics and limited time.",
    icon: MessageSquare,
    to: "/tracks/impromptu",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    title: "Interview Practice",
    description: "Practice behavioral and technical interview questions with AI.",
    icon: Briefcase,
    to: "/tracks/interviews",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    title: "Body Language",
    description: "Track your gestures and body language during speech.",
    icon: Activity,
    to: "/tracks/body-language",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
];

const Lab = () => {
  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute top-[10%] right-[-5%] w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-primary/5 rounded-full blur-[150px] opacity-30 pointer-events-none" />
      <SiteHeader />

      <section className="px-4 md:container pt-32 md:pt-48 pb-32 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 mb-16 max-w-2xl">
          <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.3em] text-primary">
            <FlaskConical className="h-4 w-4" /> THE LAB
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
            return (
              <motion.div
                key={tool.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={tool.to}
                  className="group block p-8 rounded-[2rem] glass-card transition-all duration-300 relative overflow-hidden h-full"
                >
                  <div className="grain pointer-events-none opacity-50" />
                  <div className={`h-14 w-14 rounded-full ${tool.bg} ${tool.color} flex items-center justify-center mb-6`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="speak-serif text-2xl mb-3 tracking-tight">{tool.title}</h3>
                  <p className="text-sm opacity-50 font-medium leading-relaxed mb-6">{tool.description}</p>
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    ENTER LAB <span className="text-lg leading-none">→</span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>
    </main>
  );
};

export default Lab;
