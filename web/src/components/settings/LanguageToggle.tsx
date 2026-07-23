import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { persistLanguage, type AppLang } from "../../i18n";

// Exports only the component to satisfy `react-refresh/only-export-components`.
const OPTIONS: { lang: AppLang; label: string }[] = [
  { lang: "en", label: "EN" },
  { lang: "zh", label: "中文" },
];

// Compact EN / 中文 segmented control for the settings header. Persists the
// choice to localStorage and swaps the live i18n language; the rest of the
// dashboard re-renders via the shared i18n instance.
export function LanguageToggle() {
  const { i18n } = useTranslation();
  const current: AppLang = i18n.language.startsWith("zh") ? "zh" : "en";
  const choose = (lang: AppLang) => {
    persistLanguage(lang);
    void i18n.changeLanguage(lang);
  };
  return (
    <div className="flex items-center gap-1 shrink-0" data-testid="language-toggle">
      <Globe size={13} className="text-text-muted" aria-hidden="true" />
      {OPTIONS.map(({ lang, label }) => {
        const active = current === lang;
        return (
          <button
            key={lang}
            type="button"
            onClick={() => choose(lang)}
            aria-pressed={active}
            aria-label={label}
            className={
              "text-[11px] font-mono px-1 cursor-pointer " +
              (active ? "text-brand-500" : "text-text-muted hover:text-text-primary")
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
