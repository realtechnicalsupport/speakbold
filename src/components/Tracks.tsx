import { Link } from "react-router-dom";
import { Mic, Zap, Briefcase, Activity, ArrowRight } from "lucide-react";

const TRACKS = [
  {
    icon: Mic,
    name: "Public Speaking",
    duration: "6 drills",
    desc: "Build talks that land. Hooks, structure, pacing, and the pause that earns attention.",
    href: "/tracks/public-speaking",
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    icon: Zap,
    name: "Impromptu",
    duration: "24 prompts",
    desc: "Train the muscle that responds when you're put on the spot.",
    href: "/tracks/impromptu",
    color: "bg-accent/10 text-accent",
  },
  {
    icon: Briefcase,
    name: "Interviews",
    duration: "10 questions",
    desc: "STAR stories, salary talk, and confident introductions.",
    href: "/tracks/interviews",
    color: "bg-emerald-500/10 text-emerald-600",
  },
  {
    icon: Activity,
    name: "Body Language",
    duration: "4 drills",
    desc: "Stance, gestures, eye contact, and breath control.",
    href: "/tracks/body-language",
    color: "bg-violet-500/10 text-violet-600",
  },
];

export const Tracks = () => {
  return (
    <section id="tracks" className="py-16 sm:py-24">
      <div className="container">
        {/* Section header */}
        <div className="max-w-2xl mb-12">
          <span className="inline-block px-3 py-1 text-xs font-medium text-accent bg-accent/10 rounded-full mb-4">
            4 Tracks
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-balance mb-4">
            Choose your focus
          </h2>
          <p className="text-lg text-muted-foreground">
            Each track has real lessons, drills, and a built-in recorder. Pick one and start practicing.
          </p>
        </div>

        {/* Track cards */}
        <div className="grid sm:grid-cols-2 gap-4">
          {TRACKS.map((track) => (
            <Link
              key={track.name}
              to={track.href}
              className="group flex flex-col p-6 bg-card border border-border rounded-2xl hover:border-foreground/20 hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${track.color}`}>
                  <track.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-md">
                  {track.duration}
                </span>
              </div>

              <h3 className="text-xl font-semibold mb-2">{track.name}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4 flex-1">
                {track.desc}
              </p>

              <div className="flex items-center gap-1.5 text-sm font-medium text-accent group-hover:gap-2 transition-all">
                Start track
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
