import { describe, it, expect } from "vitest";
import { parseDisableMouseForwarding } from "./disableMouseForwarding";

describe("parseDisableMouseForwarding", () => {
  it("reads the boolean from settings.web.disable_mouse_forwarding", () => {
    expect(parseDisableMouseForwarding({ web: { disable_mouse_forwarding: true } })).toBe(true);
    expect(parseDisableMouseForwarding({ web: { disable_mouse_forwarding: false } })).toBe(false);
  });

  it("defaults to false when the flag is missing", () => {
    expect(parseDisableMouseForwarding({ web: {} })).toBe(false);
    expect(parseDisableMouseForwarding({})).toBe(false);
    expect(parseDisableMouseForwarding(null)).toBe(false);
    expect(parseDisableMouseForwarding(undefined)).toBe(false);
  });

  it("coerces non-boolean truthy values and ignores malformed payloads", () => {
    expect(parseDisableMouseForwarding({ web: { disable_mouse_forwarding: 1 } })).toBe(true);
    expect(parseDisableMouseForwarding({ web: { disable_mouse_forwarding: "no" } })).toBe(true);
    expect(parseDisableMouseForwarding({ web: { disable_mouse_forwarding: 0 } })).toBe(false);
    expect(parseDisableMouseForwarding({ web: "not-an-object" })).toBe(false);
  });
});
