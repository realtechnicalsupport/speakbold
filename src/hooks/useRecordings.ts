import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { XP_REWARDS } from "@/lib/xp-system";
import { toast } from "sonner";

export type CloudRecording = {
  id: string;
  storage_path: string;
  prompt_text: string | null;
  difficulty: string | null;
  duration_ms: number;
  target_seconds: number | null;
  created_at: string;
  signedUrl?: string;
};

export type RecordingFilter = "impromptu" | "interview" | "daily-challenge" | "all";

export const useRecordings = (filter: RecordingFilter = "all") => {
  const { user } = useAuth();
  const [items, setItems] = useState<CloudRecording[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    
    // Build filter query
    let query = supabase
      .from("recordings")
      .select("*")
      .eq("user_id", user.id);
    
    // Apply filter based on track
    if (filter === "impromptu") {
      query = query.in("difficulty", ["Easy", "Medium", "Hard"]);
    } else if (filter === "interview") {
      query = query.like("prompt_text", "Interview:%");
    } else if (filter === "daily-challenge") {
      query = query.like("prompt_text", "The Elevator Pitch%")
        .or("prompt_text.like.Explain It Simply%")
        .or("prompt_text.like.Impromptu Story%");
    }
    
    const { data, error } = await query.order("created_at", { ascending: false });
    
    if (!error && data) {
      const withUrls = data.map((r: any) => {
        // Use public URL directly
        const publicUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/Recordings/${r.storage_path}`;
        return { ...r, signedUrl: publicUrl };
      });
      setItems(withUrls as CloudRecording[]);
    }
    setLoading(false);
  }, [user, filter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upload = useCallback(
    async (
      blob: Blob,
      meta: { promptText: string; difficulty: string; durationMs: number; targetSeconds: number }
    ) => {
      if (!user) return null;
      const t = blob.type;
      const ext = t.includes("webm") ? "webm"
        : t.includes("mp4") || t.includes("aac") || t.includes("m4a") ? "m4a"
        : t.includes("ogg") ? "ogg"
        : t.includes("mpeg") || t.includes("mp3") ? "mp3"
        : "webm";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("Recordings")
        .upload(path, blob, { contentType: blob.type || "audio/webm", upsert: false });
      if (upErr) {
        console.error("[recordings] upload failed", upErr);
        alert("Upload failed: " + upErr.message);
        return null;
      }
      const { data, error } = await supabase
        .from("recordings")
        .insert({
          user_id: user.id,
          storage_path: path,
          prompt_text: meta.promptText,
          difficulty: meta.difficulty,
          duration_ms: meta.durationMs,
          target_seconds: meta.targetSeconds,
        })
        .select()
        .single();
      if (error) {
        console.error("[recordings] insert failed", error);
        alert("Database insert failed: " + error.message);
        return null;
      }

      // Award XP based on difficulty - try profiles table first, fallback to user_xp
      const xpReward = XP_REWARDS[meta.difficulty as keyof typeof XP_REWARDS] || 20;
try {
        // Always use user_xp table
        console.log("[recordings] Using user_xp for XP");
        
        const { data: xpData, error: xpError } = await supabase
          .from("user_xp")
          .select("total_xp")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (xpError) {
          console.error("[recordings] user_xp fetch error:", xpError);
        } else if (!xpData) {
          const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous';
          const { error: insertError } = await supabase
            .from("user_xp")
            .insert({ user_id: user.id, total_xp: xpReward, display_name: displayName });
          
          if (insertError) {
            console.error("[recordings] user_xp insert error:", insertError);
          } else {
            toast.success(`🎉 +${xpReward} XP awarded!`);
            window.dispatchEvent(new Event("xp-updated"));
          }
        } else {
          const newTotal = (xpData.total_xp || 0) + xpReward;
          const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous';
          const { error: updateError } = await supabase
            .from("user_xp")
            .update({ total_xp: newTotal, updated_at: new Date().toISOString(), display_name: displayName })
            .eq("user_id", user.id);
          
          if (updateError) {
            console.error("[recordings] user_xp update error:", updateError);
          } else {
            toast.success(`✨ +${xpReward} XP earned!`);
            window.dispatchEvent(new Event("xp-updated"));
          }
        }
      } catch (xpError) {
        console.error("[recordings] XP reward failed", xpError);
        // Don't fail the recording save if XP fails
      }

      await refresh();
      return data;
    },
    [user, refresh]
  );

  const remove = useCallback(
    async (rec: CloudRecording) => {
      if (!user) return;
      await supabase.storage.from("Recordings").remove([rec.storage_path]);
      await supabase.from("recordings").delete().eq("id", rec.id);
      setItems((prev) => prev.filter((r) => r.id !== rec.id));
    },
    [user]
  );

  return { items, loading, upload, remove, refresh };
};

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86_400_000);

export const useSyncedStreak = () => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [lastDay, setLastDay] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      // Reset state when user logs out
      setCount(0);
      setLastDay(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("streaks")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        // auto-break if gap >1 day
        if (data.last_day && daysBetween(data.last_day, todayKey()) >1) {
          setCount(0);
          setLastDay(data.last_day);
          await supabase
            .from("streaks")
            .update({ count: 0 })
            .eq("user_id", user.id);
        } else {
          setCount(data.count ?? 0);
          setLastDay(data.last_day);
        }
      } else {
        setCount(0);
        setLastDay(null);
      }
    })();
  }, [user]);

  const markPracticed = useCallback(async () => {
    if (!user) return;
    const today = todayKey();
    if (lastDay === today) return;
    const gap = lastDay ? daysBetween(lastDay, today) : Infinity;
    const next = gap === 1 ? count + 1 : 1;
    setCount(next);
    setLastDay(today);
    await supabase
      .from("streaks")
      .upsert({ user_id: user.id, count: next, last_day: today }, { onConflict: "user_id" });
  }, [user, lastDay, count]);

  return { count, practicedToday: lastDay === todayKey(), markPracticed };
};
