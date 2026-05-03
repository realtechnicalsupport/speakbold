import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import { MobileNav } from "./components/MobileNav";
import NotFound from "./pages/NotFound.tsx";
import PreFlightChecklist from "./pages/PreFlightChecklist.tsx";
import Profile from "./pages/Profile.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import PublicSpeaking from "./pages/tracks/PublicSpeaking.tsx";
import Impromptu from "./pages/tracks/Impromptu.tsx";
import Interviews from "./pages/tracks/Interviews.tsx";
import BodyLanguage from "./pages/tracks/BodyLanguage.tsx";
import PitchDeck from "./pages/PitchDeck.tsx";
import Login from "./pages/Login.tsx";
import Callback from "./pages/auth/callback";
import Events from "./pages/Events.tsx";
import CreateEvent from "./pages/CreateEvent.tsx";
import EventDetail from "./pages/EventDetail.tsx";
import Leaderboard from "./pages/Leaderboard.tsx";
import { useEventReminders } from "./hooks/useEventReminders";
import { AuthProvider } from "./context/AuthContext";
import { useTimerActive } from "./lib/timerState";
import { MicrophoneBorder } from "./components/MicrophoneBorder";

const queryClient = new QueryClient();

const ReminderWrapper = ({ children }: { children: React.ReactNode }) => {
  useEventReminders();
  return <>{children}</>;
};

const App = () => {
  const timerActive = useTimerActive();
  
  return (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ReminderWrapper>
          <BrowserRouter>
            <div className={`${timerActive ? "pb-0" : "pb-16 lg:pb-0"}`}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/pre-flight" element={<PreFlightChecklist />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/tracks/public-speaking" element={<PublicSpeaking />} />
                <Route path="/tracks/impromptu" element={<Impromptu />} />
                <Route path="/tracks/interviews" element={<Interviews />} />
                <Route path="/tracks/body-language" element={<BodyLanguage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/auth/callback" element={<Callback />} />
                <Route path="/pitch" element={<PitchDeck />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/events" element={<Events />} />
                <Route path="/events/new" element={<CreateEvent />} />
                <Route path="/events/:id" element={<EventDetail />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            {!timerActive && <MobileNav />}
            <MicrophoneBorder />
          </BrowserRouter>
        </ReminderWrapper>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
};

export default App;
