import { NavLink, useLocation } from "react-router-dom";
import { Mic, MessageSquare, Briefcase, Activity, Home, Calendar, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", icon: Home },
  { to: "/tracks/public-speaking", icon: Mic },
  { to: "/tracks/impromptu", icon: MessageSquare },
  { to: "/tracks/interviews", icon: Briefcase },
  { to: "/tracks/body-language", icon: Activity },
  { to: "/leaderboard", icon: Trophy },
  { to: "/events", icon: Calendar },
];

export const MobileNav = () => {
  const { pathname } = useLocation();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-background/90 backdrop-blur-lg border-t border-border/60 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-1">
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
                "relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground/60 hover:text-muted-foreground"
              )}
            >
              {isActive && (
                <div className="absolute inset-0 bg-primary/10 rounded-2xl" />
              )}
              <Icon className={cn(
                "h-6 w-6 relative z-10 transition-transform duration-200",
                isActive && "scale-110"
              )} />
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};