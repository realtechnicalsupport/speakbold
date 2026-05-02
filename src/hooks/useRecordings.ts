import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

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

export const useRecordings = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<CloudRecording[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("recordings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) {
      const withUrls = data.map((r: any) => {
        // Use public URL directly
        const publicUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/Recordings/${r.storage_path}`;
        return { ...r, signedUrl: publicUrl };
      });
      setItems(withUrls as CloudRecording[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upload = useCallback(
    async (
      blob: Blob,
      meta: { promptText: string; difficulty: string; durationMs: number; targetSeconds: number }
    ) => {
      if (!user) return null;
      const ext = blob.type.includes("webm") ? "webm" : "audio";
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
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("streaks")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        // auto-break if gap > 1 day
        if (data.last_day && daysBetween(data.last_day, todayKey()) > 1) {
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
