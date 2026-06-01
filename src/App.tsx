import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import { MobileNav } from "./components/MobileNav";
import NotFound from "./pages/NotFound";
import PreFlightChecklist from "./pages/PreFlightChecklist";
import Profile from "./pages/Profile";
import ResetPassword from "./pages/ResetPassword";
import PublicSpeaking from "./pages/tracks/PublicSpeaking";
import Impromptu from "./pages/tracks/Impromptu";
import Interviews from "./pages/tracks/Interviews";
import BodyLanguage from "./pages/tracks/BodyLanguage";
import PitchDeck from "./pages/PitchDeck";
import ProgressReport from "./pages/ProgressReport";
import Login from "./pages/Login";
import Callback from "./pages/auth/callback";
import Events from "./pages/Events";
import CreateEvent from "./pages/CreateEvent";
import EventDetail from "./pages/EventDetail";
import Leaderboard from "./pages/Leaderboard";
import Pathway from "./pages/Pathway";
import Lab from "./pages/Lab";
import Arena from "./pages/Arena";
import Friends from "./pages/Friends";
import FriendProfile from "./pages/FriendProfile";
import FriendInviteLanding from "./pages/FriendInviteLanding";
import { FriendsProvider } from "./context/FriendsContext";
import { useEventReminders } from "./hooks/useEventReminders";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./components/theme-provider";
import { useTimerActive } from "./lib/timerState";
import { MicrophoneBorder } from "./components/MicrophoneBorder";
import { ArenaProvider } from "./context/ArenaContext";
import { ChatProvider } from "./context/ChatContext";
import { OnboardingModal } from "./components/OnboardingModal";
import { GuidedTour } from "./components/GuidedTour";
import { FloatingNodes } from "./components/FloatingNodes";
import { AICoachChat } from "./components/AICoachChat";
import { GlobalStatusBar } from "./components/GlobalStatusBar";

const queryClient = new QueryClient();

const ReminderWrapper = ({ children }: { children: React.ReactNode }) => {
  useEventReminders();
  return <>{children}</>;
};

/**
 * Gate a protected route on an authenticated session. While auth is still
 * resolving we render nothing (rather than flashing an empty authed page,
 * then redirecting). Once resolved, signed-out users are sent to /login with
 * the original destination preserved so post-login can bounce them back.
 */
const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
};

