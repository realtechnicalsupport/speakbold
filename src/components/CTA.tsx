import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mic } from "lucide-react";
import { useInView } from "@/hooks/useInView";

export const CTA = () => {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <section className="border-t border-border" ref={ref}>
      <div className="container py-24 md:py-40 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-spotlight opacity-50 pointer-events-none" />
        <div className={`relative max-w-3xl mx-auto ${isInView ? "animate-scale-in" : "opacity-0"}`}>
          <h2 className="font-display text-5xl md:text-7xl font-semibold leading-[1] text-balance mb-8">
            Your next room is waiting. <em className="text-primary not-italic">Be ready.</em>
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto text-pretty">
            Pick a track and start now. Sixty seconds is enough. Free, no account, audio stays on your device.
          </p>
          <Button variant="hero" size="xl" asChild>
            <Link to="/tracks/impromptu">
              Start with today's prompt
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>

      <footer className="container border-t border-border py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="grid place-items-center h-8 w-8 rounded-full bg-warm text-primary-foreground">
            <Mic className="h-3.5 w-3.5" />
          </span>
          <span className="font-display text-lg font-semibold leading-none">Speak<em className="not-italic text-primary">Bold</em></span>
        </Link>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} SpeakBold. Practice out loud.
        </p>
      </footer>
    </section>
  );
};
