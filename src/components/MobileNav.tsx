import { NavLink, useLocation } from "react-router-dom";
import { Home, User, Map, FlaskConical, Swords } from "lucide-react";
import { cn } from "@/lib/utils";

import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/pathway", icon: Map, label: "Path" },
  { to: "/lab", icon: FlaskConical, label: "Lab" },
  { to: "/arena", icon: Swords, label: "Arena" },
  { to: "/profile", icon: User, label: "Profile" },
];

export const MobileNav = () => {
  const { pathname } = useLocation();

  return (
    <nav
      className="lg:hidden fixed z-50"
      style={{
        bottom: "max(1.5rem, env(safe-area-inset-bottom))",
        left: "1rem",
        right: "1rem",
        willChange: "auto",
        transform: "translateZ(0)",
      }}
    >
      <div
        style={{
          background: "hsl(var(--background) / 0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid hsl(var(--border) / 0.6)",
          borderRadius: "9999px",
          height: "4rem",
          padding: "0 1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.to === "/"
            ? pathname === "/"
            : pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              id={item.to === "/arena" ? "nav-arena" : item.to === "/profile" ? "nav-profile" : undefined}
              aria-label={item.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "2.5rem",
                height: "2.5rem",
                borderRadius: "9999px",
                transition: "color 0.3s, background 0.3s, border-color 0.3s",
                color: isActive ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.25)",
                background: isActive ? "hsl(var(--primary) / 0.1)" : "transparent",
                border: isActive ? "1px solid hsl(var(--primary) / 0.25)" : "1px solid transparent",
                flexShrink: 0,
              }}
            >
              <Icon
                style={{
                  width: "1.25rem",
                  height: "1.25rem",
                  transition: "transform 0.3s",
                  transform: isActive ? "scale(1.1)" : "scale(1)",
                  flexShrink: 0,
                }}
              />
            </NavLink>
          );
        })}
        <div className="w-px h-6 bg-border/40 mx-1 shrink-0" />
        <ThemeToggle />
      </div>
    </nav>
  );
};
