import { useCallback, useState } from "react";
import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import { useLongPressEdit } from "../hooks/useLongPressEdit";
import { useMobileQuickButtons } from "../hooks/useMobileQuickButtons";
import { useMobileQuickButtonCount } from "../lib/mobileQuickButtons";
import { encodeArrow, encodeTab, hasAnyModifier, type Modifiers } from "../lib/modifierKeys";
import { writeClipboard } from "../lib/clipboard";
import { toastBus } from "../lib/toastBus";
import { QuickButtonEditModal } from "./QuickButtonEditModal";

const CLIPBOARD_TEXT_TYPES = ["text/plain", "text/uri-list", "text/html"] as const;

// Normalize clipboard payloads to plain text. Necessary because GitHub's
// "Copy link" buttons (and many Mac copy-link UIs) write text/uri-list
// only, no text/plain, so the browser's default paste handler ends up
// with an empty payload.
function normalizeClipboardData(type: string, raw: string): string {
  if (type === "text/uri-list") {
    return raw
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#"))
      .join("\n");
  }
  if (type === "text/html") {
    const doc = new DOMParser().parseFromString(raw, "text/html");
    const anchor = doc.querySelector("a[href]");
    const href = anchor?.getAttribute("href");
    if (href) return href;
    return doc.body?.textContent?.trim() ?? "";
  }
  return raw;
}

function extractClipboardText(cd: DataTransfer | null): string {
  if (!cd) return "";
  for (const ty of CLIPBOARD_TEXT_TYPES) {
    const raw = cd.getData(ty);
    if (raw) {
      const normalized = normalizeClipboardData(ty, raw);
      if (normalized) return normalized;
    }
  }
  return "";
}

interface Props {
  sendData: (data: string) => void;
  keyboardOpen: boolean;
  modifiers: Modifiers;
  onToggleModifier: (key: keyof Modifiers) => void;
  onClearModifiers: () => void;
  /** The live view's hidden input element, which owns keyboard focus. */
  inputElRef: RefObject<HTMLTextAreaElement | null>;
}

type SystemKey = "up" | "down" | "left" | "right" | "tab" | "esc" | "enter" | "fn";

