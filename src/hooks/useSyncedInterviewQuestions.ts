import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface InterviewQuestion {
  id: string;
  q: string;
  type: "Behavioural" | "Tell me about yourself" | "Strengths/Weaknesses" | "Why this role" | "Salary" | "Curveball" | "AI Generated";
  guidance: string;
  example: string;
  targetSeconds: number;
  difficulty: "Warm-up" | "Standard" | "Pressure";
  keyPoints: string[];
  is_ai: boolean;
  created_at: string;
}

export const useSyncedInterviewQuestions = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  // Load questions from Supabase on mount
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadQuestions = async () => {
      try {
        const { data, error } = await supabase
          .from("user_interview_questions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        
        // Convert snake_case from DB to camelCase
        const mapped = (data || []).map((q: any) => ({
          id: q.id,
          q: q.q,
          type: q.type,
          guidance: q.guidance,
          example: q.example,
          targetSeconds: q.target_seconds,
          difficulty: q.difficulty,
          keyPoints: q.key_points,
          is_ai: q.is_ai,
          created_at: q.created_at,
        }));
        setQuestions(mapped);
      } catch (err) {
        console.error("Error loading interview questions:", err);
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, [user]);

  const addQuestions = useCallback(async (newQuestions: Omit<InterviewQuestion, "id" | "created_at">[]) => {
    if (!user) return;

    const questionsToInsert = newQuestions.map(q => ({
      user_id: user.id,
      q: q.q,
      type: q.type,
      guidance: q.guidance,
      example: q.example,
      target_seconds: q.targetSeconds,
      difficulty: q.difficulty,
      key_points: q.keyPoints,
      is_ai: q.is_ai,
    }));

    const { data, error } = await supabase
      .from("user_interview_questions")
      .insert(questionsToInsert)
      .select();

    if (error) {
      console.error("Error saving interview questions:", error);
      throw error;
    }

    if (data) {
      setQuestions(prev => [...data, ...prev]);
    }

    return data;
  }, [user]);

  const deleteQuestion = useCallback(async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("user_interview_questions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting interview question:", error);
      throw error;
    }

    setQuestions(prev => prev.filter(q => q.id !== id));
  }, [user]);

  const clearAllQuestions = useCallback(async () => {
    if (!user) return;

    const { error } = await supabase
      .from("user_interview_questions")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      console.error("Error clearing interview questions:", error);
      throw error;
    }

    setQuestions([]);
  }, [user]);

  return {
    questions,
    loading,
    addQuestions,
    deleteQuestion,
    clearAllQuestions,
  };
};