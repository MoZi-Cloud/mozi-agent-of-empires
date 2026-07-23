import { useCallback, useEffect, useState } from "react";
import { fetchMobileQuickButtons, putMobileQuickButtons, type MobileQuickButton } from "../lib/api";

// An unset button: empty label falls back to `text{n}` in the toolbar; empty
// text sends nothing; auto-enter off. The server only stores buttons the user
// has customized, so missing indices resolve to this default at render time.
const defaultButton = (): MobileQuickButton => ({ label: "", text: "", auto_enter: false });

export interface UseMobileQuickButtons {
  /** Resolved button list, always exactly `count` long (padded with defaults). */
  buttons: MobileQuickButton[];
  loading: boolean;
  error: boolean;
  /** Patch one button, optimistically update, and PUT the full array. The
   * server re-syncs the count setting to the array length. Returns false on
   * failure (state is reverted). */
  updateButton: (index: number, patch: Partial<MobileQuickButton>) => Promise<boolean>;
}

/** Fetch the synced custom quick-button contents and expose an optimistic
 * per-button editor. `count` is the schema-driven button count; the hook pads
 * the stored array up to that length so the toolbar always renders N buttons. */
export function useMobileQuickButtons(count: number): UseMobileQuickButtons {
  const [stored, setStored] = useState<MobileQuickButton[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchMobileQuickButtons().then((res) => {
      if (cancelled) return;
      if (res) {
        setStored(res.buttons);
        setError(false);
      } else {
        setError(true);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const safeCount = Math.max(0, count);
  const buttons = Array.from({ length: safeCount }, (_, i) => stored[i] ?? defaultButton());

  const updateButton = useCallback(
    async (index: number, patch: Partial<MobileQuickButton>): Promise<boolean> => {
      if (index < 0 || index >= buttons.length) return false;
      const next = buttons.map((b, i) => (i === index ? { ...b, ...patch } : b));
      const prev = stored;
      setStored(next); // optimistic
      const res = await putMobileQuickButtons(next);
      if (res) {
        setStored(res.buttons);
        return true;
      }
      setStored(prev); // revert on failure
      return false;
    },
    [buttons, stored],
  );

  return { buttons, loading, error, updateButton };
}
