import { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Clipboard, ArrowRight, ShieldCheck, Microscope } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface TrackShellProps {
  eyebrow: string;
  title: ReactNode;
  intro: string;
  children: ReactNode;
  hideHeader?: boolean;
}

export const TrackShell = ({ eyebrow, title, intro, children, hideHeader = false }: TrackShellProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Background Motion */}
      <div className="absolute top-[10%] right-[-5%] w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-primary/5 rounded-full blur-[150px] animate-float opacity-30 pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-10%] w-[250px] h-[250px] md:w-[500px] md:h-[500px] bg-accent/5 rounded-full blur-[130px] animate-float opacity-20 pointer-events-none" style={{ animationDelay: "-4s" }} />

      <AnimatePresence>
        {!hideHeader && (
          <motion.div 
            initial={{ y: -100 }} 
            animate={{ y: 0 }} 
            exit={{ y: -100 }}
            className="relative z-50"
          >
            <SiteHeader />
          </motion.div>
        )}
      </AnimatePresence>

      <section className={cn(
        "px-4 md:container relative z-10 pb-20",
        hideHeader ? "pt-24 md:pt-32" : "pt-32 md:pt-48"
      )}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1 }}
        >
          <Link
            to="/"
            className="inline-flex items-center gap-3 text-xs font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-primary opacity-40 hover:opacity-100 transition-all mb-8 md:mb-16"
          >
            <ArrowLeft className="h-4 w-4" />
            RETURN TO OPERATIONAL HUB
          </Link>
        </motion.div>

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 md:gap-16 items-end mb-10 md:mb-24">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.1 }}
            className="space-y-10"
          >
            <div className="flex items-center gap-4 text-primary text-xs font-black tracking-[0.2em] md:tracking-[0.6em] uppercase">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              {eyebrow}
            </div>
            <h1 className="speak-serif text-4xl md:text-6xl lg:text-[9rem] leading-[0.85] md:leading-[0.8] text-foreground tracking-tighter break-words hyphens-auto min-w-0">
              {title}
            </h1>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            <p className="text-base md:text-2xl font-medium tracking-tight opacity-40 leading-relaxed italic border-l border-primary/20 pl-5 md:pl-10">
              {intro}
            </p>
          </motion.div>
        </div>
      </section>

      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="px-4 md:container relative z-10 pb-40"
      >
        {children}
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="px-4 md:container relative z-10 pb-32 border-t border-border/60 pt-16"
      >
        <Link
          to="/pre-flight"
          className="group block relative bg-muted/5 border border-border/60 rounded-2xl md:rounded-[4rem] p-6 md:p-16 hover:border-primary/40 hover:bg-primary/[0.02] transition-all duration-700 overflow-hidden shadow-soft"
        >
          <div className="grain pointer-events-none" />
          <div className="flex items-center justify-between relative z-10 gap-4">
            <div className="flex items-center gap-4 md:gap-12">
              <div className="flex items-center justify-center h-14 w-14 md:h-20 md:w-20 rounded-2xl md:rounded-[2.5rem] bg-primary/10 border border-primary/20 text-primary shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 shadow-glow shadow-primary/5">
                <Clipboard className="h-6 w-6 md:h-10 md:w-10" />
              </div>
              <div className="space-y-3 min-w-0">
                <p className="speak-serif text-xl md:text-4xl italic tracking-tighter group-hover:text-primary transition-colors truncate">Pre-Flight Checklist</p>
                <p className="text-xs font-black uppercase tracking-[0.2em] md:tracking-[0.4em] opacity-40">5-MINUTE PROTOCOL BEFORE HIGH-STAKES DEPLOYMENT</p>
              </div>
            </div>
            <ArrowRight className="h-10 w-10 opacity-10 group-hover:opacity-100 group-hover:translate-x-4 transition-all duration-700" />
          </div>
        </Link>
      </motion.div>

      <div className="py-16 flex flex-col items-center gap-8 border-t border-border/60 relative z-10 w-full overflow-hidden px-4">
          <div className="flex flex-wrap justify-center items-center gap-4 md:gap-6 text-[11px] md:text-xs font-black uppercase tracking-[0.2em] md:tracking-[1em] opacity-10 text-center">
            <Microscope className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
            <span className="truncate max-w-full">SPEAKBOLD OPERATIONAL FRAMEWORK v2.4</span>
          </div>
          <div className="h-20 w-[1px] bg-gradient-to-b from-primary/20 to-transparent" />
      </div>
    </main>
  );
};
