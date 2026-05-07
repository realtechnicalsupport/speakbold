import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, AlertTriangle, ArrowRight, ShieldCheck, Microscope, Zap, Target, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/SiteHeader";
import { motion, AnimatePresence } from "framer-motion";

type Module = "bodyLanguage" | "interview" | "publicSpeaking";

interface ChecklistItem {
  id: string;
  text: string;
  module?: Module;
}

const CHECKLISTS: Record<Module, ChecklistItem[]> = {
  bodyLanguage: [
    { id: "bl-1", text: "Checked your posture in a mirror for 30 seconds", module: "bodyLanguage" },
    { id: "bl-2", text: "Recorded and reviewed your body language", module: "bodyLanguage" },
    { id: "bl-3", text: "Practiced 4 natural gestures that feel comfortable", module: "bodyLanguage" },
  ],
  interview: [
    { id: "int-1", text: "Prepared a complete STAR-format story for a key question", module: "interview" },
    { id: "int-2", text: "Listened back to your practice and removed filler words", module: "interview" },
    { id: "int-3", text: "Done a timed mock interview under realistic pressure", module: "interview" },
  ],
  publicSpeaking: [
    { id: "ps-1", text: "Practiced your opening hook at least 3 times", module: "publicSpeaking" },
    { id: "ps-2", text: "Rehearsed your intentional pause after the key point", module: "publicSpeaking" },
    { id: "ps-3", text: "Recorded and reviewed your closing line", module: "publicSpeaking" },
  ],
};

const GENERAL = [
  { id: "gen-1", text: "Done 4-4-4 box breathing to calm your nerves" },
  { id: "gen-2", text: "Reviewed your key points one last time" },
  { id: "gen-3", text: "Planned to arrive 10 minutes early" },
];

