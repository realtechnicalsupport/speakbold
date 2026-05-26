import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mic, ArrowRight, Lock, ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

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
              SECURITY PROTOCOL
            </div>
            <h1 className="speak-serif text-5xl md:text-7xl leading-[0.95] text-foreground tracking-tighter mb-8">
              Update your <br />
              <span className="text-primary italic">credentials</span>.
            </h1>
            <p className="text-lg font-medium tracking-tight opacity-40 max-w-sm leading-relaxed">
              Reset your passphrase to regain access to your training data and history.
            </p>
          </motion.div>
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
              PASSWORD RECOVERY
            </div>
            <h2 className="speak-serif text-4xl md:text-5xl leading-tight">
              Initialize new password
            </h2>
          </div>

          {/* Form container */}
          <div className="bg-muted/5 border border-border/60 rounded-[3rem] p-10 shadow-soft relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-8 opacity-5">
                <ShieldCheck className="h-24 w-24" />
             </div>
             
            <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
              <div className="space-y-3">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest opacity-40">NEW SECURITY PASSPHRASE</Label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40 pointer-events-none" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-background/50 border-border/60 h-14 rounded-2xl pl-12 pr-6 font-medium focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="button-pill w-full py-5 bg-primary text-white flex items-center justify-center gap-4 group shadow-glow"
              >
                {loading ? (
                  <span className="text-xs font-black uppercase tracking-[0.3em] animate-pulse">UPDATING...</span>
                ) : (
                  <>
                    <span className="text-sm font-black uppercase tracking-[0.2em]">UPDATE PASSWORD</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Switch mode */}
          <div className="flex flex-col items-center gap-4">
            <Link to="/login" className="flex items-center gap-2 text-primary font-bold hover:underline">
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </main>
  );
};

export default ResetPassword;
