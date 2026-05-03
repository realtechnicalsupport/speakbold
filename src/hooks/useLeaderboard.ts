import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getRankFromXP } from "@/lib/xp-system";

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  total_xp: number;
  display_name: string | null;
  rank: string;
  position: number;
}

export function useLeaderboard() {
  const { data: leaderboard, isLoading, error } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_xp")
        .select(
          `
          id,
          user_id,
          total_xp,
          profiles:user_id (display_name)
        `
        )
        .order("total_xp", { ascending: false })
        .limit(100);

      if (error) throw error;

      return (data as any[]).map((entry, index) => ({
        id: entry.id,
        user_id: entry.user_id,
        total_xp: entry.total_xp,
        display_name: entry.profiles?.display_name || `User ${entry.user_id.slice(0, 8)}`,
        rank: getRankFromXP(entry.total_xp),
        position: index + 1,
      })) as LeaderboardEntry[];
    },
    staleTime: 60000, // Cache for 1 minute
  });

  return {
    leaderboard: leaderboard || [],
    isLoading,
    error,
  };
}
