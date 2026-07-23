import { createContext, useContext } from "react";

// Default quick-button count when the setting is missing/invalid. 0 hides the
// custom button rows (only the fixed system keys + Fn render).
const DEFAULT_MOBILE_QUICK_BUTTON_COUNT = 0;

// Server caps the count at 28 (the `#[setting(max = 28)]` on
// `web.mobile_quick_button_count`). Clamp here too so a malformed payload can
// never ask the toolbar to render hundreds of buttons.
export const MAX_MOBILE_QUICK_BUTTON_COUNT = 28;

export const MobileQuickButtonCountContext = createContext<number>(DEFAULT_MOBILE_QUICK_BUTTON_COUNT);

/** Read the mobile toolbar quick-button count from `/api/settings` payloads.
 * Missing, non-numeric, or out-of-range values fall back to 0 (no custom
 * buttons). */
export function parseMobileQuickButtonCount(settings: Record<string, unknown> | null | undefined): number {
  const web = settings?.web;
  if (!web || typeof web !== "object") {
    return DEFAULT_MOBILE_QUICK_BUTTON_COUNT;
  }
  const raw = (web as Record<string, unknown>).mobile_quick_button_count;
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) {
    return DEFAULT_MOBILE_QUICK_BUTTON_COUNT;
  }
  return Math.min(Math.floor(raw), MAX_MOBILE_QUICK_BUTTON_COUNT);
}

export function useMobileQuickButtonCount(): number {
  return useContext(MobileQuickButtonCountContext);
}
