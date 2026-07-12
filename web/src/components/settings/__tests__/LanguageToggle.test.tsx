// @vitest-environment jsdom
//
// Contract test for the LanguageToggle: it renders both languages, reflects the
// active one via aria-pressed, and on click both persists the choice and asks
// the shared i18n instance to switch. Asserting on the spy calls (not on
// downstream re-renders) keeps the test deterministic.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import i18n from "../../../i18n";
import { LanguageToggle } from "../LanguageToggle";

afterEach(() => {
  void i18n.changeLanguage("en");
  cleanup();
});

describe("LanguageToggle", () => {
  it("renders both EN and 中文 options", () => {
    render(<LanguageToggle />);
    expect(screen.getByText("EN")).toBeTruthy();
    expect(screen.getByText("中文")).toBeTruthy();
  });

  it("marks the active language as pressed", async () => {
    await i18n.changeLanguage("zh");
    render(<LanguageToggle />);
    expect(screen.getByText("中文").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("EN").getAttribute("aria-pressed")).toBe("false");
  });

  it("switches language and persists the choice on click", () => {
    const changeSpy = vi.spyOn(i18n, "changeLanguage");
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    render(<LanguageToggle />);
    fireEvent.click(screen.getByText("中文"));
    expect(changeSpy).toHaveBeenCalledWith("zh");
    expect(setItemSpy).toHaveBeenCalledWith("aoe.lang", "zh");
    changeSpy.mockRestore();
    setItemSpy.mockRestore();
  });
});
