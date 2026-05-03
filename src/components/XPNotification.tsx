import { useEffect, useState } from "react";
import { Zap } from "lucide-react";

interface XPNotificationProps {
  xpAmount: number;
  isVisible: boolean;
  onComplete?: () => void;
}

export function XPNotification({ xpAmount, isVisible, onComplete }: XPNotificationProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setAnimate(true);
      const timer = setTimeout(() => {
        setAnimate(false);
        onComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed bottom-24 right-4 pointer-events-none transition-all duration-500 ${
        animate
          ? "translate-y-0 opacity-100"
          : "translate-y-full opacity-0"
      }`}
    >
      <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 font-semibold">
        <Zap className="w-5 h-5 fill-current" />
        <span>+{xpAmount} XP</span>
      </div>
    </div>
  );
}