const App = () => {
  const timerActive = useTimerActive();

  useEffect(() => {
    // Console commands moved to TutorialOverlay to access Auth context
    console.log(
      "%c SPEAKBOLD %c v1.2.5 %c\n" +
      "%c\n" +
      "  RECENT UPDATES:\n" +
      "  ✓ User Progress: Finalized robust Supabase sync for Onboarding & Tutorials\n" +
      "  ✓ Persistence: Implemented cross-device state recovery via AuthContext\n" +
      "  ✓ Arena: Fixed battle archive persistence for AI & custom duels\n" +
      "  ✓ Performance: Optimized ELO calculation and database RPC calls\n" +
      "\n" +
      "  DEV TOOLS AVAILABLE:\n" +
      "  > resetOnboarding()  - Clear all progress and restart experience\n" +
      "  > startTutorial()    - Force start the first-steps tutorial overlay\n",
      "background: #111; color: #fff; font-weight: bold; padding: 4px 8px; border-radius: 4px 0 0 4px;",
      "background: #ff5500; color: #fff; font-weight: bold; padding: 4px 8px; border-radius: 0 4px 4px 0;",
      "background: transparent; color: inherit;",
      "font-weight: normal; color: #888; line-height: 1.6;"
    );
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ArenaProvider>
          <FriendsProvider>
          <ThemeProvider defaultTheme="dark" storageKey="speakbold-theme">
            <TooltipProvider>
              <Toaster />
            <Sonner />
            <ReminderWrapper>
              <BrowserRouter>
                <FloatingNodes />
                <GuidedTour />
                <ChatProvider>
              
              {/* Global Background Elements */}
              <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                {/* Base Grid */}
                <div className="absolute inset-0 bg-grid opacity-[0.4]" />

                {/* Static blobs — no animation, GPU-friendly */}
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/8 rounded-full blur-[100px] opacity-30 mix-blend-screen" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[80px] opacity-20 mix-blend-screen" />

                {/* Global Scanlines */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] z-[100] pointer-events-none bg-[length:100%_4px,3px_100%] opacity-[0.03] dark:opacity-[0.07]" />

                {/* Decorative Lines */}
                <div className="absolute top-0 left-1/4 w-px h-screen bg-gradient-to-b from-transparent via-border/20 to-transparent" />
                <div className="absolute top-0 right-1/4 w-px h-screen bg-gradient-to-b from-transparent via-border/20 to-transparent" />

                {/* Desktop-only single glass accent */}
                <div className="hidden lg:block absolute top-[15%] left-[5%] w-32 h-32 border border-white/5 rounded-3xl bg-white/[0.03] opacity-20 rotate-12" />

              </div>

              <div className={`${timerActive ? "pb-0" : "pb-24 lg:pb-0"} relative z-10`}>
                <Routes>
                  {/* Public — anyone, signed in or not */}
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/auth/callback" element={<Callback />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/pitch" element={<PitchDeck />} />
                  {/* Track pages are intentionally public — Login.tsx
                      links to "/tracks/impromptu" as ANONYMOUS PRACTICE. */}
                  <Route path="/tracks/public-speaking" element={<PublicSpeaking />} />
                  <Route path="/tracks/impromptu" element={<Impromptu />} />
                  <Route path="/tracks/interviews" element={<Interviews />} />
                  <Route path="/tracks/body-language" element={<BodyLanguage />} />

                  {/* Auth-gated — flash an empty page no longer; bounce to
                      /login with location state so we can return after sign-in. */}
                  <Route path="/pre-flight" element={<RequireAuth><PreFlightChecklist /></RequireAuth>} />
                  <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
                  <Route path="/report" element={<RequireAuth><ProgressReport /></RequireAuth>} />
                  <Route path="/leaderboard" element={<RequireAuth><Leaderboard /></RequireAuth>} />
                  {/* Legacy: the adaptive coach now lives in The Lab. */}
                  <Route path="/coach" element={<Navigate to="/lab" replace />} />
                  <Route path="/pathway" element={<RequireAuth><Pathway /></RequireAuth>} />
                  <Route path="/lab" element={<RequireAuth><Lab /></RequireAuth>} />
                  <Route path="/arena" element={<RequireAuth><Arena /></RequireAuth>} />
                  <Route path="/events" element={<RequireAuth><Events /></RequireAuth>} />
                  <Route path="/events/new" element={<RequireAuth><CreateEvent /></RequireAuth>} />
                  <Route path="/events/:id" element={<RequireAuth><EventDetail /></RequireAuth>} />
                  <Route path="/friends" element={<RequireAuth><Friends /></RequireAuth>} />
                  <Route path="/friends/requests" element={<RequireAuth><Friends /></RequireAuth>} />
                  <Route path="/friends/invite" element={<RequireAuth><Friends /></RequireAuth>} />
                  <Route path="/friends/:userId" element={<RequireAuth><FriendProfile /></RequireAuth>} />
                  {/* Public — invite landing works for signed-out users */}
                  <Route path="/friends/invite/:token" element={<FriendInviteLanding />} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
              {!timerActive && <MobileNav />}
              <MicrophoneBorder />
              <GlobalStatusBar />
              <OnboardingModal />
              <AICoachChat />
              </ChatProvider>
            </BrowserRouter>
          </ReminderWrapper>
        </TooltipProvider>
      </ThemeProvider>
          </FriendsProvider>
      </ArenaProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
};

export default App;
