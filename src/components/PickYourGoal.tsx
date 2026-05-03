import { Link } from "react-router-dom";
import { Briefcase, Sparkles, MessageSquareOff, Users, ArrowUpRight } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const GOALS = [
  {
    icon: Briefcase,
    title: "Nail my interview next week",
    desc: "STAR stories, salary talk, and an answer to 'tell me about yourself' that doesn't ramble.",
    href: "/tracks/interviews",
    cta: "Interview track",
  },
  {
    icon: Sparkles,
    title: "Speak at a wedding or event",
    desc: "A warm hook, a story with a turning point, and a toast that lands without notes.",
    href: "/tracks/public-speaking",
    cta: "Public speaking",
  },
  {
    icon: MessageSquareOff,
    title: "Stop saying 'um' and freezing up",
    desc: "Pause drills, filler-word awareness, and the breath pattern that steadies a shaky voice.",
    href: "/tracks/body-language",
    cta: "Body & breath",
  },
  {
    icon: Users,
    title: "Think fast in meetings",
    desc: "Frameworks like PREP and What-So What-Now What so you're never caught flat-footed.",
    href: "/tracks/impromptu",
    cta: "Impromptu drills",
  },
];

export const PickYourGoal = () => {
  const { ref, isInView } = useInView({ threshold: 0.05 });

  return (
    <section className="container py-24 md:py-32 border-t border-border" ref={ref}>
      <div className={`flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14 ${isInView ? "animate-fade-up" : "opacity-0"}`}>
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 text-primary text-xs font-semibold tracking-[0.2em] uppercase mb-6">
            <span className="h-px w-10 bg-primary" />
            Start from a real moment
          </div>
          <h2 className="font-display text-4xl md:text-6xl font-semibold leading-[1.05] text-balance">
            What do you need to <em className="text-primary not-italic">say out loud</em> this week?
          </h2>
        </div>
        <p className="text-muted-foreground max-w-sm text-pretty">
          Pick the moment you're preparing for. We'll drop you straight into the drills that matter —
          no detour, no sign-up.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {GOALS.map((g, i) => (
          <Link
            key={g.title}
            to={g.href}
            className={`group relative bg-card-gradient border border-border rounded-2xl p-7 md:p-8 hover:border-primary/40 transition-all duration-500 flex items-start gap-5 ${isInView ? "animate-fade-up" : "opacity-0"}`}
            style={{ animationDelay: `${i * 100 + 100}ms` }}
          >
            <div className="grid place-items-center h-12 w-12 rounded-xl bg-muted border border-border group-hover:bg-warm group-hover:border-transparent transition-all duration-500 shrink-0">
              <g.icon className="h-5 w-5 text-foreground group-hover:text-primary-foreground transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-xl md:text-2xl font-semibold mb-2 leading-tight">
                {g.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4 text-pretty">
                {g.desc}
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                {g.cta} <ArrowUpRight className="h-4 w-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
