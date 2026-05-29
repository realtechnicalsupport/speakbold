import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface InviteRow {
  token: string;
  created_at: string;
  claimed_by: string | null;
  claimed_at: string | null;
  expires_at: string;
}

const randomToken = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  }
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
};

export const useFriendInvite = () => {
  const { user } = useAuth();
  const [myInvites, setMyInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchInvites = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await (supabase as any)
        .from("friend_invites")
        .select("token, created_at, claimed_by, claimed_at, expires_at")
        .eq("inviter_id", user.id)
        .order("created_at", { ascending: false });
      setMyInvites(data ?? []);
    } catch (err) {
      console.error("[useFriendInvite] fetchInvites error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchInvites();
  }, [user, fetchInvites]);

  const generateInvite = useCallback(async (): Promise<string> => {
    if (!user) throw new Error("Not authenticated");
    const token = randomToken();
    const { error } = await (supabase as any).from("friend_invites").insert({
      token,
      inviter_id: user.id,
    });
    if (error) throw error;
    await fetchInvites();
    return `${window.location.origin}/friends/invite/${token}`;
  }, [user, fetchInvites]);

  const revokeInvite = useCallback(
    async (token: string) => {
      if (!user) return;
      await (supabase as any)
        .from("friend_invites")
        .delete()
        .eq("token", token)
        .eq("inviter_id", user.id);
      await fetchInvites();
    },
    [user, fetchInvites]
  );

  return { myInvites, loading, generateInvite, revokeInvite, refresh: fetchInvites };
};
