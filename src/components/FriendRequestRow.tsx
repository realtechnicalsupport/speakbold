import { useState } from "react";
import { Check, X } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Friend } from "@/hooks/useFriends";
import { getRankEmblem, getRankColor } from "@/hooks/arenaUtils";
import { useFriends } from "@/hooks/useFriends";

interface FriendRequestRowProps {
  friend: Friend;
}

export const FriendRequestRow = ({ friend }: FriendRequestRowProps) => {
  const { acceptRequest, declineRequest } = useFriends();
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    await acceptRequest(friend.id);
    setAccepting(false);
  };

  const handleDecline = async () => {
    setDeclining(true);
    await declineRequest(friend.id);
    setDeclining(false);
  };

  const rankEmblem = getRankEmblem(friend.rank.name);
  const rankColor = getRankColor(friend.rank);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      className="glass-card p-4 flex items-center gap-4"
    >
      <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary font-bold">
        {friend.display_name[0]?.toUpperCase() ?? "?"}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm truncate">{friend.display_name}</p>
        <p className={cn("text-xs font-semibold mt-0.5", rankColor.split(" ")[0])}>
          {rankEmblem} {friend.rank.name} {friend.rank.tier} · {friend.elo} ELO
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleAccept}
          disabled={accepting || declining}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/30 rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
        >
          {accepting ? (
            <span className="animate-pulse">…</span>
          ) : (
            <>
              <Check className="h-3 w-3" /> Accept
            </>
          )}
        </button>
        <button
          onClick={handleDecline}
          disabled={accepting || declining}
          className="p-2 rounded-lg hover:bg-muted/20 transition-colors opacity-40 hover:opacity-100 disabled:opacity-20"
          aria-label="Decline"
        >
          {declining ? <span className="text-xs animate-pulse">…</span> : <X className="h-3.5 w-3.5" />}
        </button>
      </div>
    </motion.div>
  );
};
