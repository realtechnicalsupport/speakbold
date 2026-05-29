import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Mic, Eye, EyeOff, ArrowRight, Mail, Lock, ShieldCheck, Zap, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

type AuthMode = "login" | "signup" | "forgot";

const Login = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();

  // Post-login destination: prefer the page the user tried to reach (via
  // RequireAuth location state), then a ?next= query param (invite flow),
  // then fall back to /pathway.
  const nextParam = new URLSearchParams(location.search).get("next");
  const redirectTo =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ||
    nextParam ||
    "/pathway";

  useEffect(() => {
    if (session) navigate(redirectTo, { replace: true });
  }, [session, navigate, redirectTo]);

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
        navigate(redirectTo);
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
        },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (error: any) {
      toast({ title: "Google sign-in failed", description: error?.message || "Unexpected error occurred" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col lg:flex-row relative overflow-hidden bg-waves">
      {/* Passive Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-float opacity-50 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-primary/3 rounded-full blur-[100px] animate-float opacity-30 pointer-events-none" style={{ animationDelay: '-5s' }} />

      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-5/12 relative flex-col justify-between p-20 border-r border-border/60">
        <Link to="/" className="flex items-center gap-3 group">
          <span className="speak-serif text-2xl text-foreground">SPEAK</span>
          <span className="bold-sans text-2xl">Bold</span>
        </Link>

        <div className="space-y-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="text-xs font-bold uppercase tracking-[0.4em] mb-8 opacity-40">
              ESTABLISH PRESENCE
            </div>
            <h1 className="speak-serif text-5xl md:text-7xl leading-[0.95] text-foreground tracking-tighter mb-8">
              Build your <br />
              <span className="text-primary italic">voice</span>.
            </h1>
            <p className="text-lg font-medium tracking-tight opacity-40 max-w-sm leading-relaxed">
              Track your streak. Save your recordings. Secure your position in the global hierarchy.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-8 pt-12 border-t border-border/60">
            <div className="space-y-1">
              <p className="text-4xl font-sans-bold tracking-tighter text-foreground italic">5<span className="text-sm not-italic opacity-40 ml-1 uppercase">min</span></p>
              <p className="text-xs font-black uppercase tracking-widest opacity-40">DAILY DRILLS</p>
            </div>
            <div className="space-y-1">
              <p className="text-4xl font-sans-bold tracking-tighter text-foreground italic">24<span className="text-sm not-italic opacity-40 ml-1 uppercase">+</span></p>
              <p className="text-xs font-black uppercase tracking-widest opacity-40">CORE PROMPTS</p>
            </div>
          </div>
        </div>

        <div className="text-xs font-bold uppercase tracking-[0.5em] opacity-20">
          OPERATIONAL SECURITY v2.4
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-20 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-12"
        >
          {/* Header */}
          <div className="space-y-6">
            <div className="flex items-center gap-4 text-primary text-xs font-bold tracking-[0.4em] uppercase">
              <span className="h-px w-8 bg-primary" />
              {mode === "login" ? "IDENTITY VERIFICATION" : mode === "signup" ? "INITIALIZE ACCOUNT" : "RESET PROTOCOL"}
            </div>
            <h2 className="speak-serif text-4xl md:text-5xl leading-tight">
              {mode === "login"
                ? "Sign in to your account"
                : mode === "signup"
                ? "Join the hierarchy"
                : "Recover your profile"}
            </h2>
          </div>

          {/* Form container */}
          <div className="bg-muted/5 border border-border/60 rounded-[3rem] p-10 shadow-soft relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-8 opacity-5">
                <ShieldCheck className="h-24 w-24" />
             </div>
             
            <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
              <AnimatePresence mode="wait">
                {mode === "signup" && (
                  <motion.div 
                    key="signup-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest opacity-40">Username</Label>
                    <Input
                      id="name"
                      type="text"
                      autoComplete="name"
                      required
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-background/50 border-border/60 h-14 rounded-2xl px-6 font-medium focus:border-primary/50 transition-colors"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-3">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest opacity-40">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-background/50 border-border/60 h-14 rounded-2xl pl-12 pr-6 font-medium focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>

              {mode !== "forgot" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest opacity-40">Password</Label>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-xs font-black uppercase tracking-widest text-primary hover:opacity-70 transition-opacity"
                      >
                        RECOVER?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40 pointer-events-none" />
                    <Input
                      id="password"
                      type={showPass ? "text" : "password"}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      required
                      minLength={8}
                      placeholder="Minimum 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-background/50 border-border/60 h-14 rounded-2xl pl-12 pr-14 font-medium focus:border-primary/50 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 opacity-20 hover:opacity-100 transition-opacity"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="button-pill w-full py-5 bg-primary text-white flex items-center justify-center gap-4 group shadow-glow"
              >
                {loading ? (
                  <span className="text-xs font-black uppercase tracking-[0.3em] animate-pulse">PROCESSING...</span>
                ) : (
                  <>
                    <span className="text-sm font-black uppercase tracking-[0.2em]">
                      {mode === "login" ? "SIGN IN" : mode === "signup" ? "INITIALIZE" : "SEND LINK"}
                    </span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <div className="relative flex items-center gap-4 py-2">
                <span className="flex-1 h-px bg-border/60" />
                <span className="text-xs font-bold uppercase tracking-widest opacity-20">OR</span>
                <span className="flex-1 h-px bg-border/60" />
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                className="w-full h-14 rounded-2xl border border-border/60 flex items-center justify-center gap-4 hover:bg-muted/10 transition-all font-medium opacity-60 hover:opacity-100"
              >
                <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true">
                  <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>
            </form>
          </div>

          {/* Switch mode */}
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm font-medium tracking-tight">
              {mode === "login" ? (
                <>
                  <span className="opacity-40">Don't have an account?</span>{" "}
                  <button onClick={() => setMode("signup")} className="text-primary font-bold hover:underline">Sign up free</button>
                </>
              ) : mode === "signup" ? (
                <>
                  <span className="opacity-40">Already have an account?</span>{" "}
                  <button onClick={() => setMode("login")} className="text-primary font-bold hover:underline">Sign in</button>
                </>
              ) : (
                <button onClick={() => setMode("login")} className="flex items-center gap-2 text-primary font-bold hover:underline">
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </button>
              )}
            </p>
            <Link to="/tracks/impromptu" className="text-xs font-bold uppercase tracking-widest opacity-20 hover:opacity-100 transition-opacity flex items-center gap-2">
              ANONYMOUS PRACTICE <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </motion.div>
      </div>
    </main>
  );
};

export default Login;
