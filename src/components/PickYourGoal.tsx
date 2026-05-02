import { Link } from "react-router-dom";
import { Briefcase, Sparkles, MessageSquareOff, Users, ChevronRight } from "lucide-react";

const GOALS = [
  {
    icon: Briefcase,
    title: "Nail my interview",
    desc: "STAR stories and confident answers",
    href: "/tracks/interviews",
  },
  {
    icon: Sparkles,
    title: "Give a speech",
    desc: "Wedding toasts and presentations",
    href: "/tracks/public-speaking",
  },
  {
    icon: MessageSquareOff,
    title: "Stop saying 'um'",
    desc: "Pause drills and filler awareness",
    href: "/tracks/body-language",
  },
  {
    icon: Users,
    title: "Think fast in meetings",
    desc: "Impromptu frameworks",
    href: "/tracks/impromptu",
  },
];

export const PickYourGoal = () => {
  return (
    <section className="py-16 sm:py-24 bg-secondary/30">
      <div className="container">
        {/* Section header */}
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="inline-block px-3 py-1 text-xs font-medium text-accent bg-accent/10 rounded-full mb-4">
            Quick Start
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            What are you preparing for?
          </h2>
          <p className="text-muted-foreground">
            Jump straight to the drills that matter most.
          </p>
        </div>

        {/* Goal cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto">
          {GOALS.map((goal) => (
            <Link
              key={goal.title}
              to={goal.href}
              className="group flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-foreground/20 hover:bg-card/80 transition-all"
            >
              <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0 group-hover:bg-accent/10 transition-colors">
                <goal.icon className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{goal.title}</h3>
                <p className="text-xs text-muted-foreground truncate">{goal.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-accent transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
