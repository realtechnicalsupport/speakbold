import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Sparkles, Navigation } from "lucide-react";
import { useChat } from "@/context/ChatContext";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTimerActive } from "@/lib/timerState";

// Session flag so dismissing the FAB hides it until the next tab open. We use
// sessionStorage (not localStorage) so the coach reappears next session — the
// dismissal is "leave me alone for now," not "hide forever."
const FAB_DISMISSED_KEY = "speakbold-coach-fab-dismissed";

export const AICoachChat = () => {
  const { user } = useAuth();
  const { isOpen, setIsOpen, messages, sendMessage, isLoading } = useChat();
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  // Hide the FAB during timed drills — same signal MobileNav uses. Coach
  // popping over a live recording panel is purely distracting.
  const timerActive = useTimerActive();
  // Per-session dismiss flag (the small "x" on the FAB)
  const [fabDismissed, setFabDismissed] = useState(() => {
    try { return sessionStorage.getItem(FAB_DISMISSED_KEY) === "1"; } catch { return false; }
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isLoading]);

  if (!user) return null;
  // FAB is suppressed if: timer is active, user dismissed it, or chat window
  // is already open. The chat window itself stays available — only the
  // floating trigger is hidden.
  const fabHidden = timerActive || fabDismissed || isOpen;

  const dismissFab = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFabDismissed(true);
    try { sessionStorage.setItem(FAB_DISMISSED_KEY, "1"); } catch { /* private mode */ }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    sendMessage(inputText);
    setInputText("");
  };

  return (
    <>
      {/* Floating Action Button — full version (timer + dismiss-aware) */}
      <AnimatePresence>
        {!fabHidden && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            // Sit above the mobile nav pill (env(safe-area-inset-bottom) + pill
            // height ≈ 1.5rem + 4rem). Previous `bottom-24` (6rem) collided with
            // the pill on devices with home-indicator insets. On lg+ desktops
            // there is no MobileNav so we keep the original `bottom-8` spacing.
            className="fixed right-6 z-50 bottom-[calc(env(safe-area-inset-bottom,0px)+6.5rem)] lg:bottom-8"
          >
            <button
              onClick={() => setIsOpen(true)}
              id="coach-chat-trigger"
              className="relative h-14 w-14 rounded-full bg-primary text-white shadow-glow flex items-center justify-center hover:scale-110 active:scale-95 transition-all group border-2 border-primary/50"
              aria-label="Open AI Coach"
            >
              <div className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-0 group-hover:opacity-100" />
              <Sparkles className="h-6 w-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:animate-spin-slow transition-opacity" />
              <MessageCircle className="h-6 w-6 transition-opacity group-hover:opacity-0" />
            </button>
            {/* Tiny dismiss handle — minimises to the ghost re-show pill below.
                Crucially this does NOT make the coach unreachable: the ghost
                still gives users a way back. Without it, dismissing once would
                kill chat access for the whole session. */}
            <button
              onClick={dismissFab}
              aria-label="Hide AI Coach for this session"
              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-background border border-border text-foreground/60 flex items-center justify-center hover:text-foreground hover:scale-110 transition-all"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ghost re-show pill — visible ONLY when the user explicitly dismissed
          the FAB. Lower contrast, smaller footprint, but still tappable so the
          coach is never permanently unreachable within a session. Click both
          un-dismisses AND opens the chat in a single action. Hidden during
          timed drills so it doesn't compete with the drill UI. */}
      <AnimatePresence>
        {fabDismissed && !isOpen && !timerActive && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.55 }}
            whileHover={{ opacity: 1, scale: 1.05 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => {
              setFabDismissed(false);
              try { sessionStorage.removeItem(FAB_DISMISSED_KEY); } catch { /* private mode */ }
              setIsOpen(true);
            }}
            aria-label="Show AI Coach"
            className="fixed right-3 z-50 h-7 w-7 rounded-full bg-muted/80 backdrop-blur-sm border border-border text-foreground/70 flex items-center justify-center hover:text-primary transition-colors bottom-[calc(env(safe-area-inset-bottom,0px)+7rem)] lg:bottom-10"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-0 right-0 lg:bottom-8 lg:right-8 z-[100] w-full lg:w-[400px] h-[85vh] lg:h-[600px] flex flex-col glass border border-primary/20 rounded-t-[2rem] lg:rounded-[2rem] shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-border/50 flex items-center justify-between bg-primary/5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shadow-glow">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary">SpeakBold AI</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Personal Coach</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full hover:bg-muted text-foreground/50 hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-50">
                  <MessageCircle className="h-12 w-12 mb-4 text-primary opacity-50" />
                  <p className="text-sm font-black uppercase tracking-widest">How can I help you improve today?</p>
                  <p className="text-[11px] mt-2 italic">Ask about public speaking techniques or ask me to take you to a specific page.</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <motion.div
                    key={msg.id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex w-full",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div className="flex flex-col gap-2 max-w-[85%]">
                      <div
                        className={cn(
                          "rounded-2xl p-4 text-sm leading-relaxed shadow-sm",
                          msg.role === "user"
                            ? "bg-primary text-white rounded-tr-sm"
                            : "bg-muted/50 border border-border rounded-tl-sm speak-serif italic text-foreground/90"
                        )}
                      >
                        {msg.content}
                      </div>
                      
                      {msg.navigate_to && (
                        <motion.button
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => {
                            navigate(msg.navigate_to!);
                            setIsOpen(false);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl text-primary text-xs font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all w-fit group"
                        >
                          <Navigation className="h-3 w-3 group-hover:rotate-12 transition-transform" />
                          Take Me There
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}

              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-muted/50 border border-border rounded-2xl rounded-tl-sm p-4 flex items-center gap-2 text-primary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-widest">THINKING...</span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-4 bg-background border-t border-border/50">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask for advice or say 'Take me to the Arena'..."
                  disabled={isLoading}
                  className="w-full bg-muted/30 border border-border rounded-full pl-6 pr-14 py-4 text-sm focus:border-primary focus:outline-none transition-colors disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className="absolute right-2 h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-50 disabled:bg-muted disabled:text-foreground/40 hover:scale-105 active:scale-95 transition-all shadow-glow"
                >
                  <Send className="h-4 w-4 ml-0.5" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
