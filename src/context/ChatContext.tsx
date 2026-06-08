import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { chatWithAssistant } from "@/services/geminiService";
import { buildCoachContext } from "@/lib/coachContext";
import { useLocation, useNavigate } from "react-router-dom";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
  navigate_to?: string;
  action?: "start_drill";
  drill_dimension?: string;
};

interface ChatContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  messages: ChatMessage[];
  sendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Wipe the previous account's conversation from memory the instant the user
    // changes — never let one user's messages linger in another's session while
    // the reload is in flight (or if it fails). The DB itself is already
    // RLS-isolated (auth.uid() = user_id on both select and insert); this guards
    // the in-memory view on account switch / sign-out.
    setMessages([]);

    if (!user) {
      setIsOpen(false);
      return;
    }

    let cancelled = false;
    const loadMessages = async () => {
      const { data, error } = await supabase
        .from("ai_chat_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(50);

      // Drop a response that resolves after the user changed again — stops a
      // slow load for a previous account from populating the current one.
      if (cancelled) return;
      if (!error && data) {
        setMessages(data as ChatMessage[]);
      }
    };

    loadMessages();
    return () => { cancelled = true; };
    // Keyed on the user id (not the user object) so we don't needlessly clear +
    // reload on every token refresh, which mints a new user object reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const sendMessage = async (text: string) => {
    if (!user || !text.trim()) return;

    const userMsgId = crypto.randomUUID();
    const newUserMsg: ChatMessage = { id: userMsgId, role: "user", content: text };
    
    // Optimistic UI update
    setMessages((prev) => [...prev, newUserMsg]);
    setIsLoading(true);

    // Save user message to DB
    await supabase.from("ai_chat_messages").insert({
      id: userMsgId,
      user_id: user.id,
      role: "user",
      content: text
    });

    // Prepare context for AI — the user's real coaching state (skills, streak,
    // rank, plan). Falls back to the minimal context if the lookup fails.
    let currentContext: any = {
      pathname: location.pathname,
      userName: user.email?.split("@")[0] || "User",
    };
    try {
      currentContext = await buildCoachContext(user.id, location.pathname, user.email?.split("@")[0] || "User");
    } catch (e) {
      console.warn("[ChatContext] coach context unavailable", e);
    }

    // Call AI
    const historyForAi = [...messages, newUserMsg].slice(-10); // Send last 10 messages for context
    const aiResponse = await chatWithAssistant(historyForAi, currentContext);

    const aiMsgId = crypto.randomUUID();
    const newAiMsg: ChatMessage = {
      id: aiMsgId,
      role: "assistant",
      content: aiResponse.text,
      navigate_to: aiResponse.navigateTo,
      action: aiResponse.action,
      drill_dimension: aiResponse.drillDimension,
    };

    // Update UI
    setMessages((prev) => [...prev, newAiMsg]);
    setIsLoading(false);

    // Save AI message to DB
    await supabase.from("ai_chat_messages").insert({
      id: aiMsgId,
      user_id: user.id,
      role: "assistant",
      content: aiResponse.text
    });

    // Handle navigation action if requested - handled by UI button now
    // if (aiResponse.navigateTo) {
    //   console.log("[AICoach] Navigating to:", aiResponse.navigateTo);
    //   navigate(aiResponse.navigateTo);
    //   setIsOpen(false); 
    // }
  };

  return (
    <ChatContext.Provider value={{ isOpen, setIsOpen, messages, sendMessage, isLoading }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within ChatProvider");
  return context;
};
