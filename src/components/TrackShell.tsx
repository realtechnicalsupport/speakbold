import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Clipboard, ChevronRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";

interface TrackShellProps {
  eyebrow: string;
  title: ReactNode;
  intro: string;
  children: ReactNode;
}

export const TrackShell = ({ eyebrow, title, intro, children }: TrackShellProps) => {
  return (
    <main className="min-h-screen bg-background pb-20 lg:pb-0">
      <SiteHeader />
      
      {/* Header section */}
      <section className="bg-secondary/30 border-b border-border">
        <div className="container py-8 sm:py-12">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          
          <div className="max-w-2xl">
            <span className="inline-block px-3 py-1 text-xs font-medium text-accent bg-accent/10 rounded-full mb-4">
              {eyebrow}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-balance mb-4">
              {title}
            </h1>
            <p className="text-lg text-muted-foreground text-pretty leading-relaxed">
              {intro}
            </p>
          </div>
        </div>
      </section>
      
      {/* Main content */}
      <div className="container py-8 sm:py-12">{children}</div>
      
      {/* Pre-Flight Checklist Link */}
      <div className="container pb-12">
        <Link
          to="/pre-flight"
          className="group flex items-center gap-4 bg-card border border-border rounded-xl p-4 sm:p-5 hover:border-foreground/20 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-accent/10 text-accent shrink-0">
            <Clipboard className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">Pre-Flight Checklist</p>
            <p className="text-sm text-muted-foreground">5-minute prep before any talk</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors shrink-0" />
        </Link>
      </div>
    </main>
  );
};
