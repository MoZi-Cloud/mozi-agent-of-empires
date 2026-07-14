import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

// Long-press threshold for opening a custom button's edit sheet. Below this,
// a press releases as a tap (sends the button's text); at/above it, the edit
// sheet opens instead. 2s matches the mobile copy/paste affordance cadence
// and avoids firing during a normal tap-and-hold scroll.
const DEFAULT_MS = 2000;

// Press-and-hold to edit (long-press opens a sheet); short release taps.
// Unlike `useLongPressDrag` (which repeats an arrow key), this fires at most
// once per press: either `onLongPress` (held past `ms`) or `onTap` (released
// before). A pointercancel (e.g. scroll steals the gesture) suppresses both.
export function useLongPressEdit(opts: { onTap: () => void; onLongPress: () => void; ms?: number }) {
  const { onTap, onLongPress, ms = DEFAULT_MS } = opts;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFired = useRef(false);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => clear, [clear]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      // Only react to the primary pointer so a second finger doesn't arm a tap.
      if (e.isPrimary === false) return;
      longFired.current = false;
      clear();
      timer.current = setTimeout(() => {
        longFired.current = true;
        navigator.vibrate?.(15);
        onLongPress();
      }, ms);
    },
    [clear, ms, onLongPress],
  );

  const onPointerUp = useCallback(() => {
    clear();
    if (!longFired.current) onTap();
  }, [clear, onTap]);

  const onPointerCancel = useCallback(() => {
    clear();
    longFired.current = true; // suppress a stray tap after a cancelled gesture
  }, [clear]);

  // Leaving the button cancels the pending long-press but still allows the
  // release to tap (a finger wiggle shouldn't kill a tap). pointerup is what
  // resolves the gesture.
  const onPointerLeave = useCallback(() => clear, [clear]);

  // Suppress the browser's native long-press menu / text-selection callout so
  // it doesn't steal the gesture or show system UI over the edit sheet.
  const onContextMenu = useCallback((e: React.MouseEvent) => e.preventDefault(), []);

  return { onPointerDown, onPointerUp, onPointerCancel, onPointerLeave, onContextMenu };
}
