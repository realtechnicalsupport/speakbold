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
import { ChatProvider } from "./context/ChatContext";
import { OnboardingModal } from "./components/OnboardingModal";
import { TutorialOverlay } from "./components/TutorialOverlay";
import { AICoachChat } from "./components/AICoachChat";

const queryClient = new QueryClient();

const ReminderWrapper = ({ children }: { children: React.ReactNode }) => {
  useEventReminders();
  return <>{children}</>;
};

const App = () => {
  const timerActive = useTimerActive();

  useEffect(() => {
    // Console commands moved to TutorialOverlay to access Auth context
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ArenaProvider>
          <ThemeProvider defaultTheme="dark" storageKey="speakbold-theme">
            <TooltipProvider>
              <Toaster />
            <Sonner />
            <ReminderWrapper>
              <BrowserRouter>
                <ChatProvider>
              
              {/* Global Background Elements */}
              <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                {/* Base Grid */}
                <div className="absolute inset-0 bg-grid opacity-[0.4]" />
                
                {/* Dynamic Blobs */}
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[140px] animate-float opacity-40 mix-blend-screen" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-float opacity-30 mix-blend-screen" style={{ animationDelay: '-5s' }} />
                <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-blue-500/5 rounded-full blur-[80px] animate-pulse-subtle opacity-20" />
                
                {/* Decorative Lines */}
                <div className="absolute top-0 left-1/4 w-px h-screen bg-gradient-to-b from-transparent via-border/20 to-transparent" />
                <div className="absolute top-0 right-1/4 w-px h-screen bg-gradient-to-b from-transparent via-border/20 to-transparent" />
                
                {/* Desktop-only floating glass accents */}
                <div className="hidden lg:block absolute top-[15%] left-[5%] w-32 h-32 border border-white/5 rounded-3xl bg-white/5 backdrop-blur-3xl animate-float opacity-20 rotate-12" />
                <div className="hidden lg:block absolute bottom-[20%] right-[8%] w-48 h-48 border border-white/5 rounded-[3rem] bg-white/5 backdrop-blur-2xl animate-float opacity-10 -rotate-12" style={{ animationDelay: '-3s' }} />
                
                {/* Global Scanlines */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] z-[100] pointer-events-none bg-[length:100%_4px,3px_100%] opacity-[0.03] dark:opacity-[0.07]" />
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
              <AICoachChat />
              </ChatProvider>
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
