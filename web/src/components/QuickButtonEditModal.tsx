import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { MobileQuickButton } from "../lib/api";

// Long-press edit sheet for one mobile toolbar custom quick button. The
// toolbar renders this inline (no shared Modal component exists in the repo),
// mirroring SessionGroupModal's backdrop / Escape / focus-restore pattern.
interface Props {
  index: number;
  initial: MobileQuickButton;
  onClose: () => void;
  /** Persist the edited button. Return false to keep the sheet open with an
   * error (the toolbar's store reports PUT failures this way). */
  onSave: (values: MobileQuickButton) => Promise<boolean>;
}

export const MAX_QUICK_BUTTON_TEXT = 20000;
export const MAX_QUICK_BUTTON_LABEL = 64;

export function QuickButtonEditModal({ index, initial, onClose, onSave }: Props) {
  const { t } = useTranslation();
  const [label, setLabel] = useState(initial.label);
  const [text, setText] = useState(initial.text);
  const [autoEnter, setAutoEnter] = useState(initial.auto_enter);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const labelRef = useRef<HTMLInputElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Capture + restore focus so the sheet is screen-reader/keyboard friendly.
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    labelRef.current?.focus();
    return () => previouslyFocused.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!saving && e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, onClose]);

  const labelTooLong = label.length > MAX_QUICK_BUTTON_LABEL;
  const textTooLong = text.length > MAX_QUICK_BUTTON_TEXT;
  const canSave = !saving && !labelTooLong && !textTooLong;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    const ok = await onSave({ label: label.trim(), text, auto_enter: autoEnter });
    setSaving(false);
    if (ok) onClose();
    else setError(t("mobile:editModal.saveFailed"));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qb-edit-title"
      className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 animate-fade-in p-3"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-surface-800 border border-surface-700/50 rounded-t-lg sm:rounded-lg w-full sm:w-[480px] max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-surface-700/50">
          <h2 id="qb-edit-title" className="text-sm font-semibold text-text-primary">
            {t("mobile:editModal.title")}{" "}
            <span className="text-text-dim font-normal">{t("mobile:editModal.buttonN", { n: index + 1 })}</span>
          </h2>
        </div>

        <div className="p-4 space-y-4">
          <label className="block">
            <span className="text-xs text-text-secondary">{t("mobile:editModal.labelField")}</span>
            <input
              ref={labelRef}
              value={label}
              maxLength={MAX_QUICK_BUTTON_LABEL}
              placeholder={t("mobile:editModal.labelPlaceholder")}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1 w-full bg-surface-900 border border-surface-700/50 rounded-md px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-brand-500"
            />
          </label>

          <label className="block">
            <span className="text-xs text-text-secondary flex justify-between">
              <span>{t("mobile:editModal.textField")}</span>
              <span className={textTooLong ? "text-status-error" : "text-text-dim"}>
                {t("mobile:editModal.charCount", { n: text.length })}
              </span>
            </span>
            <textarea
              value={text}
              maxLength={MAX_QUICK_BUTTON_TEXT}
              rows={6}
              placeholder={t("mobile:editModal.textPlaceholder")}
              onChange={(e) => setText(e.target.value)}
              className="mt-1 w-full bg-surface-900 border border-surface-700/50 rounded-md px-2 py-1.5 text-sm text-text-primary font-mono resize-y focus:outline-none focus:border-brand-500"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-text-secondary select-none">
            <input
              type="checkbox"
              checked={autoEnter}
              onChange={(e) => setAutoEnter(e.target.checked)}
              className="accent-brand-600"
            />
            {t("mobile:editModal.autoEnter")}
          </label>

          {(labelTooLong || textTooLong) && (
            <p className="text-xs text-status-error">
              {labelTooLong ? t("mobile:editModal.labelTooLong") : t("mobile:editModal.textTooLong")}
            </p>
          )}
          {error && <p className="text-xs text-status-error">{error}</p>}
        </div>

        <div className="p-4 border-t border-surface-700/50 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => !saving && onClose()}
            disabled={saving}
            className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary rounded-md hover:bg-surface-700/50"
          >
            {t("mobile:editModal.cancel")}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="px-3 py-1.5 text-sm text-white bg-brand-600/90 hover:bg-brand-600 rounded-md disabled:opacity-50"
          >
            {t("mobile:editModal.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
