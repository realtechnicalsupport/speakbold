import { Link } from "react-router-dom";
import { Mic, Zap, Briefcase, Activity, ArrowUpRight } from "lucide-react";

const TRACKS = [
  {
    icon: Mic,
    name: "Public Speaking",
    duration: "6 drills · timed practice",
    desc: "Build a talk that lands. Hooks, structure, pacing, and the pause that earns attention.",
    accent: "from-primary/20 to-transparent",
    href: "/tracks/public-speaking",
  },
  {
    icon: Zap,
    name: "Impromptu Speech",
    duration: "24 prompts · 3 difficulties",
    desc: "Train the muscle that responds when you're put on the spot — meetings, toasts, hot seats.",
    accent: "from-accent/20 to-transparent",
    href: "/tracks/impromptu",
  },
  {
    icon: Briefcase,
    name: "Job Interviews",
    duration: "10 questions · STAR + examples",
    desc: "STAR stories, salary talk, and the answer to 'tell me about yourself' that doesn't ramble.",
    accent: "from-primary/20 to-transparent",
    href: "/tracks/interviews",
  },
  {
    icon: Activity,
    name: "Body Language",
    duration: "4 gesture drills · posture + eyes",
    desc: "Stance, gestures, eye contact, and the breath patterns that quiet a shaky voice.",
    accent: "from-accent/20 to-transparent",
    href: "/tracks/body-language",
  },
];

export const Tracks = () => {
  return (
    <section id="tracks" className="container py-24 md:py-32 border-t border-border">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 text-primary text-xs font-semibold tracking-[0.2em] uppercase mb-6">
            <span className="h-px w-10 bg-primary" />
            Four tracks
          </div>
          <h2 className="font-display text-4xl md:text-6xl font-semibold leading-[1.05] text-balance">
            Pick the moment <em className="text-primary not-italic">you'll own</em> next.
          </h2>
        </div>
        <p className="text-muted-foreground max-w-sm text-pretty">
          Each track is its own page with real lessons, drills, prompts, and a built-in recorder.
          Free. No sign-up. Five minutes a day is enough.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {TRACKS.map((t, i) => (
          <Link
            to={t.href}
            key={t.name}
            className="group relative bg-card-gradient border border-border rounded-3xl p-8 md:p-10 hover:border-primary/40 transition-all duration-500 cursor-pointer overflow-hidden block"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className={`absolute -top-20 -right-20 h-64 w-64 rounded-full bg-gradient-radial ${t.accent} blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />

            <div className="relative flex items-start justify-between mb-10">
              <div className="grid place-items-center h-14 w-14 rounded-2xl bg-muted border border-border group-hover:bg-warm group-hover:border-transparent transition-all duration-500">
                <t.icon className="h-6 w-6 text-foreground group-hover:text-primary-foreground transition-colors" />
              </div>
              <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:-translate-y-1 group-hover:translate-x-1 transition-all" />
            </div>

            <div className="relative">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">{t.duration}</p>
              <h3 className="font-display text-3xl md:text-4xl font-semibold mb-4 leading-tight">
                {t.name}
              </h3>
              <p className="text-muted-foreground text-pretty leading-relaxed mb-6">{t.desc}</p>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                Open track →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
