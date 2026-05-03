import { NavLink, useLocation } from "react-router-dom";
import { Mic, MessageSquare, Briefcase, Activity, Home, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/tracks/public-speaking", icon: Mic, label: "Speaking" },
  { to: "/tracks/impromptu", icon: MessageSquare, label: "Impromptu" },
  { to: "/tracks/interviews", icon: Briefcase, label: "Interviews" },
  { to: "/tracks/body-language", icon: Activity, label: "Body" },
  { to: "/events", icon: Calendar, label: "Events" },
];

export const MobileNav = () => {
  const { pathname } = useLocation();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-border safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.to === "/" 
            ? pathname === "/" 
            : pathname.startsWith(item.to);
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[56px]",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
