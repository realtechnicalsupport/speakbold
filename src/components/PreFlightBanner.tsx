import { Link } from "react-router-dom";
import { Clipboard, ArrowRight } from "lucide-react";

export const PreFlightBanner = () => {
  return (
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
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
    </Link>
  );
};
