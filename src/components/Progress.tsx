import { Flame, Trophy, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const COMPLETED = [true, true, true, false, true, true, false];

export const Progress = () => {
  return (
    <section id="progress" className="container py-24 md:py-32 border-t border-border">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="flex items-center gap-3 text-primary text-xs font-semibold tracking-[0.2em] uppercase mb-6">
            <span className="h-px w-10 bg-primary" />
            Your practice
          </div>
          <h2 className="font-display text-4xl md:text-6xl font-semibold leading-[1.05] text-balance mb-8">
            Confidence isn't a trait. <em className="text-primary not-italic">It's a streak.</em>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed text-pretty mb-10 max-w-lg">
            Five minutes a day, tracked. Watch your filler words drop, your pace settle,
            and the moment you actually look forward to speaking up.
          </p>
          <Button variant="hero" size="lg">Begin your streak</Button>
        </div>

        <div className="bg-card-gradient border border-border rounded-3xl p-8 md:p-10 shadow-soft">
          <div className="flex items-center justify-between mb-10">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">This week</p>
              <p className="font-display text-3xl font-semibold">5 of 7 days</p>
            </div>
            <div className="grid place-items-center h-14 w-14 rounded-full bg-warm animate-pulse-glow">
              <Flame className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-10">
            {DAYS.map((d, i) => (
              <div key={i} className="text-center">
                <div
                  className={`h-16 rounded-xl mb-2 transition-all ${
                    COMPLETED[i]
                      ? "bg-warm shadow-glow"
                      : "bg-muted border border-border"
                  }`}
                />
                <span className="text-xs text-muted-foreground">{d}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-8 border-t border-border">
            <div className="flex items-center gap-3">
              <div className="grid place-items-center h-10 w-10 rounded-xl bg-muted">
                <Trophy className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="font-display text-xl font-semibold leading-none">23</p>
                <p className="text-xs text-muted-foreground mt-1">sessions</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="grid place-items-center h-10 w-10 rounded-xl bg-muted">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-display text-xl font-semibold leading-none">-42%</p>
                <p className="text-xs text-muted-foreground mt-1">filler words</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
