import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { safeGetItem, safeSetItem } from "./lib/safeStorage";
import { en } from "./locales/en";
import { zh } from "./locales/zh";

// The two languages the dashboard ships. Language is a per-browser client
// preference (like the theme), persisted to localStorage; it is NOT a server
// config and has no Rust `#[setting]`.
export type AppLang = "en" | "zh";

const STORAGE_KEY = "aoe.lang";

export function isAppLang(value: unknown): value is AppLang {
  return value === "en" || value === "zh";
}

/** Stored choice wins; otherwise sniff the browser language; otherwise en. */
export function detectLanguage(): AppLang {
  const stored = safeGetItem(STORAGE_KEY);
  if (isAppLang(stored)) return stored;
  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  const navLang = nav?.language ?? (nav as (typeof nav & { userLanguage?: string }) | null)?.userLanguage;
  if (typeof navLang === "string" && navLang.toLowerCase().startsWith("zh")) return "zh";
  return "en";
}

export function persistLanguage(lang: AppLang): void {
  // Best-effort: language is an in-memory preference regardless; the safe
  // helper swallows quota/private-mode errors.
  safeSetItem(STORAGE_KEY, lang);
}

// Initialise once. With bundled (non-async) resources, i18next's `init` is
// synchronous, so the first app render and every jsdom test see a ready `t()`
// with no extra tick. `react.useSuspense: false` keeps jsdom from suspending.
// The guard means importing this module from both main.tsx and test-setup.ts
// (and transitively from components) never re-inits or warns.
if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      en: { common: en.common, settings: en.settings, shell: en.shell, sidebar: en.sidebar },
      zh: {
        common: zh.common,
        settings: zh.settings,
        shell: zh.shell,
        sidebar: zh.sidebar,
        schema: zh.schema,
      },
    },
    lng: detectLanguage(),
    fallbackLng: "en",
    supportedLngs: ["en", "zh"],
    ns: ["common", "settings", "shell", "sidebar"],
    defaultNS: "common",
    react: { useSuspense: false },
    interpolation: { escapeValue: false },
  });
}

export default i18n;
