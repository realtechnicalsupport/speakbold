import { Link } from "react-router-dom";
import { Clipboard, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const MotionLink = motion(Link);

export const PreFlightBanner = () => {
  return (
    <MotionLink
      to="/pre-flight"
      whileHover={{ y: -2 }}
      className="group flex items-center gap-6 bg-muted/5 border border-border/50 rounded-[2rem] p-6 hover:border-primary/40 transition-all duration-500"
    >
      <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary shrink-0 transition-colors group-hover:bg-primary group-hover:text-white">
        <Clipboard className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-1">PROTOCOL PREP</p>
        <p className="text-lg font-medium tracking-tight text-foreground">Pre-Flight Checklist</p>
        <p className="text-xs font-medium opacity-40">Essential protocols for immediate presence.</p>
      </div>
      <div className="h-10 w-10 rounded-full border border-border/50 flex items-center justify-center group-hover:border-primary group-hover:bg-primary group-hover:text-white transition-all duration-500">
        <ArrowRight className="h-4 w-4" strokeWidth={2} />
      </div>
    </MotionLink>
  );
};
