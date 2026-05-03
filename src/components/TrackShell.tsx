import { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Clipboard } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";

interface TrackShellProps {
  eyebrow: string;
  title: ReactNode;
  intro: string;
  children: ReactNode;
  hideHeader?: boolean;
}

export const TrackShell = ({ eyebrow, title, intro, children, hideHeader = false }: TrackShellProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className="min-h-screen bg-background">
      {!hideHeader && <SiteHeader />}
      {hideHeader && (
        <div className="h-1" aria-hidden />
      )}
      <section className={`container pb-10 ${hideHeader ? "pt-20 md:pt-24" : "pt-12 md:pt-20"}`}>
        <Link
          to="/"
          className={`inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10 ${mounted ? "animate-fade-right" : "opacity-0"}`}
        >
          <ArrowLeft className="h-4 w-4" />
          All tracks
        </Link>
        <div className={`max-w-3xl ${mounted ? "animate-fade-up" : "opacity-0"}`} style={{ animationDelay: "100ms" }}>
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
      <div className={`container pb-32 ${mounted ? "animate-fade-in" : "opacity-0"}`} style={{ animationDelay: "250ms" }}>{children}</div>
      
      <div className={`container pb-12 ${mounted ? "animate-fade-up" : "opacity-0"}`} style={{ animationDelay: "400ms" }}>
        <Link
          to="/pre-flight"
          className="group flex items-center gap-4 bg-card-gradient border border-border rounded-2xl p-5 hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary shrink-0">
            <Clipboard className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">Pre-Flight Checklist</p>
            <p className="text-sm text-muted-foreground">5-minute prep before any big talk or interview</p>
          </div>
        </Link>
      </div>
    </main>
  );
};
