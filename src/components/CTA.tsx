import { Link } from "react-router-dom";
import { ArrowRight, Mic } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useAuth } from "@/context/AuthContext";

export const CTA = () => {
  const { user } = useAuth();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

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
    hidden: { opacity: 0, scale: 0.9, y: 30 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: "spring", stiffness: 60, damping: 15 }
    }
  };

  return (
    <section className="border-t border-border/60 bg-waves relative overflow-hidden" ref={ref}>
      {/* Background Decorative Element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] animate-pulse-subtle pointer-events-none" />

      <div className="container py-40 md:py-60 text-center relative z-10">
        <motion.div
          className="max-w-5xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <motion.div variants={itemVariants} className="text-xs font-bold uppercase tracking-[0.4em] mb-12 opacity-40">
            THE FINAL PROTOCOL
          </motion.div>
          
          <motion.div variants={itemVariants} className="mb-20 select-none">
             <h2 className="flex flex-col items-center animate-float" style={{ animationDuration: '12s' }}>
              <span className="font-sans-bold text-6xl md:text-[180px] leading-[0.8] text-foreground">READY</span>
              <span className="speak-serif text-7xl md:text-[200px] leading-[0.8] text-primary italic translate-y-[-10px] md:translate-y-[-40px]">
                You?
              </span>
            </h2>
          </motion.div>

          <motion.div variants={itemVariants} className="flex flex-col items-center gap-8">
            <p className="text-lg md:text-2xl font-medium tracking-tight max-w-xl opacity-60">
              Your next room is waiting. The only difference is how you enter it.
            </p>
            
            <Link 
              to={user ? "/pathway" : "/login"}
              className="button-pill px-16 py-5 flex items-center gap-6 group hover:scale-105 transition-transform"
            >
              <span className="text-2xl font-serif animate-pulse-subtle">✱</span>
              <span className="text-sm font-black uppercase tracking-[0.3em]">{user ? "THE JOURNEY" : "ENTER TRAINING"}</span>
              <span className="text-2xl font-serif animate-pulse-subtle">✱</span>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      <footer className="container border-t border-border/10 py-20 flex flex-col items-center gap-12 relative z-10">
        <div className="flex flex-col items-center gap-6">
          <Link to="/" className="flex items-center gap-1 group">
            <span className="speak-serif text-xl text-foreground">SPEAK</span>
            <span className="bold-sans text-xl">Bold</span>
          </Link>
          <div className="flex gap-8 text-xs font-bold uppercase tracking-[0.2em] opacity-40">
            <Link to="/tracks/public-speaking" className="hover:text-primary transition-colors">Public Speaking</Link>
            <Link to="/tracks/impromptu" className="hover:text-primary transition-colors">Impromptu</Link>
            <Link to="/tracks/interviews" className="hover:text-primary transition-colors">Interviews</Link>
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-2 opacity-30 text-[11px] font-bold uppercase tracking-[0.3em]">
          <span>© {new Date().getFullYear()} SPEAKBOLD MASTERCLASS</span>
          <span>BUILT FOR PRESENCE</span>
        </div>
      </footer>
    </section>
  );
};
