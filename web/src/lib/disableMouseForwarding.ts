import { createContext, useContext } from "react";

// Default when the setting is missing/invalid: forward mouse events to a
// mouse-reporting app as normal (the historical behavior).
export const DisableMouseForwardingContext = createContext(false);

/** Read the web terminal's "Disable mouse forwarding" flag from a `/api/settings`
 * payload. Missing/non-boolean values fall back to false. */
export function parseDisableMouseForwarding(settings: Record<string, unknown> | null | undefined): boolean {
  const web = settings?.web;
  if (!web || typeof web !== "object") return false;
  return Boolean((web as Record<string, unknown>).disable_mouse_forwarding);
}

export function useDisableMouseForwarding(): boolean {
  return useContext(DisableMouseForwardingContext);
}
