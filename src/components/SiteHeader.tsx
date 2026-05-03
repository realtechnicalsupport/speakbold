import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Mic, LogOut, User, Calendar, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { to: "/tracks/public-speaking", label: "Public Speaking" },
  { to: "/tracks/impromptu", label: "Impromptu" },
  { to: "/tracks/interviews", label: "Interviews" },
  { to: "/tracks/body-language", label: "Body Language" },
  { to: "/events", label: "Events" },
];

export const SiteHeader = ({ transparent = false }: { transparent?: boolean }) => {
  const { pathname } = useLocation();
  const onHome = pathname === "/";
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };
  return (
    <header
      className={cn(
        "z-30",
        transparent ? "absolute top-0 inset-x-0" : "sticky top-0 bg-background/85 backdrop-blur-md border-b border-border",
      )}
    >
      <div className="container flex items-center justify-between py-5">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold">
          <span className="flex items-center justify-center h-9 w-9 rounded-full bg-warm text-primary-foreground">
            <Mic className="h-[18px] w-[18px]" />
          </span>
          <span className="hidden lg:block font-display text-xl font-semibold leading-none">
            Speak<em className="not-italic text-primary">Bold</em>
          </span>
        </Link>
        <nav className="hidden lg:flex items-center gap-7 text-sm text-muted-foreground">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn("hover:text-foreground transition-colors", isActive && "text-foreground")
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/leaderboard" className="gap-2">
              <Trophy className="h-4 w-4" />
              <span className="hidden lg:inline">Leaderboard</span>
            </Link>
          </Button>
          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/profile">
                  <User className="h-4 w-4" />
                  <span className="hidden lg:inline">{user.email?.split("@")[0] || "Profile"}</span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
                <span className="hidden lg:inline">Sign out</span>
              </Button>
            </>
          ) : (
            <Button variant={onHome ? "spotlight" : "outline"} size="sm" asChild>
              <Link to="/login">Log in / Sign up</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
