import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Flame, Zap, Swords, UserMinus, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { useFriends } from "@/hooks/useFriends";
import { getRankFromElo, getRankColor } from "@/hooks/arenaUtils";
import { RankEmblem } from "@/components/RankEmblem";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface ProfileData {
  id: string;
  display_name: string;
  xp: number;
  elo: number;
  last_active_at: string | null;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
}

export default function FriendProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { friends, sendRequest, removeFriend } = useFriends();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const isFriend = friends.some((f) => f.id === userId);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const [profileRes, streakRes, xpRes] = await Promise.all([
        (supabase as any)
          .from("profiles")
          .select("id, display_name, xp, elo, last_active_at")
          .eq("id", userId)
          .maybeSingle(),
        (supabase as any)
          .from("streaks")
          .select("count")
          .eq("user_id", userId)
          .maybeSingle(),
        (supabase as any)
          .from("user_xp")
          .select("total_xp")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      if (!cancelled && profileRes.data) {
        const xp = xpRes.data?.total_xp ?? profileRes.data.xp ?? 0;
        setProfile({ ...profileRes.data, xp });
        setStreak(streakRes.data?.count ?? 0);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [userId]);

  const handleRemove = async () => {
    if (!userId) return;
    setActionLoading(true);
    await removeFriend(userId);
    toast({ title: "Friend removed" });
    navigate("/friends");
    setActionLoading(false);
  };

  const handleAdd = async () => {
    if (!userId || !profile) return;
    setActionLoading(true);
    await sendRequest(userId);
    toast({ title: "Request sent", description: `Friend request sent to ${profile.display_name}.` });
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container max-w-lg pt-28 pb-32 px-4">
          <div className="space-y-4 animate-pulse">
            <div className="h-8 w-24 bg-muted/20 rounded-lg" />
            <div className="h-40 bg-muted/20 rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container max-w-lg pt-28 pb-32 px-4 text-center">
          <p className="opacity-40 text-sm">Profile not found.</p>
          <button onClick={() => navigate("/friends")} className="mt-4 text-primary text-sm font-bold">
            Back to Friends
          </button>
        </main>
      </div>
    );
  }

  const rank = getRankFromElo(profile.elo);
  const rankColor = getRankColor(rank);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container max-w-lg lg:max-w-3xl pt-28 pb-32 lg:pb-12 px-4">
        {/* Back */}
        <button
          onClick={() => navigate("/friends")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors opacity-60 hover:opacity-100"
        >
          <ArrowLeft className="h-4 w-4" /> Friends
        </button>

        {/* On desktop: profile card + stats side by side */}
        <div className="lg:grid lg:grid-cols-[auto_1fr] lg:gap-8 lg:items-start mb-6">
          {/* Profile card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8 mb-6 lg:mb-0 text-center lg:w-64 shrink-0"
          >
            <div className="h-20 w-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mx-auto mb-4 text-primary text-4xl font-bold">
              {profile.display_name[0]?.toUpperCase() ?? "?"}
            </div>
            <h1 className="speak-serif text-3xl tracking-tight mb-2">{profile.display_name}</h1>
            <div className="flex items-center justify-center gap-2 mt-1">
              <RankEmblem rank={rank} size="sm" />
              <span className={cn("text-sm font-bold", rankColor.split(" ")[0])}>
                {rank.name} {rank.tier}
              </span>
            </div>
            <p className="text-xs text-muted-foreground opacity-40 mt-1">
              Active {formatRelativeTime(profile.last_active_at)}
            </p>
          </motion.div>

          {/* Stats — expand to fill on desktop */}
          <div className="space-y-3">
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
            {[
              { icon: Flame, label: "Streak", value: `${streak}d`, color: "text-orange-400" },
              { icon: Zap, label: "XP", value: profile.xp.toLocaleString(), color: "text-yellow-400" },
              { icon: null, label: "ELO", value: profile.elo, color: "text-primary" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="glass-card p-4 lg:flex lg:items-center lg:gap-4 text-center lg:text-left">
                {Icon && <Icon className={cn("h-5 w-5 mx-auto lg:mx-0 mb-1 lg:mb-0 shrink-0", color)} />}
                {!Icon && <span className={cn("text-lg font-black shrink-0", color)}>~</span>}
                <p className={cn("text-xl font-black lg:flex-1", color)}>{value}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground opacity-40">{label}</p>
              </div>
            ))}
            </div>
          </div>
        </div>{/* end lg:grid */}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/arena?challenge=${userId}&mode=standard`)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Swords className="h-4 w-4" /> Challenge
          </button>
          {isFriend ? (
            <button
              onClick={handleRemove}
              disabled={actionLoading}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-destructive/30 text-destructive text-xs font-black uppercase tracking-widest hover:bg-destructive/10 transition-all disabled:opacity-50"
            >
              <UserMinus className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleAdd}
              disabled={actionLoading}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-primary/30 text-primary text-xs font-black uppercase tracking-widest hover:bg-primary/10 transition-all disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" />
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
