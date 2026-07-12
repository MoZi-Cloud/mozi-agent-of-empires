import { useTranslation } from "react-i18next";
import { useWebSettings } from "../../hooks/useWebSettings";

/// Client-side diff view preferences. These are pure rendering choices stored
/// per browser in `localStorage` (like the Terminal section), not backend
/// config, so they need no server round-trip or elevation. The same toggles
/// are also reachable inline from the diff view itself.
export function DiffSettings() {
  const { t } = useTranslation();
  const { settings, update } = useWebSettings();

  return (
    <div>
      <div className="space-y-4">
        <div>
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <div>
              <div className="text-[13px] text-text-secondary">{t("settings:diff.splitTitle")}</div>
              <p className="text-[11px] text-text-muted mt-1">{t("settings:diff.splitDesc")}</p>
            </div>
            <input
              type="checkbox"
              checked={settings.diffViewLayout === "split"}
              onChange={(e) =>
                update({
                  diffViewLayout: e.target.checked ? "split" : "unified",
                })
              }
              className="accent-brand-600 w-4 h-4 shrink-0"
            />
          </label>
        </div>

        <div>
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <div>
              <div className="text-[13px] text-text-secondary">{t("settings:diff.treeTitle")}</div>
              <p className="text-[11px] text-text-muted mt-1">{t("settings:diff.treeDesc")}</p>
            </div>
            <input
              type="checkbox"
              checked={settings.diffViewMode === "tree"}
              onChange={(e) => update({ diffViewMode: e.target.checked ? "tree" : "flat" })}
              className="accent-brand-600 w-4 h-4 shrink-0"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
