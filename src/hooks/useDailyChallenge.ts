import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type ChallengeType = "body-language" | "impromptu" | "interviews" | "public-speaking";

export interface DailyChallenge {
  id: string;
  type: ChallengeType;
  completed: boolean;
  completedAt: Date | null;
  nextChallengeAt: Date | null;
}

const CHALLENGES: { type: ChallengeType; label: string; emoji: string; route: string }[] = [
  { type: "body-language", label: "Body Language", emoji: "🧘", route: "/tracks/body-language" },
  { type: "impromptu", label: "Impromptu", emoji: "🎤", route: "/tracks/impromptu" },
  { type: "interviews", label: "Interviews", emoji: "💼", route: "/tracks/interviews" },
  { type: "public-speaking", label: "Public Speaking", emoji: "🎯", route: "/tracks/public-speaking" },
];

const getChallengeForDate = (date: Date): ChallengeType => {
  const start = new Date("2025-01-01");
  const diffDays = Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return CHALLENGES[diffDays % CHALLENGES.length].type;
};

const getTodayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getNextChallengeTime = (completedAt: Date): Date => {
  const next = new Date(completedAt);
  next.setHours(24, 0, 0, 0);
  return next;
};

export const useDailyChallenge = () => {
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);

  const todayChallenge = CHALLENGES.find((c) => c.type === getChallengeForDate(new Date()));

  const fetchChallenge = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from("daily_challenges")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", todayStart.toISOString())
      .lte("created_at", todayEnd.toISOString())
      .maybeSingle();

    if (data) {
      const nextChallengeAt = data.next_challenge_at ? new Date(data.next_challenge_at) : null;
      
      if (nextChallengeAt && nextChallengeAt <= now) {
        const newChallenge = {
          id: "",
          type: getChallengeForDate(now),
          completed: false,
          completedAt: null,
          nextChallengeAt: null,
        };
        setChallenge(newChallenge);
      } else {
        setChallenge({
          id: data.id,
          type: data.challenge_type as ChallengeType,
          completed: data.completed,
          completedAt: data.completed_at ? new Date(data.completed_at) : null,
          nextChallengeAt,
        });
      }
    } else {
      setChallenge({
        id: "",
        type: getChallengeForDate(now),
        completed: false,
        completedAt: null,
        nextChallengeAt: null,
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchChallenge();
  }, [fetchChallenge]);

  useEffect(() => {
    if (!challenge?.completedAt) {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const nextTime = getNextChallengeTime(challenge.completedAt!);
      const diff = nextTime.getTime() - now.getTime();
      
      if (diff <= 0) {
        fetchChallenge();
        setCountdown(null);
        return;
      }
      
      setCountdown(diff);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [challenge?.completedAt, fetchChallenge]);

  const completeChallenge = useCallback(async () => {
    if (!user || !challenge) return;

    const now = new Date();
    const nextChallenge = getNextChallengeTime(now);

    const update = {
      user_id: user.id,
      challenge_type: challenge.type,
      completed: true,
      completed_at: now.toISOString(),
      next_challenge_at: nextChallenge.toISOString(),
      created_at: getTodayKey(),
    };

    if (challenge.id) {
      await supabase
        .from("daily_challenges")
        .update(update)
        .eq("id", challenge.id);
    } else {
      await supabase
        .from("daily_challenges")
        .insert(update);
    }

    setChallenge({
      ...challenge,
      completed: true,
      completedAt: now,
      nextChallengeAt: nextChallenge,
    });
  }, [user, challenge]);

  const isToday = challenge?.type === todayChallenge?.type;

  return {
    loading,
    challenge,
    todayChallenge: todayChallenge!,
    completeChallenge,
    countdown,
    isToday,
    allChallenges: CHALLENGES,
  };
};