import { Flame, Trophy, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const COMPLETED = [true, true, true, false, true, true, false];

export const Progress = () => {
  return (
    <section className="py-16 sm:py-24 bg-secondary/30">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center max-w-5xl mx-auto">
          {/* Text content */}
          <div className="text-center lg:text-left">
            <span className="inline-block px-3 py-1 text-xs font-medium text-accent bg-accent/10 rounded-full mb-4">
              Your Progress
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 text-balance">
              Confidence is a streak
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto lg:mx-0">
              Five minutes a day, tracked. Watch your filler words drop and your pace settle over time.
            </p>
            <Button variant="hero" size="lg" asChild>
              <Link to="/login">Start your streak</Link>
            </Button>
          </div>

          {/* Stats card */}
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">This week</p>
                <p className="text-2xl font-bold">5 of 7 days</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Flame className="h-6 w-6 text-accent" />
              </div>
            </div>

            {/* Week visualization */}
            <div className="grid grid-cols-7 gap-2 mb-8">
              {DAYS.map((day, i) => (
                <div key={i} className="text-center">
                  <div
                    className={`h-12 sm:h-14 rounded-xl mb-2 transition-colors ${
                      COMPLETED[i] ? "bg-accent" : "bg-secondary border border-border"
                    }`}
                  />
                  <span className="text-xs text-muted-foreground">{day}</span>
                </div>
              ))}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Trophy className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-xl font-bold">23</p>
                  <p className="text-xs text-muted-foreground">sessions</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xl font-bold">-42%</p>
                  <p className="text-xs text-muted-foreground">filler words</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
