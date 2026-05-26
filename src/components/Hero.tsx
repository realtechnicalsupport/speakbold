import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mic, Clock, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";

export const Hero = () => {
  const { user } = useAuth();

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background bg-waves">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
        className="absolute inset-0 pointer-events-none opacity-20"
      >
        <svg width="100%" height="100%" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 3, ease: "easeInOut" }}
            d="M0,1000 C200,800 400,900 600,700 C800,500 900,600 1000,400"
            stroke="currentColor" strokeWidth="0.5" fill="none"
          />
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 3, delay: 0.5, ease: "easeInOut" }}
            d="M0,900 C200,700 400,800 600,600 C800,400 900,500 1000,300"
            stroke="currentColor" strokeWidth="0.5" fill="none"
          />
        </svg>
      </motion.div>

      <div className="container relative z-10 flex flex-col items-center text-center">

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12 relative"
        >
          <div className="hidden md:block absolute -top-20 -left-20 w-40 h-40 bg-primary/20 blur-[80px] rounded-full animate-pulse pointer-events-none" />
          <div className="hidden md:block absolute -bottom-20 -right-20 w-40 h-40 bg-primary/20 blur-[80px] rounded-full animate-pulse pointer-events-none delay-700" />

          <h1 id="landing-hero-title" className="flex flex-col items-center group">
            <span className="flex overflow-hidden">
              {"Speak".split("").map((char, i) => (
                <motion.span
                  key={i}
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{
                    duration: 0.8,
                    delay: 0.2 + i * 0.1,
                    ease: [0.16, 1, 0.3, 1]
                  }}
                  className="speak-serif text-5xl sm:text-7xl md:text-[140px] leading-[0.8] text-foreground tracking-tighter inline-block"
                >
                  {char}
                </motion.span>
              ))}
            </span>
            <span className="relative inline-block mt-4">
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
                className="speak-serif text-[60px] sm:text-[90px] md:text-[180px] leading-[0.75] relative text-primary block italic"
              >
                Bold.
                {/* Glitch Layers */}
                <motion.span
                  animate={{
                    x: [-2, 2, -1, 1, 0],
                    opacity: [0.2, 0.4, 0.2, 0.3, 0.2]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="hidden md:motion-safe:block absolute inset-0 text-primary blur-[2px] pointer-events-none select-none italic"
                >
                  Bold.
                </motion.span>
                <motion.span
                  animate={{
                    x: [1, -1, 2, -2, 0],
                    opacity: [0.1, 0.3, 0.1, 0.2, 0.1]
                  }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="hidden md:motion-safe:block absolute inset-0 text-white blur-[4px] pointer-events-none select-none italic"
                >
                  Bold.
                </motion.span>
              </motion.span>

              {/* Decorative line */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.5, delay: 1.2, ease: "circOut" }}
                className="h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent mt-2"
              />
            </span>
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="text-lg md:text-2xl font-medium tracking-tight mb-20 max-w-2xl text-foreground/60"
        >
          Real practice. Instant AI feedback. Become a <span className="text-primary italic">confident speaker</span> — free.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.4 }}
          className="flex flex-col sm:flex-row items-center gap-6"
        >
          <Link
            to={user ? "/pathway" : "/login"}
            className="group relative flex items-center gap-8 px-10 py-4 rounded-full bg-primary text-white hover:scale-105 transition-all duration-500 overflow-hidden shadow-glow"
          >
            <span className="text-white text-xl font-serif">✱</span>
            <span className="text-sm font-black uppercase tracking-wide">
              {user ? "Continue learning" : "Start learning"}
            </span>
            <span className="text-white text-xl font-serif">✱</span>
          </Link>

          <Link
            to={user ? "/arena" : "/login"}
            className="group relative flex items-center gap-8 px-10 py-4 rounded-full border border-primary/30 hover:border-primary hover:bg-primary/5 transition-all duration-500 overflow-hidden"
          >
            <span className="text-primary text-xl font-serif">⚡</span>
            <span className="text-sm font-black uppercase tracking-wide text-primary">
              Practice now
            </span>
            <span className="text-primary text-xl font-serif">⚡</span>
          </Link>
        </motion.div>
      </div>

      <div className="absolute bottom-10 left-0 right-0 px-10 flex justify-between items-center text-xs font-bold uppercase tracking-widest opacity-40">
        <span>© {new Date().getFullYear()} SPEAKBOLD</span>
        <div className="flex gap-8">
          <span>PRACTICE</span>
          <span>RECORD</span>
          <span>MASTER</span>
        </div>
      </div>
    </section>
  );
};
