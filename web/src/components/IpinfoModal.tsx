import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  /** The session title, shown in the header so the dialog is anchored to the
   *  session that produced the probe. */
  sessionTitle: string;
  /** null while the curl request is in flight; otherwise the result. */
  state: { loading: true } | { loading: false; output: string } | { loading: false; error: string };
  onClose: () => void;
}

/** Modal that displays the result of the "ipinfo" context-menu action
 *  (`curl https://ipinfo.io` run with the session's proxy env). The curl runs
 *  non-disruptively on the backend; this dialog just renders the stdout and
 *  closes on confirm. Modeled on SessionGroupModal. */
export function IpinfoModal({ sessionTitle, state, onClose }: Props) {
  const { t } = useTranslation();
  const closeRef = useRef<HTMLButtonElement | null>(null);
  // Focus the confirm button on open and restore focus to the triggering menu
  // item on close, mirroring SessionGroupModal / DeleteSessionDialog.
  const previousFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      previousFocusRef.current?.focus?.();
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ipinfo-modal-title"
      data-testid="ipinfo-modal"
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in"
      onClick={() => !state.loading && onClose()}
    >
      <div
        className="bg-surface-800 border border-surface-700/50 rounded-lg w-[480px] max-w-[90vw] shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-700">
          <h2 id="ipinfo-modal-title" className="text-sm font-semibold text-text-primary">
            {t("sidebar:ipinfo.title")}
          </h2>
          <p className="text-[12px] text-text-dim mt-0.5 truncate">{sessionTitle}</p>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {state.loading ? (
            <div className="flex items-center gap-2 text-[13px] text-text-secondary">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t("sidebar:ipinfo.loading")}
            </div>
          ) : "output" in state ? (
            <pre
              data-testid="ipinfo-modal-output"
              className="bg-surface-900 border border-surface-700 rounded px-3 py-2 text-[12px] font-mono text-text-primary whitespace-pre-wrap break-all max-h-[50vh] overflow-auto"
            >
              {state.output || t("sidebar:ipinfo.empty")}
            </pre>
          ) : (
            <p data-testid="ipinfo-modal-error" className="text-[13px] text-status-error">
              {state.error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-3 border-t border-surface-700">
          <button
            ref={closeRef}
            onClick={onClose}
            disabled={state.loading}
            data-testid="ipinfo-modal-confirm"
            className="px-4 py-1.5 text-sm text-white bg-brand-600/90 hover:bg-brand-600 rounded-md cursor-pointer transition-colors disabled:opacity-50"
          >
            {t("sidebar:ipinfo.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
