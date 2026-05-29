import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { useFriends } from "@/hooks/useFriends";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";

export const FriendsBadge = () => {
  const { incomingRequests } = useFriends();
  const { pathname } = useLocation();
  const count = incomingRequests.length;

  return (
    <Link
      to="/friends"
      className={cn(
        "relative transition-all duration-500",
        pathname.startsWith("/friends") ? "text-primary" : "opacity-30 hover:opacity-100"
      )}
      aria-label={count > 0 ? `Friends — ${count} pending request${count !== 1 ? "s" : ""}` : "Friends"}
    >
      <Users className="h-5 w-5" strokeWidth={2} />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center shadow-glow">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
};
