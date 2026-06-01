import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { arenaEmitter } from "@/lib/events";
import { STARTING_ELO, isRankedElo } from "@/hooks/arenaUtils";

export type LeaderboardRow = {
  id: string;
  display_name: string | null;
  elo: number;
};

export type MyStanding = {
  elo: number;
  /** Board position (1-based), or null while unranked. */
  rank: number | null;
  /** False until the account earns its first non-default rating. */
  ranked: boolean;
};

export const useLeaderboard = (limit = 50) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [me, setMe] = useState<MyStanding | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      // Filter out accounts still at the default 1000 ELO. These are either
      // pre-revamp legacy users (back-filled to 1000 by the v2 migration) or
      // accounts that have never finished a battle — neither has earned a
      // spot on the board.
      const { data: eloData, error: eloError } = await supabase
        .from("profiles")
        .select("id, display_name, elo")
        .neq("elo", STARTING_ELO)
        .order("elo", { ascending: false })
        .limit(limit);

      if (eloError) {
        console.error("profiles ELO query failed:", eloError);
        setRows([]);
        setMe(null);
        setLoading(false);
        return;
      }

      const list = (eloData || [])
        .map((entry: any) => ({
          id: entry.id,
          display_name: entry.display_name || `User ${entry.id?.slice(0, 8) || "Unknown"}`,
          elo: entry.elo ?? 0,
        })) as LeaderboardRow[];

      setRows(list);

      if (user) {
        const mine = list.find((r) => r.id === user.id);
        if (mine) {
          // Present in the (already default-filtered) board → genuinely ranked.
          setMe({ elo: mine.elo, rank: list.indexOf(mine) + 1, ranked: true });
        } else {
          const { data: self } = await supabase
            .from("profiles")
            .select("elo")
            .eq("id", user.id)
            .maybeSingle();
          // Keep NULL as NULL — coalescing to 0 would make isRankedElo() read
          // an unranked account as a genuine rating of 0 and fabricate a rank.
          const myElo = self?.elo ?? null;
          if (!isRankedElo(myElo)) {
            // Brand-new account with no earned rating — show "Unranked"
            // rather than fabricating a rank from a rating they never earned.
            setMe({ elo: myElo ?? 0, rank: null, ranked: false });
          } else {
            // Ranked, but outside the top `limit` — count players above me.
            const { count: above } = await supabase
              .from("profiles")
              .select("id", { count: "exact", head: true })
              .neq("elo", STARTING_ELO)
              .gt("elo", myElo);
            setMe({ elo: myElo, rank: (above ?? 0) + 1, ranked: true });
          }
        }
      }
      setLoading(false);
    } catch (err) {
      console.error("Unexpected leaderboard error:", err);
      setLoading(false);
    }
  }, [user, limit]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Re-fetch when any battle moves ELO so the board never shows a stale value.
  useEffect(() => {
    const onEloUpdate = () => fetchLeaderboard();
    arenaEmitter.on("elo:updated", onEloUpdate);
    return () => arenaEmitter.off("elo:updated", onEloUpdate);
  }, [fetchLeaderboard]);

  return { rows, me, loading, refresh: fetchLeaderboard };
};

export const useMyXp = () => {
  const { user } = useAuth();
  const [xp, setXp] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setXp(0);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        console.log("[useMyXp] Fetching from user_xp");
        const { data: xpData, error: xpError } = await supabase
          .from("user_xp")
          .select("total_xp")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (xpError) {
          console.error("user_xp query failed:", xpError);
          if (!cancelled) {
            setXp(0);
            setLoading(false);
          }
          return;
        }
        if (!cancelled) {
          setXp(xpData?.total_xp ?? 0);
          setLoading(false);
        }
      } catch (err) {
        console.error("useMyXp unexpected error:", err);
        if (!cancelled) {
          setXp(0);
          setLoading(false);
        }
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, [user]);

  const fetchMyXP = async () => {
    try {
      setLoading(true);
      const { data: xpData, error: xpError } = await supabase
        .from("user_xp")
        .select("total_xp")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (xpError) {
        console.error("user_xp query failed:", xpError);
        setXp(0);
        setLoading(false);
        return;
      }
      setXp(xpData?.total_xp ?? 0);
      setLoading(false);
    } catch (err) {
      console.error("useMyXp unexpected error:", err);
      setXp(0);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setXp(0);
      setLoading(false);
      return;
    }
    fetchMyXP();
  }, [user]);

  useEffect(() => {
    const onXPChange = () => {
      console.log("[useMyXp] XP changed, refreshing...");
      fetchMyXP();
    };
    window.addEventListener("xp-updated", onXPChange);
    return () => window.removeEventListener("xp-updated", onXPChange);
  }, []);

  return { xp, loading, refresh: fetchMyXP };
};
