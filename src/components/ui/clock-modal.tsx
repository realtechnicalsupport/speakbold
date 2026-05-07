import { useState } from "react";
import { Clock, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "./button";

interface ClockModalProps {
  value: string;
  onChange: (value: string) => void;
}

export function ClockModal({ value, onChange }: ClockModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const [hour, setHour] = useState(() => {
    if (!value) return 9;
    return parseInt(value.split(":")[0]) || 9;
  });
  const [minute, setMinute] = useState(() => {
    if (!value) return 0;
    return parseInt(value.split(":")[1]) || 0;
  });

  const handleConfirm = () => {
    onChange(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    setIsOpen(false);
  };

  const formatTime = (h: number, m: number) => {
    const period = h >= 12 ? "PM" : "AM";
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayHour}:${String(m).padStart(2, "0")} ${period}`;
  };

  const incrementHour = () => setHour((prev) => (prev + 1) % 24);
  const decrementHour = () => setHour((prev) => (prev - 1 + 24) % 24);
  const incrementMinute = () => setMinute((prev) => (prev + 1) % 60);
  const decrementMinute = () => setMinute((prev) => (prev - 1 + 60) % 60);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="w-full justify-start text-left font-normal h-12 px-4"
      >
        <Clock className="mr-3 h-5 w-5 text-muted-foreground" />
        {value ? formatTime(parseInt(value.split(":")[0]) || 0, parseInt(value.split(":")[1]) || 0) : "Select time"}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-xs mx-4 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-border text-center">
              <span className="font-semibold text-lg flex items-center justify-center gap-2">
                <Clock className="h-5 w-5" /> Set time
              </span>
            </div>
            
            {/* Clock Display */}
            <div className="p-6">
              <div className="flex items-center justify-center gap-4">
                {/* Hour */}
                <div className="flex flex-col items-center">
                  <button type="button" onClick={incrementHour} className="p-2 hover:bg-muted rounded-lg transition-colors">
                    <ChevronUp className="h-6 w-6" />
                  </button>
                  <div className="text-5xl font-bold tabular-nums my-2 w-20 text-center">
                    {String(hour).padStart(2, "0")}
                  </div>
                  <button type="button" onClick={decrementHour} className="p-2 hover:bg-muted rounded-lg transition-colors">
                    <ChevronDown className="h-6 w-6" />
                  </button>
                  <span className="text-xs text-muted-foreground mt-1">Hour</span>
                </div>

                <span className="text-4xl font-bold text-muted-foreground mb-8">:</span>

                {/* Minute */}
                <div className="flex flex-col items-center">
                  <button type="button" onClick={incrementMinute} className="p-2 hover:bg-muted rounded-lg transition-colors">
                    <ChevronUp className="h-6 w-6" />
                  </button>
                  <div className="text-5xl font-bold tabular-nums my-2 w-20 text-center">
                    {String(minute).padStart(2, "0")}
                  </div>
                  <button type="button" onClick={decrementMinute} className="p-2 hover:bg-muted rounded-lg transition-colors">
                    <ChevronDown className="h-6 w-6" />
                  </button>
                  <span className="text-xs text-muted-foreground mt-1">Min</span>
                </div>
              </div>

              {/* Quick presets */}
              <div className="flex justify-center gap-2 mt-4">
                {[9, 12, 18].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => { setHour(h); setMinute(0); }}
                    className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                  >
                    {h === 9 ? "9 AM" : h === 12 ? "12 PM" : "6 PM"}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border flex justify-between gap-2">
              <Button variant="ghost" onClick={() => setIsOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleConfirm} className="flex-1">
                Set {formatTime(hour, minute)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
