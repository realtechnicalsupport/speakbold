import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface UserXP {
  id: string;
  user_id: string;
  total_xp: number;
  updated_at: string;
}

export function useUserXP() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: userXP, isLoading, error } = useQuery({
    queryKey: ["userXP", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");

      // Try to get existing XP record
      let { data, error } = await supabase
        .from("user_xp")
        .select("*")
        .eq("user_id", user.id)
        .single();

      // If no record exists, create one
      if (error?.code === "PGRST116") {
        const { data: newData } = await supabase
          .from("user_xp")
          .insert({ user_id: user.id, total_xp: 0 })
          .select()
          .single();
        return newData as UserXP;
      }

      if (error) throw error;
      return data as UserXP;
    },
    enabled: !!user?.id,
  });

  const addXP = useMutation({
    mutationFn: async (xpAmount: number) => {
      if (!user?.id) throw new Error("User not authenticated");

      const currentXP = userXP?.total_xp ?? 0;
      const newXP = currentXP + xpAmount;

      const { data, error } = await supabase
        .from("user_xp")
        .update({ total_xp: newXP, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data as UserXP;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userXP", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });

  return {
    userXP,
    isLoading,
    error,
    addXP: addXP.mutate,
    isAdding: addXP.isPending,
  };
}
