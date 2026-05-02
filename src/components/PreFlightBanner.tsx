import { Link } from "react-router-dom";
import { Clipboard, ArrowRight } from "lucide-react";

export const PreFlightBanner = () => {
  return (
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
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors shrink-0" />
    </Link>
  );
};
