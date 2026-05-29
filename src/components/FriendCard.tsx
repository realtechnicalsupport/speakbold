import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Zap, MoreHorizontal, User, Swords, UserMinus } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Friend } from "@/hooks/useFriends";
import { getRankEmblem, getRankColor } from "@/hooks/arenaUtils";
import { useFriends } from "@/hooks/useFriends";

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never active";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "Active just now";
  if (diff < 3600) return `Active ${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `Active ${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `Active ${Math.floor(diff / 86400)}d ago`;
  return `Active ${Math.floor(diff / 604800)}w ago`;
}

interface FriendCardProps {
  friend: Friend;
}

export const FriendCard = ({ friend }: FriendCardProps) => {
  const navigate = useNavigate();
  const { removeFriend } = useFriends();
  const [menuOpen, setMenuOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    setRemoving(true);
    await removeFriend(friend.id);
    setRemoving(false);
    setMenuOpen(false);
  };

  const rankColor = getRankColor(friend.rank);
  const rankEmblem = getRankEmblem(friend.rank.name);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 flex items-center gap-4 relative"
    >
      {/* Avatar */}
      <div className="h-11 w-11 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary font-bold text-lg">
        {friend.display_name[0]?.toUpperCase() ?? "?"}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm leading-tight truncate">{friend.display_name}</p>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Flame className="h-3 w-3 text-orange-400" />
            <span className="font-semibold">{friend.streak}</span>
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Zap className="h-3 w-3 text-yellow-400" />
            <span className="font-semibold">{friend.xp.toLocaleString()}</span>
          </span>
          <span className={cn("text-xs font-bold", rankColor.split(" ")[0])}>
            {rankEmblem} {friend.rank.name} {friend.rank.tier}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5 opacity-60">
          {formatRelativeTime(friend.lastActiveAt)} · {friend.elo} ELO
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => navigate(`/friends/${friend.id}`)}
          className="p-2 rounded-xl hover:bg-muted/20 transition-colors opacity-60 hover:opacity-100"
          aria-label="View profile"
        >
          <User className="h-4 w-4" />
        </button>
        <button
          onClick={() => navigate(`/arena?challenge=${friend.id}&mode=standard`)}
          className="p-2 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors opacity-60 hover:opacity-100"
          aria-label="Challenge"
        >
          <Swords className="h-4 w-4" />
        </button>

        {/* Overflow menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-2 rounded-xl hover:bg-muted/20 transition-colors opacity-40 hover:opacity-100"
            aria-label="More options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 glass border border-border/60 rounded-xl shadow-soft z-50 overflow-hidden">
              <button
                onClick={() => { navigate(`/friends/${friend.id}`); setMenuOpen(false); }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-muted/20 transition-colors"
              >
                <User className="h-3.5 w-3.5" /> View profile
              </button>
              <button
                onClick={() => { navigate(`/arena?challenge=${friend.id}&mode=standard`); setMenuOpen(false); }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-muted/20 transition-colors"
              >
                <Swords className="h-3.5 w-3.5" /> Challenge
              </button>
              <div className="h-px bg-border/40 mx-2" />
              <button
                onClick={handleRemove}
                disabled={removing}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <UserMinus className="h-3.5 w-3.5" />
                {removing ? "Removing…" : "Remove friend"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Close menu on outside click */}
      {menuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
      )}
    </motion.div>
  );
};
