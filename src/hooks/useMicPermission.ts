/**
 * useMicPermission
 *
 * Reads and watches the browser microphone permission state using the
 * Permissions API. The result is module-level cached so multiple components
 * share the same state without redundant permission queries.
 *
 * Usage:
 *   const { permission, requestPermission } = useMicPermission();
 *   // permission: "unknown" | "granted" | "denied" | "prompt"
 *   // requestPermission(): Promise<boolean>  — triggers the browser prompt
 */

import { useState, useEffect } from "react";

export type MicPermission = "unknown" | "granted" | "denied" | "prompt";

// Module-level cache: survives component unmount/remount without re-querying
let cachedPermission: MicPermission = "unknown";
const listeners = new Set<(p: MicPermission) => void>();

function broadcast(p: MicPermission) {
  cachedPermission = p;
  listeners.forEach((fn) => fn(p));
}

// Bootstrap the Permissions API watcher once, lazily
let watcherStarted = false;
function startWatcher() {
  if (watcherStarted || typeof navigator === "undefined") return;
  watcherStarted = true;

  navigator.permissions
    ?.query({ name: "microphone" as PermissionName })
    .then((result) => {
      broadcast(result.state as MicPermission);
      result.addEventListener("change", () => {
        broadcast(result.state as MicPermission);
      });
    })
    .catch(() => {
      // Permissions API not supported for microphone in this browser (e.g. Firefox)
      // Leave as "unknown" — requestPermission() will resolve it on first use
    });
}

export function useMicPermission() {
  const [permission, setPermission] = useState<MicPermission>(cachedPermission);

  useEffect(() => {
    // Register listener so this component updates when any tab changes permission
    listeners.add(setPermission);
    // Kick off the watcher if not already running
    startWatcher();
    // Sync immediately in case cachedPermission was updated before this mount
    setPermission(cachedPermission);

    return () => {
      listeners.delete(setPermission);
    };
  }, []);

  /**
   * Imperatively request microphone access. Shows the browser prompt if needed.
   * Returns true if access was granted, false if denied.
   */
  const requestPermission = async (): Promise<boolean> => {
    if (cachedPermission === "granted") return true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Immediately release — we only wanted the permission grant
      stream.getTracks().forEach((track) => track.stop());
      broadcast("granted");
      return true;
    } catch {
      broadcast("denied");
      return false;
    }
  };

  return { permission, requestPermission } as const;
}
