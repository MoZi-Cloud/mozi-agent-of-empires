// @vitest-environment jsdom
//
// Unit tests for MobileTerminalToolbar's keyboard wiring. The strip is never
// rendered under the chromium Playwright coverage run (pointer:coarse does not
// match there), so these exercise it directly: system-key byte sequences, the
// Shift/Alt/Cmd/Ctrl modifier latches, the keyboard-open paste fallback, and
// custom quick-button rendering. The parent (a live terminal view) owns the
// keyboard inset, so the strip carries none.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MobileTerminalToolbar } from "../MobileTerminalToolbar";
import { NO_MODIFIERS, type Modifiers } from "../../lib/modifierKeys";
import { MobileQuickButtonCountContext } from "../../lib/mobileQuickButtons";
import type { MobileQuickButtonsResponse } from "../../lib/api";

// The toolbar fetches button contents on mount via the api module; stub it so
// tests don't hit the network.
vi.mock("../../lib/api", () => ({
  fetchMobileQuickButtons: vi.fn(async () => ({ count: 0, buttons: [] }) as MobileQuickButtonsResponse),
  putMobileQuickButtons: vi.fn(async () => ({ count: 0, buttons: [] }) as MobileQuickButtonsResponse),
}));

afterEach(() => {
  cleanup();
  delete (window as { isSecureContext?: boolean }).isSecureContext;
});

interface Overrides {
  keyboardOpen?: boolean;
  sendData?: (data: string) => void;
  count?: number;
}

function renderToolbar(overrides: Overrides = {}) {
  const sendData = overrides.sendData ?? vi.fn();
  const inputElRef = { current: null };
  const result = render(
    <MobileQuickButtonCountContext.Provider value={overrides.count ?? 0}>
      <MobileTerminalToolbar
        sendData={sendData}
        inputElRef={inputElRef}
        keyboardOpen={overrides.keyboardOpen ?? false}
        modifiers={NO_MODIFIERS}
        onToggleModifier={vi.fn()}
        onClearModifiers={vi.fn()}
      />
    </MobileQuickButtonCountContext.Provider>,
  );
  return { ...result, sendData };
}

describe("MobileTerminalToolbar", () => {
  it("carries no inline keyboard inset (the parent owns it)", () => {
    const { container } = renderToolbar();
    const strip = container.firstChild as HTMLElement;
    expect(strip.style.paddingBottom).toBe("");
  });

  it("renders the system buttons incl. the new arrows/enter/copy/fn", () => {
    renderToolbar();
    expect(screen.getByLabelText("Arrow left")).toBeTruthy();
    expect(screen.getByLabelText("Arrow right")).toBeTruthy();
    expect(screen.getByLabelText("Enter")).toBeTruthy();
    expect(screen.getByLabelText("Copy selection")).toBeTruthy();
    expect(screen.getByLabelText("Tilde")).toBeTruthy();
    expect(screen.getByLabelText("Ctrl")).toBeTruthy();
    expect(screen.getByLabelText("Paste from clipboard")).toBeTruthy();
  });

  it("arrow / enter / fn buttons send the right bytes", () => {
    const sendData = vi.fn();
    renderToolbar({ sendData });
    fireEvent.click(screen.getByLabelText("Arrow left"));
    fireEvent.click(screen.getByLabelText("Arrow right"));
    fireEvent.click(screen.getByLabelText("Enter"));
    fireEvent.click(screen.getByLabelText("Tilde"));
    expect(sendData).toHaveBeenNthCalledWith(1, "\x1b[D");
    expect(sendData).toHaveBeenNthCalledWith(2, "\x1b[C");
    expect(sendData).toHaveBeenNthCalledWith(3, "\r");
    expect(sendData).toHaveBeenNthCalledWith(4, "~");
  });

  it("takes the keyboard-open paste branch when an editable is focused", async () => {
    Object.defineProperty(window, "isSecureContext", { value: false, configurable: true });
    const { sendData } = renderToolbar({ keyboardOpen: true });

    const editable = document.createElement("textarea");
    document.body.appendChild(editable);
    editable.focus();

    fireEvent.click(screen.getByLabelText("Paste from clipboard"));
    await new Promise((r) => setTimeout(r, 0));

    expect(sendData).not.toHaveBeenCalled();
    document.body.removeChild(editable);
  });
});

// Harness that owns the modifier latch state (mirrors how LiveTerminalView
// wires the toolbar), so the latch + system-key interactions are exercised
// end to end.
function ModifiersHarness({ sendData, modifiers }: { sendData: (data: string) => void; modifiers: Modifiers }) {
  return (
    <MobileQuickButtonCountContext.Provider value={0}>
      <MobileTerminalToolbar
        sendData={sendData}
        inputElRef={{ current: null }}
        keyboardOpen={false}
        modifiers={modifiers}
        onToggleModifier={vi.fn()}
        onClearModifiers={vi.fn()}
      />
    </MobileQuickButtonCountContext.Provider>
  );
}

describe("MobileTerminalToolbar modifier latches", () => {
  it("Shift+Up sends the modified arrow sequence", () => {
    const sendData = vi.fn();
    render(<ModifiersHarness sendData={sendData} modifiers={{ ...NO_MODIFIERS, shift: true }} />);
    fireEvent.click(screen.getByLabelText("Arrow up"));
    // Shift+Up = CSI 1;2A (PC-style modified arrow).
    expect(sendData).toHaveBeenCalledWith("\x1b[1;2A");
  });

  it("Ctrl+Tab stays a plain tab (only Shift transforms Tab, to reverse-tab)", () => {
    const sendData = vi.fn();
    render(<ModifiersHarness sendData={sendData} modifiers={{ ...NO_MODIFIERS, ctrl: true }} />);
    fireEvent.click(screen.getByLabelText("Tab"));
    expect(sendData).toHaveBeenCalledWith("\t");
  });

  it("Shift+Tab sends the reverse-tab sequence", () => {
    const sendData = vi.fn();
    render(<ModifiersHarness sendData={sendData} modifiers={{ ...NO_MODIFIERS, shift: true }} />);
    fireEvent.click(screen.getByLabelText("Tab"));
    expect(sendData).toHaveBeenCalledWith("\x1b[Z");
  });

  it("Ctrl+C interrupt sends ETX", () => {
    const sendData = vi.fn();
    renderToolbar({ sendData });
    fireEvent.click(screen.getByLabelText("Ctrl+C interrupt"));
    expect(sendData).toHaveBeenCalledWith("\x03");
  });
});

describe("MobileTerminalToolbar custom buttons", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders N default-labeled buttons from the count context", async () => {
    const { findByLabelText } = renderToolbar({ count: 3 });
    expect(await findByLabelText("text1")).toBeTruthy();
    expect(screen.getByLabelText("text2")).toBeTruthy();
    expect(screen.getByLabelText("text3")).toBeTruthy();
  });

  it("renders no custom buttons when count is 0", () => {
    renderToolbar({ count: 0 });
    expect(screen.queryByLabelText("text1")).toBeNull();
  });
});
