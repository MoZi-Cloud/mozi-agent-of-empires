// @vitest-environment jsdom
//
// Unit coverage for the pure `localizeSchema` core: the zh catalog overlay
// logic (label/desc/category/select-option overrides, graceful fallback,
// plugin pass-through, input immutability). The hook wrapper just memoises
// this, so exercising the pure function covers the behaviour.
import { describe, expect, it } from "vitest";
import { localizeSchema } from "../../../hooks/useLocalizedSchema";
import type { ZhSchemaCatalog } from "../../../locales/zh/schema";
import type { SettingsFieldDescriptor } from "../../../lib/types";

function field(over: Partial<SettingsFieldDescriptor>): SettingsFieldDescriptor {
  return {
    section: "sandbox",
    field: "image",
    category: "Sandbox",
    label: "Image",
    description: "Docker image.",
    widget: { kind: "toggle" },
    web_write: { policy: "allow" },
    profile_overridable: true,
    validation: { rule: "none" },
    advanced: false,
    ...over,
  };
}

const catalog: ZhSchemaCatalog = {
  categories: { Sandbox: "沙盒" },
  fields: {
    "sandbox.image": { label: "镜像", desc: "Docker 镜像。" },
    "sandbox.level": { label: "级别", desc: "日志级别。", options: { debug: "调试", info: "信息" } },
  },
};

describe("localizeSchema", () => {
  it("returns the same array reference in en (pass-through, referential stability)", () => {
    const schema = [field({})];
    expect(localizeSchema(schema, "en", catalog)).toBe(schema);
  });

  it("overrides label and description in zh", () => {
    const out = localizeSchema([field({})], "zh", catalog);
    expect(out[0].label).toBe("镜像");
    expect(out[0].description).toBe("Docker 镜像。");
  });

  it("overrides the category badge in zh", () => {
    const out = localizeSchema([field({})], "zh", catalog);
    expect(out[0].category).toBe("沙盒");
  });

  it("overrides select option labels by value in zh, leaving unmatched options unchanged", () => {
    const f = field({
      field: "level",
      widget: {
        kind: "select",
        options: [
          { value: "debug", label: "debug" },
          { value: "info", label: "info" },
          { value: "warn", label: "warn" },
        ],
      },
    });
    const out = localizeSchema([f], "zh", catalog);
    if (out[0].widget.kind !== "select") throw new Error("expected select widget");
    expect(out[0].widget.options).toEqual([
      { value: "debug", label: "调试" },
      { value: "info", label: "信息" },
      { value: "warn", label: "warn" },
    ]);
  });

  it("falls back to the backend English when a field has no catalog entry", () => {
    const f = field({ field: "memory_limit", label: "Memory limit", description: "Mem." });
    const out = localizeSchema([f], "zh", catalog);
    expect(out[0].label).toBe("Memory limit");
    expect(out[0].description).toBe("Mem.");
  });

  it("passes plugin (plugin:<id>) fields through untouched", () => {
    const f = field({ section: "plugin:acme.kit", field: "retries", label: "Retries" });
    const out = localizeSchema([f], "zh", catalog);
    expect(out[0].label).toBe("Retries");
  });

  it("does not mutate the input descriptors", () => {
    const f = field({});
    const snapshot = { ...f, widget: { ...f.widget } };
    localizeSchema([f], "zh", catalog);
    expect(f).toEqual(snapshot);
  });
});
