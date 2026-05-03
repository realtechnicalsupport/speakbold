import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Shuffle, Clock } from "lucide-react";

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

  return (
    <section id="practice" className="container py-24 md:py-32">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-3 text-primary text-xs font-semibold tracking-[0.2em] uppercase mb-6">
          <span className="h-px w-10 bg-primary" />
          The Daily Impromptu
        </div>
        <h2 className="font-display text-4xl md:text-6xl font-semibold leading-[1.05] mb-10 text-balance">
          One prompt. <em className="text-primary not-italic">Sixty seconds.</em> No notes.
        </h2>

        <div className="relative bg-card-gradient border border-border rounded-3xl p-8 md:p-14 shadow-soft overflow-hidden">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <span className="font-mono tabular-nums text-5xl md:text-6xl font-bold">
                {seconds === null ? "1:00" : `0:${String(seconds).padStart(2, "0")}`}
              </span>
            </div>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Prompt</span>
          </div>

          <p className="font-display text-3xl md:text-5xl leading-tight text-pretty mb-8 min-h-[8rem]">
            "{prompt}"
          </p>

          <div className="flex flex-wrap gap-3">
            <Button variant="hero" size="lg" onClick={shuffle}>
              <Shuffle className="h-4 w-4" />
              New prompt
            </Button>
            <Button variant="outline" size="lg" onClick={() => { setSeconds(60); }}>
              Restart timer
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

  useEffect(() => {
    if (seconds === null) return;
    const id = setInterval(() => {
      setSeconds((s) => (s === null || s <= 0 ? s : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [seconds === null]);

  return (
    <section id="practice" className="container py-24 md:py-32">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-3 text-primary text-xs font-semibold tracking-[0.2em] uppercase mb-6">
          <span className="h-px w-10 bg-primary" />
          The Daily Impromptu
        </div>
        <h2 className="font-display text-4xl md:text-6xl font-semibold leading-[1.05] mb-10 text-balance">
          One prompt. Sixty seconds. <em className="text-primary not-italic">No notes.</em>
        </h2>

        <div className="relative bg-card-gradient border border-border rounded-3xl p-8 md:p-14 shadow-soft overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="h-4 w-4" />
              <span className="font-mono tabular-nums">
                {seconds === null ? "0:60" : `0:${String(seconds).padStart(2, "0")}`}
              </span>
            </div>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Prompt</span>
          </div>

          <p className="font-display text-3xl md:text-5xl leading-tight text-pretty mb-12 min-h-[6rem]">
            "{prompt}"
          </p>

          <div className="flex flex-wrap gap-3">
            <Button variant="hero" size="lg" onClick={shuffle}>
              <Shuffle className="h-4 w-4" />
              New prompt
            </Button>
            <Button variant="outline" size="lg" onClick={() => setSeconds(60)}>
              Restart timer
            </Button>
          </div>
        </div>

        <p className="text-muted-foreground text-sm mt-6 text-center">
          Speak out loud. Don't pause to plan. Finish the full minute — even if you ramble.
        </p>
      </div>
    </section>
  );
};
