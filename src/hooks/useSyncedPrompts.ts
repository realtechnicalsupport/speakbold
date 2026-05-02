import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { CustomPrompt, Difficulty, Prompt } from "@/components/PromptAuthor";

const STORAGE_KEY = "impromptu-custom-prompts-v1";
const OVERRIDES_KEY = "impromptu-builtin-overrides-v1";
const DISABLED_KEY = "impromptu-disabled-ids-v1";

export type BuiltinOverride = { difficulty: Difficulty; prompt: Prompt };

const readLocal = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

export const useSyncedPrompts = () => {
  const { user } = useAuth();
  const [customPrompts, setCustomPromptsState] = useState<CustomPrompt[]>(() =>
    readLocal<CustomPrompt[]>(STORAGE_KEY, [])
  );
  const [overrides, setOverridesState] = useState<Record<string, BuiltinOverride>>(() =>
    readLocal<Record<string, BuiltinOverride>>(OVERRIDES_KEY, {})
  );
  const [disabledIds, setDisabledIdsState] = useState<Set<string>>(() => {
    const arr = readLocal<string[]>(DISABLED_KEY, []);
    return new Set(arr);
  });
  const [hydrated, setHydrated] = useState(false);

  // Always mirror to localStorage as a fallback cache
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customPrompts));
  }, [customPrompts]);
  useEffect(() => {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  }, [overrides]);
  useEffect(() => {
    localStorage.setItem(DISABLED_KEY, JSON.stringify(Array.from(disabledIds)));
  }, [disabledIds]);

  // Pull from cloud when user logs in
  useEffect(() => {
    if (!user) {
      setHydrated(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const [cp, ov, dp] = await Promise.all([
        supabase.from("custom_prompts").select("*").eq("user_id", user.id),
        supabase.from("prompt_overrides").select("*").eq("user_id", user.id),
        supabase.from("disabled_prompts").select("prompt_id").eq("user_id", user.id),
      ]);
      if (cancelled) return;
      if (cp.data) {
        setCustomPromptsState(
          cp.data.map((r: any) => ({
            id: r.client_id,
            difficulty: r.difficulty,
            text: r.text,
            framework: r.framework,
            points: r.points ?? [],
            example: r.example ?? [],
          }))
        );
      }
      if (ov.data) {
        const map: Record<string, BuiltinOverride> = {};
        ov.data.forEach((r: any) => {
          map[r.builtin_id] = { difficulty: r.difficulty, prompt: r.prompt };
        });
        setOverridesState(map);
      }
      if (dp.data) {
        setDisabledIdsState(new Set(dp.data.map((r: any) => r.prompt_id)));
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Mutators that write through to cloud when signed in
  const upsertCustomPrompt = useCallback(
    async (p: CustomPrompt) => {
      setCustomPromptsState((prev) => {
        const exists = prev.some((x) => x.id === p.id);
        return exists ? prev.map((x) => (x.id === p.id ? p : x)) : [...prev, p];
      });
      if (!user) return;
      await supabase.from("custom_prompts").upsert(
        {
          user_id: user.id,
          client_id: p.id,
          difficulty: p.difficulty,
          text: p.text,
          framework: p.framework,
          points: p.points,
          example: p.example,
        },
        { onConflict: "user_id,client_id" }
      );
    },
    [user]
  );

  const deleteCustomPrompt = useCallback(
    async (id: string) => {
      setCustomPromptsState((prev) => prev.filter((p) => p.id !== id));
      setDisabledIdsState((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      if (!user) return;
      await supabase.from("custom_prompts").delete().eq("user_id", user.id).eq("client_id", id);
      await supabase.from("disabled_prompts").delete().eq("user_id", user.id).eq("prompt_id", id);
    },
    [user]
  );

  const replaceAllCustomPrompts = useCallback(
    async (ps: CustomPrompt[]) => {
      setCustomPromptsState(ps);
      if (!user) return;
      await supabase.from("custom_prompts").delete().eq("user_id", user.id);
      if (ps.length) {
        await supabase.from("custom_prompts").insert(
          ps.map((p) => ({
            user_id: user.id,
            client_id: p.id,
            difficulty: p.difficulty,
            text: p.text,
            framework: p.framework,
            points: p.points,
            example: p.example,
          }))
        );
      }
    },
    [user]
  );

  const setOverride = useCallback(
    async (id: string, ov: BuiltinOverride) => {
      setOverridesState((prev) => ({ ...prev, [id]: ov }));
      if (!user) return;
      await supabase.from("prompt_overrides").upsert(
        {
          user_id: user.id,
          builtin_id: id,
          difficulty: ov.difficulty,
          prompt: ov.prompt as any,
        },
        { onConflict: "user_id,builtin_id" }
      );
    },
    [user]
  );

  const clearOverride = useCallback(
    async (id: string) => {
      setOverridesState((prev) => {
        const { [id]: _drop, ...rest } = prev;
        return rest;
      });
      if (!user) return;
      await supabase.from("prompt_overrides").delete().eq("user_id", user.id).eq("builtin_id", id);
    },
    [user]
  );

  const setDisabled = useCallback(
    async (id: string, disabled: boolean) => {
      setDisabledIdsState((prev) => {
        const n = new Set(prev);
        if (disabled) n.add(id);
        else n.delete(id);
        return n;
      });
      if (!user) return;
      if (disabled) {
        await supabase
          .from("disabled_prompts")
          .upsert({ user_id: user.id, prompt_id: id }, { onConflict: "user_id,prompt_id" });
      } else {
        await supabase.from("disabled_prompts").delete().eq("user_id", user.id).eq("prompt_id", id);
      }
    },
    [user]
  );

  const resetAll = useCallback(async () => {
    setOverridesState({});
    setDisabledIdsState(new Set());
    if (!user) return;
    await supabase.from("prompt_overrides").delete().eq("user_id", user.id);
    await supabase.from("disabled_prompts").delete().eq("user_id", user.id);
  }, [user]);

  return {
    hydrated,
    customPrompts,
    overrides,
    disabledIds,
    upsertCustomPrompt,
    deleteCustomPrompt,
    replaceAllCustomPrompts,
    setOverride,
    clearOverride,
    setDisabled,
    resetAll,
  };
};
