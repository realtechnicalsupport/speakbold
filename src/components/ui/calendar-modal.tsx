import { useState } from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface CalendarModalProps {
  value: string;
  onChange: (value: string) => void;
  minDate?: Date;
}

export function CalendarModal({ value, onChange, minDate }: CalendarModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  const [viewYear, setViewYear] = useState(value ? new Date(value + "T00:00:00").getFullYear() : currentYear);
  const [viewMonth, setViewMonth] = useState(value ? new Date(value + "T00:00:00").getMonth() : currentMonth);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const selectedDate = value ? new Date(value + "T00:00:00") : null;

  const isDateDisabled = (day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    if (minDate && date < minDate) return true;
    return false;
  };

  const selectDate = (day: number) => {
    const newDate = new Date(viewYear, viewMonth, day);
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(newDate.getDate()).padStart(2, '0');
    onChange(`${year}-${month}-${dayStr}`);
    setIsOpen(false);
  };

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="w-full justify-start text-left font-normal h-12 px-4"
      >
        <CalendarIcon className="mr-3 h-5 w-5 text-muted-foreground" />
        {value ? new Date(value + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Select date"}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <button onClick={goPrevMonth} className="p-2 hover:bg-muted rounded-lg transition-colors">←</button>
              <span className="font-semibold">{monthNames[viewMonth]} {viewYear}</span>
              <button onClick={goNextMonth} className="p-2 hover:bg-muted rounded-lg transition-colors">→</button>
            </div>
            
            {/* Days header */}
            <div className="grid grid-cols-7 gap-1 p-3 text-center text-xs text-muted-foreground">
              {dayNames.map(d => <div key={d}>{d}</div>)}
            </div>
            
            {/* Days */}
            <div className="grid grid-cols-7 gap-1 p-3 pt-0">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isDisabled = isDateDisabled(day);
                const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === viewMonth && selectedDate?.getFullYear() === viewYear;
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => selectDate(day)}
                    className={cn(
                      "p-2 rounded-lg text-sm transition-colors",
                      isDisabled && "text-muted-foreground/50 cursor-not-allowed",
                      !isDisabled && "hover:bg-muted",
                      isSelected && "bg-primary text-primary-foreground hover:bg-primary"
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border flex justify-end">
              <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
