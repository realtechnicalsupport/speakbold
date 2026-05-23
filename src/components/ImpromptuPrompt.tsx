import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Shuffle, Clock } from "lucide-react";
import { useTimerActive } from "@/lib/timerState";
import { motion, useInView } from "framer-motion";

const PROMPTS = [
  "If you could instantly master any skill, what would it be and why?",
  "Convince me that breakfast is the most important meal.",
  "Describe a time you failed — and what it taught you.",
  "What is one belief you held five years ago that you no longer hold?",
  "Argue for or against: working from home is better than the office.",
  "Tell us about an ordinary object you couldn't live without.",
  "What is the most useful skill schools fail to teach?",
  "Explain quantum entanglement to a curious 10-year-old.",
  "Argue that failure is more valuable than success.",
  "Make the case for or against social media in three points.",
  "What would you say in a 60-second eulogy for your past self?",
  "Describe the best meal you've ever eaten without naming the food.",
];

export const ImpromptuPrompt = () => {
  const [prompt, setPrompt] = useState<string | null>(null);
  const [seconds, setSeconds] = useState<number | null>(null);
  const timerActive = useTimerActive();
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  // Load completed prompts from localStorage
  const getCompleted = (): Set<string> => {
    const saved = localStorage.getItem("speakbold:impromptu-prompts-completed");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  };

  const markCompleted = (p: string) => {
    const completed = getCompleted();
    completed.add(p);
    localStorage.setItem("speakbold:impromptu-prompts-completed", JSON.stringify([...completed]));
  };

  const shuffle = () => {
    const completed = getCompleted();
    const available = PROMPTS.filter(p => !completed.has(p));
    
    let next: string;
    if (available.length === 0) {
      // All prompts used - clear and start over or use AI to generate new ones
      localStorage.removeItem("speakbold:impromptu-prompts-completed");
      next = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
    } else {
      do {
        next = available[Math.floor(Math.random() * available.length)];
      } while (next === prompt && available.length > 1);
    }
    
    setPrompt(next);
    setSeconds(60);
  };

  // Auto-pick on first render
  useEffect(() => {
    if (!prompt) shuffle();
  }, []);

  // When timer hits 0, mark as completed
  useEffect(() => {
    if (seconds === 0 && prompt) {
      markCompleted(prompt);
    }
  }, [seconds, prompt]);

  useEffect(() => {
    if (seconds === null) return;
    const id = setInterval(() => {
      setSeconds((s) => (s === null || s <= 0 ? s : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [seconds === null]);

  return (
    <section id="practice" className="container py-24 md:py-32" ref={sectionRef}>
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="mx-auto max-w-4xl"
      >
        <div className="flex items-center gap-3 text-primary text-xs font-semibold tracking-[0.2em] uppercase mb-6">
          <span className="h-px w-10 bg-primary" />
          The Daily Impromptu
        </div>
        <h2 className="font-display text-4xl md:text-6xl font-semibold leading-[1.05] mb-10 text-balance">
          One prompt. Sixty seconds. <em className="text-primary not-italic">No notes.</em>
        </h2>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="relative bg-muted/5 border border-border/60 rounded-3xl p-8 md:p-14 shadow-soft overflow-hidden"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="h-4 w-4" />
              <span className="font-mono tabular-nums">
                {seconds === null ? "1:00" : `0:${String(seconds).padStart(2, "0")}`}
              </span>
            </div>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Prompt</span>
          </div>

          <p className="font-display text-3xl md:text-5xl leading-tight text-pretty mb-12 min-h-[6rem]">
            "{prompt}"
          </p>

          <div className="flex flex-wrap gap-3">
            <Button variant="hero" size="lg" onClick={shuffle} disabled={timerActive}>
              <Shuffle className="h-4 w-4" />
              New prompt
            </Button>
            <Button variant="outline" size="lg" onClick={() => setSeconds(60)}>
              Restart timer
            </Button>
          </div>
        </motion.div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-muted-foreground text-sm mt-6 text-center"
        >
          Speak out loud. Don't pause to plan. Finish the full minute — even if you ramble.
        </motion.p>
      </motion.div>
    </section>
  );
};
