import { useRef, useState, forwardRef, type ButtonHTMLAttributes, type MouseEvent } from "react";

interface SpamButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Cooldown (ms) before the button can fire again after a click. Default 1200. */
  cooldownMs?: number;
}

/**
 * A drop-in `<button>` that is spam-proof. The first click fires `onClick`,
 * then the button locks — ignoring every further click — for `cooldownMs`.
 * This stops double-forfeits, double ready-ups, double phase-advances, and
 * duplicate result/navigation actions in fast-tap or laggy PvP duels, where a
 * second click can fire a second realtime broadcast or move ELO twice.
 *
 * Any externally-passed `disabled` is respected and merged with the internal
 * lock, so validation gating (e.g. `disabled={!prompt.trim()}`) still works.
 * Only swap ACTION buttons to this — leave toggles (FOR/AGAINST, show/hide,
 * mute) as plain buttons, since those are meant to be clicked repeatedly.
 */
export const SpamButton = forwardRef<HTMLButtonElement, SpamButtonProps>(
  function SpamButton({ onClick, cooldownMs = 1200, disabled, ...rest }, ref) {
    const lockedRef = useRef(false);
    const [locked, setLocked] = useState(false);

    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
      // Ref guard catches the rapid double-fire before React re-renders with
      // `disabled`; the disabled attribute is the belt-and-braces backstop.
      if (lockedRef.current) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      lockedRef.current = true;
      setLocked(true);
      window.setTimeout(() => {
        lockedRef.current = false;
        setLocked(false);
      }, cooldownMs);
      onClick?.(e);
    };

    return <button ref={ref} disabled={disabled || locked} onClick={handleClick} {...rest} />;
  }
);
