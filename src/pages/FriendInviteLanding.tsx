import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Mic, Users, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";

type State = "loading" | "invalid" | "ready" | "claiming" | "done" | "error";

export default function FriendInviteLanding() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [state, setState] = useState<State>("loading");
  const [inviterName, setInviterName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await (supabase as any).rpc("peek_friend_invite", { p_token: token });
        if (!cancelled) {
          if (error || !data || data.length === 0) {
            setState("invalid");
          } else {
            setInviterName(data[0]?.inviter_display_name ?? "Someone");
            setState("ready");
          }
        }
      } catch {
        if (!cancelled) setState("invalid");
      }
    })();

    return () => { cancelled = true; };
  }, [token]);

  const handleClaim = async () => {
    if (!token || !user) return;
    setState("claiming");
    try {
      const { data, error } = await (supabase as any).rpc("claim_friend_invite", { p_token: token });
      if (error) {
        if (error.message?.includes("cannot_friend_yourself")) {
          setErrorMsg("You can't accept your own invite.");
        } else {
          setErrorMsg("This invite is invalid or has already been used.");
        }
        setState("error");
        return;
      }
      const name = data || inviterName || "your friend";
      toast({ title: `You're now friends with ${name}! 🎉` });
      setState("done");
      setTimeout(() => navigate("/friends"), 2000);
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setState("error");
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] opacity-50 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-primary/3 rounded-full blur-[100px] opacity-30 pointer-events-none" />

      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 mb-12">
        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shadow-glow">
          <Mic className="h-4 w-4 text-white" />
        </div>
        <span className="speak-serif text-2xl font-bold tracking-tighter">
          Speak<span className="text-primary italic">Bold</span>
        </span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm glass-card p-8 text-center space-y-6"
      >
        {state === "loading" && (
          <div className="space-y-4">
            <div className="h-16 w-16 rounded-full bg-muted/20 animate-pulse mx-auto" />
            <div className="h-4 w-32 bg-muted/20 animate-pulse mx-auto rounded" />
          </div>
        )}

        {state === "invalid" && (
          <div className="space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive opacity-60" />
            <h2 className="speak-serif text-2xl">Invite expired</h2>
            <p className="text-sm text-muted-foreground opacity-60">
              This invite link is invalid or has already been used.
            </p>
            <Link
              to="/"
              className="block w-full py-3 rounded-2xl bg-muted/20 text-xs font-black uppercase tracking-widest hover:bg-muted/40 transition-colors"
            >
              Go home
            </Link>
          </div>
        )}

        {(state === "ready" || state === "claiming") && (
          <div className="space-y-6">
            <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mx-auto text-3xl font-bold text-primary">
              {inviterName?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">
                Friend Invite
              </p>
              <h2 className="speak-serif text-2xl leading-tight">
                <span className="text-primary">{inviterName}</span> wants you to join SpeakBold
              </h2>
            </div>

            {user ? (
              <button
                onClick={handleClaim}
                disabled={state === "claiming"}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {state === "claiming" ? (
                  <span className="animate-pulse">Accepting…</span>
                ) : (
                  <>
                    <Users className="h-4 w-4" /> Accept & become friends
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground opacity-60">
                  Sign up to become friends automatically.
                </p>
                <Link
                  to={`/login?next=/friends/invite/${token}&signup=1`}
                  state={{ mode: "signup" }}
                  className="flex items-center justify-center gap-3 w-full py-3.5 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Sign up free <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to={`/login?next=/friends/invite/${token}`}
                  className="block text-center text-xs text-muted-foreground hover:text-foreground transition-colors opacity-60 hover:opacity-100"
                >
                  Already have an account? Sign in
                </Link>
              </div>
            )}
          </div>
        )}

        {state === "done" && (
          <div className="space-y-4">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
            <h2 className="speak-serif text-2xl">Friends! 🎉</h2>
            <p className="text-sm text-muted-foreground opacity-60">
              You're now friends with {inviterName}. Redirecting…
            </p>
          </div>
        )}

        {state === "error" && (
          <div className="space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive opacity-60" />
            <h2 className="speak-serif text-2xl">Couldn't accept</h2>
            <p className="text-sm text-muted-foreground opacity-60">{errorMsg}</p>
            <button
              onClick={() => navigate("/friends")}
              className="w-full py-3 rounded-2xl bg-muted/20 text-xs font-black uppercase tracking-widest hover:bg-muted/40 transition-colors"
            >
              Go to Friends
            </button>
          </div>
        )}
      </motion.div>
    </main>
  );
}
