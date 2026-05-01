import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";

interface TrackShellProps {
  eyebrow: string;
  title: ReactNode;
  intro: string;
  children: ReactNode;
}

export const TrackShell = ({ eyebrow, title, intro, children }: TrackShellProps) => {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="container pt-12 md:pt-20 pb-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
        >
          <ArrowLeft className="h-4 w-4" />
          All tracks
        </Link>
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 text-primary text-xs font-semibold tracking-[0.25em] uppercase mb-6">
            <span className="h-px w-10 bg-primary" />
            {eyebrow}
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-semibold leading-[1.02] tracking-tight text-balance mb-6">
            {title}
          </h1>
          <p className="text-lg text-muted-foreground text-pretty leading-relaxed">{intro}</p>
        </div>
      </section>
      <div className="container pb-32">{children}</div>
    </main>
  );
};
