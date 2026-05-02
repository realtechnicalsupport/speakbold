import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mic, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Password updated", description: "You can now sign in with your new password." });
      navigate("/login");
    } catch (err: any) {
      toast({ title: "Reset failed", description: err?.message ?? "Try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 bg-spotlight opacity-80 pointer-events-none" />
        <div className="absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-accent/10 blur-3xl" />

        <Link to="/" className="relative z-10 flex items-center gap-2 font-display text-xl font-semibold">
          <span className="grid place-items-center h-9 w-9 rounded-full bg-warm text-primary-foreground">
            <Mic className="h-4 w-4" />
          </span>
          <span className="font-display text-xl font-semibold leading-none">Speak<em className="not-italic text-primary">Bold</em></span>
        </Link>

        <div className="relative z-10 max-w-md">
          <blockquote className="font-display text-4xl font-semibold leading-[1.1] text-balance text-foreground mb-6">
            Your voice <em className="text-primary not-italic">matters.</em>
          </blockquote>
          <p className="text-muted-foreground leading-relaxed">
            Reset your password to get back to building your speaking confidence.
          </p>
        </div>

        <div />
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">
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
          <div className="mb-8">
            <div className="flex items-center gap-3 text-primary text-xs font-semibold tracking-[0.25em] uppercase mb-4">
              <span className="h-px w-8 bg-primary" />
              Reset password
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-semibold leading-tight text-balance">
              Enter your <em className="text-primary not-italic">new password.</em>
            </h1>
          </div>

          <div className="bg-card-gradient border border-border rounded-3xl p-8 shadow-soft">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs uppercase tracking-widest text-muted-foreground">
                  New password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl bg-background/50 border-border focus:border-primary/60 text-base pl-10"
                  />
                </div>
              </div>

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
                    Updating...
                  </span>
                ) : (
                  <>
                    Update password
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Remember your password?{" "}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
};

export default ResetPassword;