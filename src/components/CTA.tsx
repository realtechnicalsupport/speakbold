import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mic } from "lucide-react";

export const CTA = () => {
  return (
    <section>
      {/* CTA */}
      <div className="py-16 sm:py-24 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-balance max-w-2xl mx-auto">
            Ready to speak with confidence?
          </h2>
          <p className="text-primary-foreground/70 mb-8 max-w-md mx-auto">
            Start with a 60-second drill. No account needed.
          </p>
          <Button 
            variant="spotlight" 
            size="xl" 
            asChild
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <Link to="/tracks/impromptu">
              Start practicing
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="container py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Mic className="h-4 w-4 text-primary-foreground" />
              </span>
              <span className="font-semibold">
                Speak<span className="text-accent">Bold</span>
              </span>
            </Link>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/tracks/public-speaking" className="hover:text-foreground transition-colors">
                Public Speaking
              </Link>
              <Link to="/tracks/impromptu" className="hover:text-foreground transition-colors">
                Impromptu
              </Link>
              <Link to="/tracks/interviews" className="hover:text-foreground transition-colors">
                Interviews
              </Link>
            </div>

            <p className="text-sm text-muted-foreground">
              {new Date().getFullYear()} SpeakBold
            </p>
          </div>
        </div>
      </footer>
    </section>
  );
};
