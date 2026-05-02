import { NavLink, useLocation } from "react-router-dom";
import { Mic, MessageSquare, Briefcase, Activity, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/tracks/public-speaking", icon: Mic, label: "Speaking" },
  { to: "/tracks/impromptu", icon: MessageSquare, label: "Impromptu" },
  { to: "/tracks/interviews", icon: Briefcase, label: "Interviews" },
  { to: "/tracks/body-language", icon: Activity, label: "Body" },
];

export const MobileNav = () => {
  const { pathname } = useLocation();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-background border-t border-border safe-area-bottom">
      <div className="flex items-stretch h-16 px-1">
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
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors touch-target",
                isActive 
                  ? "text-accent" 
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              <div className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                isActive && "bg-accent/10"
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
