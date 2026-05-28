import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { arenaEmitter } from "@/lib/events";

export type LeaderboardRow = {
  id: string;
  display_name: string | null;
  elo: number;
};

export const useLeaderboard = (limit = 50) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [me, setMe] = useState<{ elo: number; rank: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const { data: eloData, error: eloError } = await supabase
        .from("profiles")
        .select("id, display_name, elo")
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
          setMe({ elo: mine.elo, rank: list.indexOf(mine) + 1 });
        } else {
          const { data: self } = await supabase
            .from("profiles")
            .select("elo")
            .eq("id", user.id)
            .maybeSingle();
          const myElo = self?.elo ?? 0;
          // Count of profiles strictly above me — leaderboard rank = above + 1.
          const { count: above } = await supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .gt("elo", myElo);
          setMe({ elo: myElo, rank: (above ?? 0) + 1 });
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
