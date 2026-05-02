import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mic, Play, Menu, X, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

const NAV_LINKS = [
  { to: "/tracks/public-speaking", label: "Public Speaking" },
  { to: "/tracks/impromptu", label: "Impromptu" },
  { to: "/tracks/interviews", label: "Interviews" },
  { to: "/tracks/body-language", label: "Body Language" },
];

const STATS = [
  { value: "5 min", label: "daily practice" },
  { value: "24", label: "prompts" },
  { value: "Free", label: "forever" },
];

export const Hero = () => {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <section className="relative min-h-[100svh] flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid place-items-center h-9 w-9 rounded-xl bg-primary text-primary-foreground">
              <Mic className="h-4 w-4" />
            </span>
            <span className="font-semibold text-lg">
              Speak<span className="text-accent">Bold</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Button variant="outline" size="sm" asChild>
                <Link to="/profile" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{user.email?.split("@")[0]}</span>
                </Link>
              </Button>
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
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-3 px-4 -mx-4 text-foreground hover:bg-secondary rounded-lg transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              {!user && (
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

      {/* Hero content */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="container py-12 sm:py-16 lg:py-20">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-medium mb-6">
              <Play className="h-3 w-3" />
              Free to use, no sign-up required
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] tracking-tight text-balance mb-6">
              Speak with confidence.
              <br />
              <span className="text-muted-foreground">Every time.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-muted-foreground max-w-xl text-pretty mb-8 leading-relaxed">
              Practice public speaking, impromptu responses, and interview answers with real prompts and instant recording.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 mb-12">
              <Button variant="hero" size="xl" asChild className="w-full sm:w-auto">
                <Link to={user ? "/tracks/impromptu" : "/login"}>
                  Start practicing
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="xl" asChild className="w-full sm:w-auto">
                <a href="#tracks">Explore tracks</a>
              </Button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-6 sm:gap-10">
              {STATS.map((stat, i) => (
                <div key={i} className="flex flex-col">
                  <span className="text-2xl sm:text-3xl font-bold">{stat.value}</span>
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Decorative gradient */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-spotlight opacity-50 pointer-events-none" />
    </section>
  );
};
