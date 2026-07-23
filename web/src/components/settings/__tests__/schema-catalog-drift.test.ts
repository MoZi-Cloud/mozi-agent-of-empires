// @vitest-environment jsdom
//
// Drift guard for the zh schema catalog. The catalog is a hand-maintained
// frontend overlay keyed by `${section}.${field}`; when a Rust `#[setting]`
// field is added or a section appears, this catches a missing translation or a
// wiped catalog before it ships silently (fields without an entry fall back to
// English, which is safe but looks unpolished). It cannot list every field
// authoritatively (that lives in the backend schema served over the API), so it
// asserts section coverage, a minimum field count, key shape, and category
// completeness instead.
import { describe, expect, it } from "vitest";
import { categories, schema } from "../../../locales/zh/schema";

// Every core `#[setting_section]` must have at least one translated field.
const EXPECTED_SECTIONS = [
  "logging",
  "acp",
  "session",
  "diff",
  "web",
  "auth",
  "theme",
  "updates",
  "telemetry",
  "worktree",
  "sandbox",
  "tmux",
  "sound",
  "status_hooks",
];

const EXPECTED_CATEGORIES = [
  "Acp",
  "Web",
  "Diff",
  "Logging",
  "Sandbox",
  "Session",
  "Sound",
  "Status Hooks",
  "Telemetry",
  "Theme",
  "Tmux",
  "Updates",
  "Worktree",
];

describe("zh schema catalog (drift guard)", () => {
  it("covers every known core section", () => {
    const present = new Set(Object.keys(schema.fields).map((k) => k.split(".")[0]));
    for (const s of EXPECTED_SECTIONS) {
      expect(present.has(s), `missing zh entries for section "${s}"`).toBe(true);
    }
  });

  it("keeps a substantial field count (guards against an accidental catalog wipe)", () => {
    expect(Object.keys(schema.fields).length).toBeGreaterThanOrEqual(110);
  });

  it("uses a stable `${section}.${field}` key shape for every entry", () => {
    for (const key of Object.keys(schema.fields)) {
      expect(/^[a-z_]+\.[a-z_]+$/.test(key), `bad key shape: ${key}`).toBe(true);
    }
  });

  it("translates every known category badge", () => {
    for (const c of EXPECTED_CATEGORIES) {
      expect(categories[c], `missing category translation "${c}"`).toBeTruthy();
    }
  });
});
