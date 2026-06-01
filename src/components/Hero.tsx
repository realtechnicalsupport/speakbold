import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { Mic } from "lucide-react";
import { LiveTrialDrill } from "@/components/LiveTrialDrill";

export const Hero = () => {
  const { user } = useAuth();
  const [trialOpen, setTrialOpen] = useState(false);

  return (
    <section className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden bg-waves">
      {/* Decorative SVG lines */}
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

      <div className="relative z-10 flex flex-col items-center text-center px-5 w-full max-w-5xl mx-auto">

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 md:mb-12 relative"
        >
          <div className="hidden md:block absolute -top-20 -left-20 w-40 h-40 bg-primary/20 blur-[80px] rounded-full animate-pulse pointer-events-none" />
          <div className="hidden md:block absolute -bottom-20 -right-20 w-40 h-40 bg-primary/20 blur-[80px] rounded-full animate-pulse pointer-events-none delay-700" />

          <h1 id="landing-hero-title" className="flex flex-col items-center group">
            {/* "Speak" — viewport-scaled on mobile, fixed large on desktop */}
            <span className="flex overflow-hidden">
              {"Speak".split("").map((char, i) => (
                <motion.span
                  key={i}
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.08 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  className="speak-serif leading-[0.85] text-foreground tracking-tighter inline-block"
                  style={{ fontSize: "clamp(3.75rem, 17vw, 140px)" }}
                >
                  {char}
                </motion.span>
              ))}
            </span>

            {/* "Bold." */}
            <span className="relative inline-block mt-1 md:mt-4">
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
                className="speak-serif leading-[0.75] relative text-primary block italic"
                style={{ fontSize: "clamp(5rem, 22vw, 180px)" }}
              >
                Bold.
                <motion.span
                  animate={{ x: [-2, 2, -1, 1, 0], opacity: [0.2, 0.4, 0.2, 0.3, 0.2] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="hidden md:motion-safe:block absolute inset-0 text-primary blur-[2px] pointer-events-none select-none italic"
                >
                  Bold.
                </motion.span>
                <motion.span
                  animate={{ x: [1, -1, 2, -2, 0], opacity: [0.1, 0.3, 0.1, 0.2, 0.1] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="hidden md:motion-safe:block absolute inset-0 text-white blur-[4px] pointer-events-none select-none italic"
                >
                  Bold.
                </motion.span>
              </motion.span>

              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.5, delay: 1.2, ease: "circOut" }}
                className="h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent mt-2"
              />
            </span>
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="text-base md:text-2xl font-medium tracking-tight mb-10 md:mb-20 max-w-lg text-foreground/60 leading-relaxed"
        >
          Mind blank in interviews. Voice shaky on stage. Practice out loud, get
          instant AI feedback, and become{" "}
          <span className="text-primary italic">unshakeable</span> — free.
        </motion.p>

        {/* CTA — one decisive primary action. Logged-out visitors see a single
            "Start free" so there's no choice to make; logged-in users get the
            two meaningfully-distinct destinations (learn vs. compete). */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          {user ? (
            <>
              <Link
                to="/pathway"
                className="btn-tactile btn-tactile-primary group w-full sm:w-auto relative flex items-center justify-center gap-6 px-8 sm:px-10 py-4 rounded-full overflow-hidden"
              >
                <span className="text-white text-xl font-serif">✱</span>
                <span className="text-sm font-black uppercase tracking-wide">Continue learning</span>
                <span className="text-white text-xl font-serif">✱</span>
              </Link>

              <Link
                to="/arena"
                className="group w-full sm:w-auto relative flex items-center justify-center gap-6 px-8 sm:px-10 py-4 rounded-full border border-primary/30 hover:border-primary hover:bg-primary/5 active:scale-95 transition-all duration-300 overflow-hidden"
              >
                <span className="text-primary text-xl font-serif">⚡</span>
                <span className="text-sm font-black uppercase tracking-wide text-primary">Practice now</span>
                <span className="text-primary text-xl font-serif">⚡</span>
              </Link>
            </>
          ) : (
            <>
              {/* Aha-first: the friction-free trial is the primary action, the
                  signup wall comes after they've felt the magic. */}
              <button
                onClick={() => setTrialOpen(true)}
                className="btn-tactile btn-tactile-primary group w-full sm:w-auto relative flex items-center justify-center gap-4 px-8 sm:px-10 py-4 rounded-full overflow-hidden"
              >
                <Mic className="h-4 w-4" />
                <span className="text-sm font-black uppercase tracking-wide">Try a 30-second drill</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 hidden sm:inline">no signup</span>
              </button>

              <Link
                to="/login?mode=signup"
                className="group w-full sm:w-auto relative flex items-center justify-center gap-3 px-8 sm:px-10 py-4 rounded-full border border-primary/30 hover:border-primary hover:bg-primary/5 active:scale-95 transition-all duration-300"
              >
                <span className="text-sm font-black uppercase tracking-wide text-primary">Start free</span>
              </Link>
            </>
          )}
        </motion.div>
      </div>

      {/* Bottom bar — centered on mobile, spread on desktop */}
      <div className="absolute bottom-6 left-0 right-0 px-6 sm:px-10 flex items-center justify-center sm:justify-between text-[10px] font-bold uppercase tracking-widest opacity-30">
        <span className="hidden sm:block">© {new Date().getFullYear()} SPEAKBOLD</span>
        <div className="flex gap-5 sm:gap-8">
          <span>PRACTICE</span>
          <span>RECORD</span>
          <span>MASTER</span>
        </div>
      </div>

      <LiveTrialDrill open={trialOpen} onClose={() => setTrialOpen(false)} />
    </section>
  );
};