const PreFlightChecklist = () => {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<Module | "general">("general");

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allChecked = (items: ChecklistItem[]) => items.every((i) => checked.has(i.id));
  const currentItems = activeTab === "general" ? GENERAL : CHECKLISTS[activeTab as Module];

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <SiteHeader />
      
      {/* Background Motion */}
      <div className="absolute top-[15%] left-[-5%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] animate-float opacity-30 pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] bg-accent/5 rounded-full blur-[130px] animate-float opacity-20 pointer-events-none" style={{ animationDelay: "-4s" }} />

      <div className="container pt-32 md:pt-48 pb-24 relative z-10">
        <div className="max-w-5xl mx-auto space-y-24">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="space-y-10 text-center"
          >
            <div className="flex justify-center items-center gap-4 text-xs font-black uppercase tracking-[0.6em] text-primary">
              <ShieldCheck className="h-4 w-4" />
              PREPARATION CHECKLIST
            </div>
            <h1 className="speak-serif text-6xl md:text-[10rem] leading-[0.8] text-foreground tracking-tighter">
              Before you go <br />
              <span className="text-primary italic">live</span>.
            </h1>
            <p className="text-lg md:text-3xl font-medium tracking-tight opacity-40 max-w-3xl mx-auto leading-relaxed italic">
              "Preparation is the difference between hoping and knowing." Run through your checklist before you step up.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-primary/5 border border-primary/20 rounded-[3rem] p-10 flex items-start gap-8 shadow-glow shadow-primary/5"
          >
            <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shrink-0">
              <AlertTriangle className="h-6 w-6 text-white animate-pulse" />
            </div>
            <div className="space-y-2">
               <p className="text-xs font-black uppercase tracking-[0.4em] text-primary">HOW TO USE THIS</p>
               <p className="text-sm md:text-lg font-medium tracking-tight opacity-60">
                 Pick your situation below and check off each item. Don't skip anything — preparation is the real competitive edge.
               </p>
            </div>
          </motion.div>

          <div className="space-y-16">
            <div className="flex flex-wrap justify-center gap-6 border-b border-border/60 pb-12">
              {[
                { id: "general", label: "GENERAL" },
                { id: "bodyLanguage", label: "BODY LANGUAGE" },
                { id: "interview", label: "INTERVIEW" },
                { id: "publicSpeaking", label: "PUBLIC SPEAKING" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={cn(
                    "px-12 py-5 rounded-full text-xs font-black uppercase tracking-[0.3em] transition-all",
                    activeTab === tab.id
                      ? "bg-primary text-white shadow-glow"
                      : "bg-muted/5 border border-border/60 text-foreground/30 hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div 
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.8, ease: "circOut" }}
                className="bg-muted/5 border border-border/60 rounded-[4rem] p-12 md:p-20 space-y-16 relative overflow-hidden shadow-soft"
              >
                <div className="grain pointer-events-none" />
                <div className="flex items-center justify-between relative z-10">
                   <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.5em] text-primary">
                      <Zap className="h-4 w-4" />
                      {activeTab === "general" ? "GENERAL PREP" : `${activeTab.replace(/([A-Z])/g, ' $1').toUpperCase().trim()} CHECKLIST`}
                   </div>
                   {activeTab !== "general" && allChecked(CHECKLISTS[activeTab as Module]) && (
                     <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-4 text-primary text-xs font-black uppercase tracking-[0.4em]">
                       <Check className="h-4 w-4" strokeWidth={4} /> YOU'RE READY!
                     </motion.div>
                   )}
                </div>

                <ul className="space-y-10 relative z-10">
                  {currentItems.map((item, i) => {
                    const isChecked = checked.has(item.id);
                    return (
                      <motion.li 
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <button
                          onClick={() => toggle(item.id)}
                          className="w-full flex items-center gap-10 text-left group"
                        >
                          <div
                            className={cn(
                              "grid place-items-center h-16 w-16 rounded-[1.5rem] border-2 transition-all duration-700 shrink-0",
                              isChecked
                                ? "bg-primary border-primary shadow-glow shadow-primary/20"
                                : "border-border/60 bg-background/5 group-hover:border-primary/40"
                            )}
                          >
                            {isChecked && <Check className="h-8 w-8 text-white animate-in zoom-in duration-500" strokeWidth={4} />}
                          </div>
                          <span className={cn(
                            "speak-serif text-3xl md:text-4xl italic tracking-tighter transition-all duration-700",
                            isChecked ? "opacity-10 line-through" : "text-foreground group-hover:text-primary"
                          )}>
                            {item.text}
                          </span>
                        </button>
                      </motion.li>
                    );
                  })}
                </ul>

                {activeTab !== "general" && (
                  <div className="pt-16 border-t border-border/60 relative z-10">
                    <Link
                      to={
                        activeTab === "bodyLanguage"
                          ? "/tracks/body-language"
                          : activeTab === "interview"
                          ? "/tracks/interviews"
                          : "/tracks/public-speaking"
                      }
                      className="button-pill w-full md:w-auto px-16 py-6 bg-primary text-white shadow-glow group"
                    >
                      <span className="text-xs font-black uppercase tracking-[0.2em]">ACCESS {activeTab === "bodyLanguage" ? "BODY" : activeTab.toUpperCase()} MODULE</span>
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-2 transition-transform duration-700 ml-2" />
                    </Link>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex flex-col items-center gap-12 py-32 border-t border-border/60">
            <div className="flex items-center gap-6 text-xs font-black uppercase tracking-[1em] opacity-10">
              <Microscope className="h-5 w-5" />
              OPERATIONAL QUICK LINKS
            </div>
            <div className="flex flex-wrap justify-center gap-12">
               {["BODY-LANGUAGE", "INTERVIEWS", "PUBLIC-SPEAKING", "IMPROMPTU"].map(link => (
                 <Link key={link} to={`/tracks/${link.toLowerCase().replace("-", " ")}`} className="text-xs font-black uppercase tracking-[0.4em] opacity-20 hover:opacity-100 hover:text-primary transition-all">
                    {link}
                 </Link>
               ))}
            </div>
            <div className="h-20 w-[1px] bg-gradient-to-b from-primary/20 to-transparent" />
          </div>
        </div>
      </div>
    </main>
  );
};

export default PreFlightChecklist;
