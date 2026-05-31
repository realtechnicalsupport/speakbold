import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getRankFromElo } from "@/hooks/arenaUtils";
import { friendsEmitter } from "@/lib/events";

export type FriendStatus = "accepted" | "pending-incoming" | "pending-outgoing";

export interface Friend {
  id: string;
  display_name: string;
  xp: number;
  elo: number;
  rank: ReturnType<typeof getRankFromElo>;
  streak: number;
  bestStreak: number;
  lastActiveAt: string | null;
  status: FriendStatus;
  acceptedAt: string | null;
}

interface FriendsContextValue {
  friends: Friend[];
  incomingRequests: Friend[];
  outgoingRequests: Friend[];
  loading: boolean;
  sendRequest: (targetUserId: string) => Promise<void>;
  acceptRequest: (requesterId: string) => Promise<void>;
  declineRequest: (requesterId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const FriendsContext = createContext<FriendsContextValue | null>(null);

export const useFriendsContext = (): FriendsContextValue => {
  const ctx = useContext(FriendsContext);
  if (!ctx) throw new Error("useFriendsContext must be used within FriendsProvider");
  return ctx;
};

const canonicalPair = (a: string, b: string): [string, string] =>
  a < b ? [a, b] : [b, a];

export const FriendsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<Friend[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const prevIncomingIds = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!user) {
      setFriends([]);
      setIncomingRequests([]);
      setOutgoingRequests([]);
      return;
    }
    setLoading(true);
    try {
      const { data: rawRows } = await (supabase as any)
        .from("friendships")
        .select("user_a, user_b, status, requested_by, accepted_at")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

      const rows: any[] = rawRows ?? [];

      if (rows.length === 0) {
        setFriends([]);
        setIncomingRequests([]);
        setOutgoingRequests([]);
        prevIncomingIds.current = new Set();
        return;
      }

      const otherIds = rows.map((r) =>
        r.user_a === user.id ? r.user_b : r.user_a
      );

      const [profilesRes, streaksRes, xpRes] = await Promise.all([
        (supabase as any)
          .from("profiles")
          .select("id, display_name, xp, elo, last_active_at")
          .in("id", otherIds),
        (supabase as any)
          .from("streaks")
          .select("user_id, count, best_count")
          .in("user_id", otherIds),
        (supabase as any)
          .from("user_xp")
          .select("user_id, total_xp")
          .in("user_id", otherIds),
      ]);

      const profileMap: Record<string, any> = {};
      for (const p of profilesRes.data ?? []) profileMap[p.id] = p;

      const streakMap: Record<string, number> = {};
      const bestStreakMap: Record<string, number> = {};
      for (const s of streaksRes.data ?? []) {
        streakMap[s.user_id] = s.count ?? 0;
        bestStreakMap[s.user_id] = Math.max(s.best_count ?? 0, s.count ?? 0);
      }

      const xpMap: Record<string, number> = {};
      for (const x of xpRes.data ?? []) xpMap[x.user_id] = x.total_xp ?? 0;

      const allFriends: Friend[] = [];
      const incoming: Friend[] = [];
      const outgoing: Friend[] = [];

      for (const row of rows) {
        if (row.status === "blocked") continue;
        const otherId = row.user_a === user.id ? row.user_b : row.user_a;
        // A friend may not have a profile row (creation trigger can miss, esp.
        // OAuth signups). Don't drop them — fall back to placeholders so the
        // friendship still shows, mirroring the leaderboard's behaviour.
        const profile = profileMap[otherId] ?? {};

        const elo = profile.elo ?? 1000;
        const xp = xpMap[otherId] ?? profile.xp ?? 0;

        let status: FriendStatus;
        if (row.status === "accepted") {
          status = "accepted";
        } else if (row.status === "pending") {
          status = row.requested_by === user.id ? "pending-outgoing" : "pending-incoming";
        } else {
          continue;
        }

        const friend: Friend = {
          id: otherId,
          display_name: profile.display_name || `User ${otherId.slice(0, 8)}`,
          xp,
          elo,
          rank: getRankFromElo(elo),
          streak: streakMap[otherId] ?? 0,
          bestStreak: bestStreakMap[otherId] ?? 0,
          lastActiveAt: profile.last_active_at ?? null,
          status,
          acceptedAt: row.accepted_at ?? null,
        };

        if (status === "accepted") allFriends.push(friend);
        else if (status === "pending-incoming") incoming.push(friend);
        else outgoing.push(friend);
      }

      // Detect new incoming requests for notifications
      const newIncomingIds = new Set(incoming.map((f) => f.id));
      for (const f of incoming) {
        if (!prevIncomingIds.current.has(f.id)) {
          friendsEmitter.emit("friends:request-received", {
            from: { id: f.id, display_name: f.display_name },
          });
        }
      }
      prevIncomingIds.current = newIncomingIds;

      setFriends(allFriends);
      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
    } catch (err) {
      console.error("[FriendsContext] refresh error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    if (user) refresh();
    else {
      setFriends([]);
      setIncomingRequests([]);
      setOutgoingRequests([]);
    }
  }, [user, refresh]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`friends_changes:${user.id}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "friendships" },
        (payload: any) => {
          const row = payload.new || payload.old;
          if (!row) return;
          if (row.user_a === user.id || row.user_b === user.id) {
            refresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  const sendRequest = useCallback(
    async (targetUserId: string) => {
      if (!user) return;
      const [ua, ub] = canonicalPair(user.id, targetUserId);
      const { error } = await (supabase as any).from("friendships").insert({
        user_a: ua,
        user_b: ub,
        status: "pending",
        requested_by: user.id,
      });
      if (error) console.error("[FriendsContext] sendRequest error:", error);
      await refresh();
    },
    [user, refresh]
  );

  const acceptRequest = useCallback(
    async (requesterId: string) => {
      if (!user) return;
      const [ua, ub] = canonicalPair(user.id, requesterId);
      await (supabase as any)
        .from("friendships")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("user_a", ua)
        .eq("user_b", ub);
      await refresh();
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", requesterId)
        .maybeSingle();
      friendsEmitter.emit("friends:request-accepted", {
        by: { id: requesterId, display_name: (data as any)?.display_name ?? "Someone" },
      });
    },
    [user, refresh]
  );

  const declineRequest = useCallback(
    async (requesterId: string) => {
      if (!user) return;
      const [ua, ub] = canonicalPair(user.id, requesterId);
      await (supabase as any)
        .from("friendships")
        .delete()
        .eq("user_a", ua)
        .eq("user_b", ub);
      await refresh();
    },
    [user, refresh]
  );

  const removeFriend = useCallback(
    async (friendId: string) => {
      if (!user) return;
      const [ua, ub] = canonicalPair(user.id, friendId);
      await (supabase as any)
        .from("friendships")
        .delete()
        .eq("user_a", ua)
        .eq("user_b", ub);
      await refresh();
    },
    [user, refresh]
  );

  return (
    <FriendsContext.Provider
      value={{
        friends,
        incomingRequests,
        outgoingRequests,
        loading,
        sendRequest,
        acceptRequest,
        declineRequest,
        removeFriend,
        refresh,
      }}
    >
      {children}
    </FriendsContext.Provider>
  );
};
