import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Mic, LogOut, User, Trophy, ShieldCheck, Zap, Swords, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "./ThemeToggle";
import { useArena } from "@/hooks/useArena";
import { FriendsBadge } from "./FriendsBadge";

const NAV = [
  { to: "/pathway", label: "Pathway" },
  { to: "/lab", label: "The Lab" },
  { to: "/arena", label: "Practice Lounge" },
];

export const SiteHeader = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <>
    <DuelRequestNotification />
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 inset-x-0 z-50 glass border-b border-border/60"
      id="site-navigation"
    >
      <div className="container flex items-center justify-between py-3 lg:py-6">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="h-8 w-8 lg:h-10 lg:w-10 rounded-full bg-primary flex items-center justify-center shadow-glow transition-transform group-hover:scale-110">
            <Mic className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-white" />
          </div>
          <span className="speak-serif text-2xl lg:text-3xl font-bold tracking-tighter">
            Speak<span className="text-primary italic">Bold</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-12">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              id={n.to === "/arena" ? "nav-arena" : (n.to === "/lab" ? "nav-lab" : undefined)}
              className={({ isActive }) =>
                cn(
                  "text-sm font-black uppercase tracking-[0.4em] transition-all duration-500 relative py-2",
                  isActive 
                    ? "text-primary opacity-100" 
                    : "opacity-30 hover:opacity-100 hover:text-primary"
                )
              }
            >
              {n.label}
              {pathname === n.to && (
                <motion.div 
                  layoutId="nav-underline"
                  className="absolute -bottom-1 left-0 right-0 h-[2px] bg-primary shadow-glow shadow-primary/40 rounded-full"
                />
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3 lg:gap-8">
          {/* Leaderboard trophy: hide on mobile (use MobileNav), show on tablet+ */}
          <div className="hidden lg:flex items-center gap-6 pr-6 border-r border-border/60">
            <ThemeToggle />
            <FriendsBadge />
            <Link to="/leaderboard" id="nav-leaderboard" className={cn(
              "transition-all duration-500",
              pathname === "/leaderboard" ? "text-primary" : "opacity-30 hover:opacity-100"
            )}>
              <Trophy className="h-5 w-5" strokeWidth={2} />
            </Link>
          </div>

          <div className="flex items-center gap-3 lg:gap-6">
            {user ? (
              <div className="flex items-center gap-3 lg:gap-6">
                {/* Profile icon: hide on mobile (in MobileNav), show on tablet+ */}
                <Link to="/profile" id="nav-profile" className="hidden lg:flex items-center gap-4 group">
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-700",
                    pathname === "/profile" ? "bg-primary text-white shadow-glow" : "bg-primary/5 border border-primary/20 text-primary group-hover:bg-primary group-hover:text-white"
                  )}>
                    <User className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div className="hidden xl:flex flex-col">
                    <span className="text-xs font-semibold opacity-40">Signed in as</span>
                    <span className="text-sm font-semibold">{user.email?.split("@")[0]}</span>
                  </div>
                </Link>
                <button
                  onClick={handleSignOut}
                  aria-label="Sign out"
                  className="p-2 -m-2 opacity-40 hover:opacity-100 hover:text-destructive transition-all"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="text-xs lg:text-sm font-semibold bg-primary text-white px-5 py-2 lg:px-8 lg:py-3 rounded-full shadow-glow"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.header>
    </>
  );
};

const DuelRequestNotification = () => {
  const { incomingRequests, setIncomingRequests, acceptDuelRequest } = useArena();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Don't show notifications if we are already on the arena page (it has its own UI)
  if (pathname === "/arena" || incomingRequests.length === 0) return null;

  const currentRequest = incomingRequests[0];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed top-20 right-3 left-3 sm:left-auto sm:w-80 z-[100] glass border border-primary/20 rounded-2xl p-4 shadow-glow shadow-primary/10 overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Swords className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-grow">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">PRACTICE REQUEST</p>
            <p className="text-sm font-bold leading-tight mb-3">
              <span className="text-primary">{currentRequest.senderName}</span> has invited you to a practice session!
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  acceptDuelRequest(currentRequest);
                  navigate("/arena", { state: { acceptRequest: currentRequest } });
                }}
                className="flex-grow py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:scale-105 active:scale-95 transition-all"
              >
                ACCEPT
              </button>
              <button
                onClick={() => setIncomingRequests(prev => prev.filter(r => r.id !== currentRequest.id))}
                className="p-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                <X className="h-3 w-3 opacity-40" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

