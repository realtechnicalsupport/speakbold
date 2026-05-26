import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  statusLoading: boolean;
  onboardingDone: boolean;
  tutorialDone: boolean;
  refreshUserStatus: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  statusLoading: true,
  onboardingDone: false,
  tutorialDone: false,
  refreshUserStatus: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [tutorialDone, setTutorialDone] = useState(false);

  const refreshUserStatus = useCallback(async () => {
    const currentUser = session?.user;
    if (!currentUser) {
      console.log("[Auth] No user for status refresh");
      setOnboardingDone(false);
      setTutorialDone(false);
      setStatusLoading(false);
      return;
    }

    setStatusLoading(true);
    console.log("[Auth] Refreshing user status from Profiles...");
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("onboarding_done, tutorial_done")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (error) throw error;

      console.log("[Auth] Profile Status fetched:", data);
      const hasOnboarding = data?.onboarding_done ?? false;
      const hasTutorial = data?.tutorial_done ?? false;

      setOnboardingDone(hasOnboarding);
      setTutorialDone(hasTutorial);

      // Sync to local storage for legacy/utility support
      localStorage.setItem(`speakbold_onboarding_v2_${currentUser.id}`, hasOnboarding ? "true" : "false");
      if (hasOnboarding && !hasTutorial) {
        localStorage.setItem(`speakbold_tutorial_pending_${currentUser.id}`, "true");
      } else {
        localStorage.removeItem(`speakbold_tutorial_pending_${currentUser.id}`);
      }
    } catch (err) {
      console.error("[Auth] Error refreshing user status:", err);
    } finally {
      setStatusLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  useEffect(() => {
    // Set up listener BEFORE getSession (per Supabase guidelines)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    
    return () => sub.subscription.unsubscribe();
  }, []);

  // Only re-fetch when the user ID changes (not on every token rotation)
  useEffect(() => {
    if (session?.user) {
      refreshUserStatus();
    } else {
      setOnboardingDone(false);
      setTutorialDone(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.clear();
  }, []);

  // Memoised value: prevents all consumers from re-rendering on unrelated state changes
  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    loading,
    statusLoading,
    onboardingDone,
    tutorialDone,
    refreshUserStatus,
    signOut,
  }), [session, loading, statusLoading, onboardingDone, tutorialDone, refreshUserStatus, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
