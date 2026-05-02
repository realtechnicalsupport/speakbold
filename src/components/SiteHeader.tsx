import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Mic, LogOut, User, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

const NAV = [
  { to: "/tracks/public-speaking", label: "Public Speaking" },
  { to: "/tracks/impromptu", label: "Impromptu" },
  { to: "/tracks/interviews", label: "Interviews" },
  { to: "/tracks/body-language", label: "Body Language" },
];

export const SiteHeader = ({ transparent = false }: { transparent?: boolean }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <header
      className={cn(
        "z-50",
        transparent 
          ? "absolute top-0 inset-x-0" 
          : "sticky top-0 bg-background/80 backdrop-blur-lg border-b border-border"
      )}
    >
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid place-items-center h-9 w-9 rounded-xl bg-primary text-primary-foreground">
            <Mic className="h-4 w-4" />
          </span>
          <span className="font-semibold text-lg">
            Speak<span className="text-accent">Bold</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn(
                  "text-sm transition-colors",
                  isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link to="/profile" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {user.email?.split("@")[0] || "Profile"}
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="hidden sm:inline-flex">
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Sign out</span>
              </Button>
            </>
          ) : (
            <Button variant="default" size="sm" asChild className="hidden sm:inline-flex">
              <Link to="/login">Get Started</Link>
            </Button>
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 -mr-2 text-foreground"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-background animate-slide-up">
          <nav className="container py-4 flex flex-col gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "py-3 px-4 -mx-4 rounded-lg transition-colors",
                    isActive 
                      ? "bg-secondary text-foreground font-medium" 
                      : "text-foreground hover:bg-secondary"
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
            {user ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-3 px-4 -mx-4 rounded-lg text-foreground hover:bg-secondary"
                >
                  Profile
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="py-3 px-4 -mx-4 rounded-lg text-left text-foreground hover:bg-secondary"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-2 py-3 px-4 -mx-4 bg-primary text-primary-foreground rounded-lg text-center font-medium"
              >
                Get Started
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};