export function MobileTerminalToolbar({
  sendData,
  keyboardOpen,
  modifiers,
  onToggleModifier,
  onClearModifiers,
  inputElRef,
}: Props) {
  const { t } = useTranslation();
  const count = useMobileQuickButtonCount();
  const { buttons, updateButton } = useMobileQuickButtons(count);
  const [editing, setEditing] = useState<number | null>(null);

  const haptic = useCallback(() => {
    navigator.vibrate?.(10);
  }, []);

  const refocusTerminal = useCallback(() => {
    // Only re-focus if the input already had focus (keyboard open); a toolbar
    // tap must not summon the keyboard on its own.
    if (keyboardOpen) inputElRef.current?.focus();
  }, [inputElRef, keyboardOpen]);

  // Send a fixed system key, applying the active modifier latches (arrows and
  // Tab are the only ones modifiers meaningfully transform), then clear them.
  const sendKey = useCallback(
    (kind: SystemKey) => {
      haptic();
      let seq = "";
      switch (kind) {
        case "up":
          seq = encodeArrow("up", modifiers);
          break;
        case "down":
          seq = encodeArrow("down", modifiers);
          break;
        case "left":
          seq = encodeArrow("left", modifiers);
          break;
        case "right":
          seq = encodeArrow("right", modifiers);
          break;
        case "tab":
          seq = encodeTab(modifiers);
          break;
        case "esc":
          seq = "\x1b";
          break;
        case "enter":
          seq = "\r";
          break;
        case "fn":
          seq = "~";
          break;
      }
      sendData(seq);
      if (hasAnyModifier(modifiers)) onClearModifiers();
      refocusTerminal();
    },
    [sendData, modifiers, onClearModifiers, haptic, refocusTerminal],
  );

  const sendCustom = useCallback(
    (i: number) => {
      const b = buttons[i];
      if (!b || !b.text) return;
      haptic();
      // Bracketed paste so multi-line / control content survives intact; an
      // optional trailing CR when auto_enter is set.
      const seq = b.auto_enter ? `\x1b[200~${b.text}\x1b[201~\r` : `\x1b[200~${b.text}\x1b[201~`;
      sendData(seq);
      refocusTerminal();
    },
    [buttons, sendData, haptic, refocusTerminal],
  );

  const onCopy = useCallback(async () => {
    haptic();
    const text = window.getSelection()?.toString() ?? "";
    if (!text) {
      toastBus.handler?.info(t("mobile:copyToast.empty"));
      refocusTerminal();
      return;
    }
    const ok = await writeClipboard(text);
    const toast = toastBus.handler;
    if (ok) toast?.info(t("mobile:copyToast.done"));
    else toast?.error(t("mobile:copyToast.failed"));
    refocusTerminal();
  }, [haptic, t, refocusTerminal]);

  // Cell base class: 1/7 of the strip width so 7 buttons fill a row and the
  // grid wraps cleanly (system rows + Fn + custom buttons share the grid).
  const cell =
    "flex items-center justify-center h-11 basis-[14.28%] min-w-0 px-1 rounded-md transition-colors duration-75 text-text-secondary select-none touch-manipulation active:bg-surface-700/50 active:scale-95 truncate";
  const strip = "shrink-0 flex flex-wrap items-center gap-1 px-2 py-1.5 bg-surface-850 border-t border-surface-700/20";
  const modActive = (on: boolean) => (on ? `${cell} text-brand-400 bg-brand-600/20 ring-1 ring-brand-500/40` : cell);
  const modAria = (label: string, on: boolean) => (on ? `${label}${t("mobile:toolbar.activeSuffix")}` : label);

  return (
    <div
      className={strip}
      // Prevent toolbar taps from stealing focus away from the proxy input.
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Row 1: arrows + Tab/Esc/Enter */}
      <button type="button" aria-label={t("mobile:toolbar.arrowUp")} className={cell} onClick={() => sendKey("up")}>
        <span className="font-mono text-sm">{"↑"}</span>
      </button>
      <button type="button" aria-label={t("mobile:toolbar.arrowDown")} className={cell} onClick={() => sendKey("down")}>
        <span className="font-mono text-sm">{"↓"}</span>
      </button>
      <button type="button" aria-label={t("mobile:toolbar.arrowLeft")} className={cell} onClick={() => sendKey("left")}>
        <span className="font-mono text-sm">{"←"}</span>
      </button>
      <button
        type="button"
        aria-label={t("mobile:toolbar.arrowRight")}
        className={cell}
        onClick={() => sendKey("right")}
      >
        <span className="font-mono text-sm">{"→"}</span>
      </button>
      <button type="button" aria-label={t("mobile:toolbar.tab")} className={cell} onClick={() => sendKey("tab")}>
        <span className="font-mono text-sm">Tab</span>
      </button>
      <button type="button" aria-label={t("mobile:toolbar.escape")} className={cell} onClick={() => sendKey("esc")}>
        <span className="font-mono text-sm">Esc</span>
      </button>
      <button type="button" aria-label={t("mobile:toolbar.enter")} className={cell} onClick={() => sendKey("enter")}>
        <span className="font-mono text-sm">{"⏎"}</span>
      </button>

      {/* Row 2: modifier latches + Ctrl+C + Copy/Paste */}
      <button
        type="button"
        aria-label={modAria(t("mobile:toolbar.shift"), modifiers.shift)}
        aria-pressed={modifiers.shift}
        className={modActive(modifiers.shift)}
        onClick={() => {
          haptic();
          onToggleModifier("shift");
        }}
      >
        <span className="font-mono text-xs">Shift</span>
      </button>
      <button
        type="button"
        aria-label={modAria(t("mobile:toolbar.ctrl"), modifiers.ctrl)}
        aria-pressed={modifiers.ctrl}
        className={modActive(modifiers.ctrl)}
        onClick={() => {
          haptic();
          onToggleModifier("ctrl");
        }}
      >
        <span className="font-mono text-xs">Ctrl</span>
      </button>
      <button
        type="button"
        aria-label={t("mobile:toolbar.ctrlC")}
        className={cell}
        onClick={() => {
          haptic();
          sendData("\x03");
          // ^C is a Ctrl combination; clear any latched modifiers like the
          // other system keys do.
          if (hasAnyModifier(modifiers)) onClearModifiers();
          refocusTerminal();
        }}
      >
        <span className="font-mono text-xs">^C</span>
      </button>
      <button
        type="button"
        aria-label={modAria(t("mobile:toolbar.alt"), modifiers.alt)}
        aria-pressed={modifiers.alt}
        className={modActive(modifiers.alt)}
        onClick={() => {
          haptic();
          onToggleModifier("alt");
        }}
      >
        <span className="font-mono text-xs">Alt</span>
      </button>
      <button
        type="button"
        aria-label={modAria(t("mobile:toolbar.cmd"), modifiers.cmd)}
        aria-pressed={modifiers.cmd}
        className={modActive(modifiers.cmd)}
        onClick={() => {
          haptic();
          onToggleModifier("cmd");
        }}
      >
        <span className="font-mono text-xs">Cmd</span>
      </button>
      <button type="button" aria-label={t("mobile:toolbar.copy")} className={cell} onClick={onCopy}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V5a2 2 0 0 1 2-2h10" />
        </svg>
      </button>
      <PasteButton sendData={sendData} keyboardOpen={keyboardOpen} inputElRef={inputElRef} haptic={haptic} t={t} />

      {/* Fn: quick tilde (home-dir habit) */}
      <button type="button" aria-label={t("mobile:toolbar.fn")} className={cell} onClick={() => sendKey("fn")}>
        <span className="font-mono text-sm">~</span>
      </button>

      {/* Custom quick buttons (one row per 7). Default label text1..textN. */}
      {buttons.map((b, i) => (
        <CustomButton
          key={i}
          label={b.label || `text${i + 1}`}
          ariaLabel={b.label || `text${i + 1}`}
          onTap={() => sendCustom(i)}
          onLongPress={() => setEditing(i)}
          cellClass={cell}
        />
      ))}

      {editing !== null && (
        <QuickButtonEditModal
          index={editing}
          initial={buttons[editing] ?? { label: "", text: "", auto_enter: false }}
          onClose={() => setEditing(null)}
          onSave={async (values) => updateButton(editing, values)}
        />
      )}
    </div>
  );
}

