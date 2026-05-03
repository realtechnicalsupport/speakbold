import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const triggerXPChange = () => window.dispatchEvent(new Event("xp-updated"));

export type LeaderboardRow = {
  id: string;
  display_name: string | null;
  xp: number;
};

export const useLeaderboard = (limit = 50) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [me, setMe] = useState<{ xp: number; rank: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const { data: xpData, error: xpError } = await supabase
        .from("user_xp")
        .select(`
          id,
          user_id,
          total_xp,
          display_name
        `)
        .order("total_xp", { ascending: false })
        .limit(limit);
      
      if (xpError) {
        console.error("user_xp query failed:", xpError);
        setRows([]);
        setMe(null);
        setLoading(false);
        return;
      }
      
      const list = (xpData || [])
        .map((entry: any) => ({
          id: entry.user_id,
          display_name: entry.display_name || `User ${entry.user_id?.slice(0, 8) || 'Unknown'}`,
          xp: entry.total_xp || 0,
        }))
        .filter((r) => r.xp > 0) as LeaderboardRow[];
      
      setRows(list);
      
      if (user) {
        const mine = list.find((r) => r.id === user.id);
        if (mine) {
          setMe({ xp: mine.xp, rank: list.indexOf(mine) + 1 });
        } else {
          const { data: self } = await supabase
            .from("user_xp")
            .select("total_xp")
            .eq("user_id", user.id)
            .maybeSingle();
          const myXp = self?.total_xp ?? 0;
          const higherCount = list.filter((r) => r.xp > myXp).length;
          setMe({ xp: myXp, rank: higherCount + 1 });
        }
      }
      setLoading(false);
    } catch (err) {
      console.error("Unexpected leaderboard error:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [user, limit]);

  // Listen for XP changes
  useEffect(() => {
    const onXPChange = () => {
      console.log("[Leaderboard] XP changed, refreshing...");
      fetchLeaderboard();
    };
    window.addEventListener("xp-updated", onXPChange);
    return () => window.removeEventListener("xp-updated", onXPChange);
  }, []);

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
