import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
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
import { useEventReminders } from "./hooks/useEventReminders";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./components/theme-provider";
import { useTimerActive } from "./lib/timerState";
import { MicrophoneBorder } from "./components/MicrophoneBorder";
import { ArenaProvider } from "./context/ArenaContext";
import { OnboardingModal } from "./components/OnboardingModal";
import { TutorialOverlay } from "./components/TutorialOverlay";

const queryClient = new QueryClient();

const ReminderWrapper = ({ children }: { children: React.ReactNode }) => {
  useEventReminders();
  return <>{children}</>;
};

const App = () => {
  const timerActive = useTimerActive();

  useEffect(() => {
    // Developer Utility: window.resetOnboarding()
    (window as any).resetOnboarding = () => {
      localStorage.removeItem("speakbold_onboarding_v2");
      localStorage.removeItem("speakbold_tutorial_pending");
      localStorage.removeItem("speakbold_pathway_selection");
      console.log("✅ SpeakBold Onboarding & Tutorial reset. Refreshing page...");
      window.location.reload();
    };
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ArenaProvider>
          <ThemeProvider defaultTheme="light" storageKey="speakbold-theme">
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <ReminderWrapper>
              <BrowserRouter>
                <div className="grain" />
              
              {/* Global Background Elements */}
              <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-float opacity-50" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-primary/3 rounded-full blur-[100px] animate-float opacity-30" style={{ animationDelay: '-5s' }} />
              </div>

              <div className={`${timerActive ? "pb-0" : "pb-24 lg:pb-0"} relative z-10`}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/pre-flight" element={<PreFlightChecklist />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/tracks/public-speaking" element={<PublicSpeaking />} />
                  <Route path="/tracks/impromptu" element={<Impromptu />} />
                  <Route path="/tracks/interviews" element={<Interviews />} />
                  <Route path="/tracks/body-language" element={<Navigate to="/pathway" replace />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/auth/callback" element={<Callback />} />
                  <Route path="/pitch" element={<PitchDeck />} />
                  <Route path="/report" element={<ProgressReport />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/pathway" element={<Pathway />} />
                  <Route path="/lab" element={<Lab />} />
                  <Route path="/arena" element={<Arena />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/events/new" element={<CreateEvent />} />
                  <Route path="/events/:id" element={<EventDetail />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
              {!timerActive && <MobileNav />}
              <MicrophoneBorder />
              <OnboardingModal />
              <TutorialOverlay />
            </BrowserRouter>
          </ReminderWrapper>
        </TooltipProvider>
      </ThemeProvider>
      </ArenaProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
};

export default App;
