import { useState, useCallback, useMemo } from "react";
import type { Difficulty } from "@/data/impromptuTopics";

export interface ImpromptuSessionRecord {
  id: string;
  timestamp: number;
  topicText: string;
  topicId: string;
  difficulty: Difficulty;
  duration: number;
  score: number;
  wpm: number;
  fillerCount: number;
  totalWords: number;
  verdict: string;
}

export interface ImpromptuStats {
  totalSessions: number;
  avgScore: number;
  bestScore: number;
  avgWpm: number;
  bestWpm: number;
  streak: number;
}

const STORAGE_KEY = "speakbold_impromptu_history_v2";
const MAX_RECORDS = 50;

export function loadHistory(): ImpromptuSessionRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveSession(
  data: Omit<ImpromptuSessionRecord, "id" | "timestamp">
): ImpromptuSessionRecord {
  const record: ImpromptuSessionRecord = {
    ...data,
    id: `imp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  };
  const existing = loadHistory();
  const updated = [record, ...existing].slice(0, MAX_RECORDS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch { /* storage full — ignore */ }
  return record;
}

function computeStreak(history: ImpromptuSessionRecord[]): number {
  if (history.length === 0) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = new Set<string>();
  for (const s of history) {
    const d = new Date(s.timestamp);
    d.setHours(0, 0, 0, 0);
    days.add(d.toISOString());
  }

  let streak = 0;
  const cursor = new Date(today);
  // allow today or yesterday as the start of streak
  const todayStr = today.toISOString();
  const yesterdayStr = new Date(today.getTime() - 86400000).toISOString();
  if (!days.has(todayStr) && !days.has(yesterdayStr)) return 0;
  if (!days.has(todayStr)) cursor.setTime(cursor.getTime() - 86400000);

  while (days.has(cursor.toISOString())) {
    streak++;
    cursor.setTime(cursor.getTime() - 86400000);
  }
  return streak;
}

export function computeStats(history: ImpromptuSessionRecord[]): ImpromptuStats {
  if (history.length === 0) {
    return { totalSessions: 0, avgScore: 0, bestScore: 0, avgWpm: 0, bestWpm: 0, streak: 0 };
  }
  const avgScore = Math.round(history.reduce((s, h) => s + h.score, 0) / history.length);
  const bestScore = Math.max(...history.map(h => h.score));
  const wpmRecords = history.filter(h => h.wpm > 0);
  const avgWpm = wpmRecords.length > 0
    ? Math.round(wpmRecords.reduce((s, h) => s + h.wpm, 0) / wpmRecords.length)
    : 0;
  const bestWpm = wpmRecords.length > 0 ? Math.max(...wpmRecords.map(h => h.wpm)) : 0;
  const streak = computeStreak(history);
  return { totalSessions: history.length, avgScore, bestScore, avgWpm, bestWpm, streak };
}

export function useImpromptuHistory() {
  const [history, setHistory] = useState<ImpromptuSessionRecord[]>(() => loadHistory());

  const addSession = useCallback(
    (data: Omit<ImpromptuSessionRecord, "id" | "timestamp">) => {
      const record = saveSession(data);
      setHistory(prev => [record, ...prev].slice(0, MAX_RECORDS));
      return record;
    },
    []
  );

  const stats = useMemo(() => computeStats(history), [history]);

  return { history, addSession, stats };
}
