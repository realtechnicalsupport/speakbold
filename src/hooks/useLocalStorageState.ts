import { useState, useEffect, useCallback, useRef } from "react";

/**
 * useState that mirrors its value into localStorage so user-chosen options
 * survive a page refresh.
 *
 * The initial value is read from localStorage on first render; if nothing is
 * stored (or parsing fails) the fallback is used. Every subsequent set call
 * writes the new value back to localStorage.
 *
 * Use the same `key` everywhere you read a particular option — picking a
 * descriptive, namespaced key avoids collisions (e.g. "speakbold:impromptu:record").
 */
export function useLocalStorageState<T>(
  key: string,
  fallback: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  });

  // Track the latest value so the setter is stable across renders.
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  const set = useCallback((next: T | ((prev: T) => T)) => {
    setValue(prev => {
      const resolved = typeof next === "function"
        ? (next as (p: T) => T)(prev)
        : next;
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved));
      } catch { /* quota / private mode — silently skip */ }
      return resolved;
    });
  }, [key]);

  return [value, set];
}
