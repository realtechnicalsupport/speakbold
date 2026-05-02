import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Shuffle, Clock } from "lucide-react";

const PROMPTS = [
  "If you could instantly master any skill, what would it be and why?",
  "Convince me that breakfast is the most important meal of the day.",
  "Describe a time you failed — and what it taught you.",
  "What is one belief you held five years ago that you no longer hold?",
  "If you ran the world for a day, what is the first law you'd pass?",
  "Tell us about an ordinary object you couldn't live without.",
  "Argue for or against: working from home is better than the office.",
  "Describe yourself in three words — then defend each one.",
  "What does courage mean to you in everyday life?",
  "Sell me the city you grew up in as a vacation destination.",
  "Talk for 60 seconds about the color blue.",
  "What advice would you give your 16-year-old self?",
  "Pitch a brand new holiday — what is it and how do we celebrate?",
  "Describe the best meal you've ever eaten without naming the food.",
  "What is one small habit that has changed your life?",
];

export const ImpromptuPrompt = () => {
  const [prompt, setPrompt] = useState(PROMPTS[0]);
  const [seconds, setSeconds] = useState<number | null>(null);

  const shuffle = () => {
    let next = prompt;
    while (next === prompt) next = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
    setPrompt(next);
    setSeconds(60);
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
