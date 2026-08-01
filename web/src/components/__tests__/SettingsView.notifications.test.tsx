// @vitest-environment jsdom
//
// Behavioral coverage for the Notifications tab's `web` SchemaSection and the
// app-shell live-refresh hook. `web.mobile_quick_button_count` and
// `web.disable_mouse_forwarding` feed React contexts that App.tsx parses once
// at mount (MobileQuickButtonCountContext / DisableMouseForwardingContext), so
// saving either must trigger `onSettingsRefresh` or the terminal toolbar /
// mouse-forwarding policy won't update without a manual page reload. Other web
// fields (e.g. the notify_on_* toggles) don't feed the app shell and must NOT
// trigger a refresh.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SettingsView } from "../SettingsView";
import * as api from "../../lib/api";

const PROFILES = [{ name: "main", is_default: true }];

// Schema-driven (#1692): the web section's mobile_quick_button_count is a
// number field (global_only -> profile_overridable: false) and notify_on_idle
// is a toggle. Both save through the profile-settings path.
const WEB_SCHEMA = [
  {
    section: "web",
    field: "mobile_quick_button_count",
    category: "Web",
    label: "Mobile quick buttons",
    description: "",
    widget: { kind: "number", min: 0, max: 28 },
    web_write: { policy: "allow" },
    profile_overridable: false,
    validation: { rule: "none" },
    advanced: false,
  },
  {
    section: "web",
    field: "notify_on_idle",
    category: "Web",
    label: "Notify on idle",
    description: "",
    widget: { kind: "toggle" },
    web_write: { policy: "allow" },
    profile_overridable: false,
    validation: { rule: "none" },
    advanced: false,
  },
];

vi.mock("../../lib/api", () => ({
  fetchProfiles: vi.fn(() => Promise.resolve(PROFILES)),
  fetchPlugins: vi.fn(() => Promise.resolve(null)),
  fetchSettings: vi.fn(() => Promise.resolve({ web: {} })),
  getSettingsSchema: vi.fn(() => Promise.resolve(WEB_SCHEMA)),
  updateProfileSettings: vi.fn(() => Promise.resolve(true)),
  setDefaultProfile: vi.fn(() => Promise.resolve(true)),
  createProfile: vi.fn(() => Promise.resolve(true)),
  renameProfile: vi.fn(() => Promise.resolve(true)),
  deleteProfile: vi.fn(() => Promise.resolve(true)),
}));

function numberInputByLabel(container: HTMLElement, label: string): HTMLInputElement {
  const labels = Array.from(container.querySelectorAll("label"));
  const match = labels.find((l) => l.textContent === label);
  const input = match?.parentElement?.querySelector('input[type="number"]');
  expect(input).toBeTruthy();
  return input as HTMLInputElement;
}

function commit(input: HTMLInputElement, value: string) {
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}

describe("Notifications tab web section app-shell refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchSettings).mockResolvedValue({ web: { mobile_quick_button_count: 4 } } as never);
  });

  it("refreshes app-level settings after saving web.mobile_quick_button_count", async () => {
    const onSettingsRefresh = vi.fn();
    const { container } = render(
      <SettingsView
        onClose={() => {}}
        tab="notifications"
        onSelectTab={() => {}}
        onServerAboutRefresh={() => {}}
        onSettingsRefresh={onSettingsRefresh}
      />,
    );
    await screen.findByText("Mobile quick buttons");

    await waitFor(() => expect(numberInputByLabel(container, "Mobile quick buttons").value).toBe("4"));
    commit(numberInputByLabel(container, "Mobile quick buttons"), "9");

    await waitFor(() =>
      expect(api.updateProfileSettings).toHaveBeenCalledWith("main", {
        web: { mobile_quick_button_count: 9 },
      }),
    );
    expect(onSettingsRefresh).toHaveBeenCalledTimes(1);
  });

  it("does not refresh app settings for a non-app-shell web field", async () => {
    const onSettingsRefresh = vi.fn();
    const { container } = render(
      <SettingsView
        onClose={() => {}}
        tab="notifications"
        onSelectTab={() => {}}
        onServerAboutRefresh={() => {}}
        onSettingsRefresh={onSettingsRefresh}
      />,
    );
    await screen.findByText("Notify on idle");

    const toggle = container.querySelector("button[role=switch]") as HTMLButtonElement;
    expect(toggle).toBeTruthy();
    fireEvent.click(toggle);

    await waitFor(() =>
      expect(api.updateProfileSettings).toHaveBeenCalledWith("main", {
        web: { notify_on_idle: true },
      }),
    );
    expect(onSettingsRefresh).not.toHaveBeenCalled();
  });
});