/** A custom quick button: tap sends its text, long-press (>=2s) opens the
 *  edit sheet. Isolated into its own component so `useLongPressEdit` (a hook)
 *  is not called inside the parent's `.map()`. */
function CustomButton({
  label,
  ariaLabel,
  onTap,
  onLongPress,
  cellClass,
}: {
  label: string;
  ariaLabel: string;
  onTap: () => void;
  onLongPress: () => void;
  cellClass: string;
}) {
  const handlers = useLongPressEdit({ onTap, onLongPress });
  return (
    <button type="button" aria-label={ariaLabel} className={cellClass} {...handlers}>
      <span className="text-xs truncate">{label}</span>
    </button>
  );
}

// Paste is large enough (Clipboard API + insecure-context execCommand
// fallback) to deserve its own component. Kept byte-equivalent to the original
// toolbar paste handler; only the toast strings are localized.
function PasteButton({
  sendData,
  keyboardOpen,
  inputElRef,
  haptic,
  t,
}: {
  sendData: (data: string) => void;
  keyboardOpen: boolean;
  inputElRef: RefObject<HTMLTextAreaElement | null>;
  haptic: () => void;
  t: (key: string) => string;
}) {
  const cell =
    "flex items-center justify-center h-11 basis-[14.28%] min-w-0 px-1 rounded-md transition-colors duration-75 text-text-secondary select-none touch-manipulation active:bg-surface-700/50 active:scale-95";
  return (
    <button
      type="button"
      aria-label={t("mobile:toolbar.paste")}
      className={cell}
      onClick={async () => {
        haptic();
        const toast = toastBus.handler;

        if (window.isSecureContext) {
          try {
            if (navigator.clipboard?.read) {
              const items = await navigator.clipboard.read();
              for (const item of items) {
                for (const ty of CLIPBOARD_TEXT_TYPES) {
                  if (!item.types.includes(ty)) continue;
                  const blob = await item.getType(ty);
                  const raw = await blob.text();
                  const text = normalizeClipboardData(ty, raw);
                  if (text) {
                    sendData(text);
                    return;
                  }
                }
              }
            } else if (navigator.clipboard?.readText) {
              const text = await navigator.clipboard.readText();
              if (text) {
                sendData(text);
                return;
              }
            }
          } catch {
            // Permission denied, no focus, etc. Fall through to execCommand.
          }
        }

        const activeEl = document.activeElement;
        const activeIsEditable = activeEl instanceof HTMLTextAreaElement || activeEl instanceof HTMLInputElement;

        if (keyboardOpen && activeIsEditable) {
          let recovered = "";
          const onPaste: EventListener = (e: Event) => {
            recovered = extractClipboardText((e as ClipboardEvent).clipboardData);
          };
          activeEl.addEventListener("paste", onPaste, { once: true });
          try {
            document.execCommand("paste");
          } catch {
            // continue to error toast
          }
          activeEl.removeEventListener("paste", onPaste);
          if (recovered) {
            sendData(recovered);
            return;
          }
        } else {
          const ta = inputElRef.current;
          if (ta) {
            let recovered = "";
            const onPaste = (e: ClipboardEvent) => {
              recovered = extractClipboardText(e.clipboardData);
            };
            ta.addEventListener("paste", onPaste, { once: true });
            const prevReadOnly = ta.hasAttribute("readonly");
            ta.setAttribute("readonly", "");
            try {
              ta.focus({ preventScroll: true });
              document.execCommand("paste");
            } catch {
              // continue to error toast
            }
            if (!prevReadOnly) ta.removeAttribute("readonly");
            ta.blur();
            ta.removeEventListener("paste", onPaste);
            if (recovered) {
              sendData(recovered);
              return;
            }
          }
        }

        if (!window.isSecureContext) {
          toast?.error(t("mobile:pasteToast.needsHttps"));
        } else {
          toast?.error(t("mobile:pasteToast.failed"));
        }
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="9" y="2" width="6" height="4" rx="1" />
        <path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
      </svg>
    </button>
  );
}
