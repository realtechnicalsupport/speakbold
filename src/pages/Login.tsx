import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mic, Eye, EyeOff, ArrowRight, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";

type AuthMode = "login" | "signup" | "forgot";

const Login = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const navigate = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    if (session) navigate("/tracks/impromptu", { replace: true });
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: name },
          },
        });
        if (error) throw error;
        toast({ title: "Check your email", description: "Confirm your address to finish signing up." });
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/tracks/impromptu");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: "Reset link sent", description: "Check your inbox." });
      }
    } catch (err: any) {
      toast({ title: "Authentication failed", description: err?.message ?? "Try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) {
        console.error('Supabase Google OAuth error:', error);
        toast({ title: "Google sign-in failed", description: error.message });
        setLoading(false);
        return;
      }
      
      // If data.url exists, redirect to it
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      
      // Otherwise handle normally (shouldn't happen with OAuth)
      navigate("/tracks/impromptu");
    } catch (error: any) {
      console.error('Google OAuth error:', error);
      toast({ title: "Google sign-in failed", description: error?.message || "Unexpected error occurred" });
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12">
        {/* Background glow */}
        <div className="absolute inset-0 bg-spotlight opacity-80 pointer-events-none" />
        <div className="absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-accent/10 blur-3xl" />

        {/* Logo */}
        <Link to="/" className="relative z-10 flex items-center gap-2 font-display text-xl font-semibold">
          <span className="grid place-items-center h-9 w-9 rounded-full bg-warm text-primary-foreground">
            <Mic className="h-4 w-4" />
          </span>
          <span className="font-display text-xl font-semibold leading-none">Speak<em className="not-italic text-primary">Bold</em></span>
        </Link>

        {/* Hero quote */}
        <div className="relative z-10 max-w-md">
          <blockquote className="font-display text-4xl font-semibold leading-[1.1] text-balance text-foreground mb-6">
            "The room{" "}
            <em className="text-primary not-italic">leans in</em>{" "}
            when you speak."
          </blockquote>
          <p className="text-muted-foreground leading-relaxed">
            Track your streak. Save your recordings. Pick up exactly where you left off.
          </p>
        </div>

        {/* Stats row */}
        <div className="relative z-10 flex items-center gap-10">
          {[
            { n: "5 min", label: "daily practice" },
            { n: "24", label: "prompts" },
            { n: "Free", label: "forever" },
          ].map((s) => (
            <div key={s.label}>
              <p className="font-display text-2xl font-semibold text-foreground">{s.n}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">
        {/* Mobile logo */}
        <Link
          to="/"
          className="lg:hidden flex items-center gap-2 font-display text-xl font-semibold mb-12"
        >
          <span className="grid place-items-center h-9 w-9 rounded-full bg-warm text-primary-foreground">
            <Mic className="h-4 w-4" />
          </span>
          <span className="font-display text-xl font-semibold leading-none">Speak<em className="not-italic text-primary">Bold</em></span>
        </Link>

        <div className="w-full max-w-md animate-fade-up">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 text-primary text-xs font-semibold tracking-[0.25em] uppercase mb-4">
              <span className="h-px w-8 bg-primary" />
              {mode === "login" ? "Welcome back" : mode === "signup" ? "Get started" : "Reset password"}
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-semibold leading-tight text-balance">
              {mode === "login"
                ? "Sign in to your account"
                : mode === "signup"
                ? <>Build your <em className="text-primary not-italic">voice.</em></>
                : "Forgot your password?"}
            </h1>
            {mode === "forgot" && (
              <p className="text-muted-foreground mt-3 leading-relaxed">
                Enter your email and we'll send a reset link.
              </p>
            )}
          </div>

          {/* Form card */}
          <div className="bg-card-gradient border border-border rounded-3xl p-8 shadow-soft">
            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs uppercase tracking-widest text-muted-foreground">
                    Full name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    autoComplete="name"
                    required
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 rounded-xl bg-background/50 border-border focus:border-primary/60 text-base"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs uppercase tracking-widest text-muted-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-xl bg-background/50 border-border focus:border-primary/60 text-base pl-10"
                  />
                </div>
              </div>

              {mode !== "forgot" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs uppercase tracking-widest text-muted-foreground">
                      Password
                    </Label>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="password"
                      type={showPass ? "text" : "password"}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      required
                      minLength={8}
                      placeholder={mode === "signup" ? "Min. 8 characters" : "Your password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 rounded-xl bg-background/50 border-border focus:border-primary/60 text-base pl-10 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPass ? "Hide password" : "Show password"}
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {mode === "login" && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-muted-foreground text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-muted-foreground">Remember me</span>
                </label>
              )}

              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full mt-2"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                    {mode === "login" ? "Signing in…" : mode === "signup" ? "Creating account…" : "Sending link…"}
                  </span>
                ) : (
                  <>
                    {mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              {/* Divider */}
              <div className="relative flex items-center gap-3 py-1">
                <span className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <span className="flex-1 h-px bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full gap-3"
                onClick={handleGoogle}
                disabled={loading}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path
                    d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                    fill="#4285F4"
                  />
                  <path
                    d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
                    fill="#34A853"
                  />
                  <path
                    d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </Button>
            </form>
          </div>

          {/* Switch mode */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-primary font-semibold hover:underline"
                >
                  Sign up free
                </button>
              </>
            ) : mode === "signup" ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-primary font-semibold hover:underline"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Remember your password?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-primary font-semibold hover:underline"
                >
                  Back to sign in
                </button>
              </>
            )}
          </p>

          <p className="text-center text-xs text-muted-foreground mt-4">
            No account needed to practice.{" "}
            <Link to="/tracks/impromptu" className="text-primary hover:underline">
              Try it free →
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
};

export default Login;
