import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useFriends } from "@/hooks/useFriends";

export interface SearchResult {
  id: string;
  display_name: string;
  elo: number;
}

export const useFriendSearch = (query: string) => {
  const { user } = useAuth();
  const { friends, incomingRequests, outgoingRequests } = useFriends();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim() || !user) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        // Escape Postgres LIKE wildcards so a literal "%" or "_" in the query
        // doesn't match everything / anything unexpectedly.
        const q = query.trim().replace(/[\\%_]/g, (m) => `\\${m}`);
        const { data } = await (supabase as any)
          .from("profiles")
          .select("id, display_name, elo")
          .ilike("display_name", `%${q}%`)
          .neq("id", user.id)
          .order("display_name", { ascending: true })
          .limit(20);

        const existingIds = new Set([
          ...friends.map((f) => f.id),
          ...incomingRequests.map((f) => f.id),
          ...outgoingRequests.map((f) => f.id),
        ]);

        setResults(
          (data ?? []).map((p: any) => ({
            id: p.id,
            display_name: p.display_name || `User ${p.id?.slice(0, 8)}`,
            elo: p.elo ?? 1000,
            alreadyFriend: existingIds.has(p.id),
          }))
        );
      } catch (err) {
        console.error("[useFriendSearch] error:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, user, friends, incomingRequests, outgoingRequests]);

  return { results, loading };
};
