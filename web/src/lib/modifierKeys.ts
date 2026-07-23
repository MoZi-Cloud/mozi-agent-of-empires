// Shared encoding for the mobile toolbar's modifier latches (Shift/Ctrl/Alt/
// Cmd). The latches are toolbar-driven (the soft keyboard has no Ctrl/Alt/Cmd
// keys), so both the toolbar button taps and the hidden-input keydown path
// resolve a `Modifiers` snapshot to the same byte sequences.

export interface Modifiers {
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  cmd: boolean;
}

export const NO_MODIFIERS: Modifiers = { shift: false, ctrl: false, alt: false, cmd: false };

export function hasAnyModifier(m: Modifiers): boolean {
  return m.shift || m.ctrl || m.alt || m.cmd;
}

/** Are only "terminal-meaningful" modifiers (shift/ctrl/alt) active, with cmd
 * off? Cmd is handled as Mac shortcuts (copy/paste/select) by the caller, so
 * byte-encoding helpers refuse to emit when cmd is latched. */
export function hasCmd(m: Modifiers): boolean {
  return m.cmd;
}

/** PC xterm CSI modifier parameter: 1 + shift*1 + alt*2 + ctrl*4 (cmd does not
 * encode into terminal sequences). Used by modified arrow keys. */
function csiModifierParam(m: Modifiers): number {
  return 1 + (m.shift ? 1 : 0) + (m.alt ? 2 : 0) + (m.ctrl ? 4 : 0);
}

const ARROW_FINAL = { up: "A", down: "B", right: "C", left: "D" } as const;

/** Encode an arrow direction with latched modifiers. `\x1b[X` plain;
 * `\x1b[1;mX` when shift/alt/ctrl apply (e.g. Shift+Up = `\x1b[1;2A`). */
export function encodeArrow(dir: "up" | "down" | "right" | "left", m: Modifiers): string {
  const final = ARROW_FINAL[dir];
  const param = csiModifierParam(m);
  return param > 1 ? `\x1b[1;${param}${final}` : `\x1b[${final}`;
}

/** Tab is `\t`; Shift+Tab is the reverse-tab sequence `\x1b[Z`. */
export function encodeTab(m: Modifiers): string {
  return m.shift ? "\x1b[Z" : "\t";
}

/** Encode a printable key from the soft keyboard with latched modifiers.
 * `code` is the legacy keyCode (uppercase letter code) so Ctrl+letter maps to
 * the right control character regardless of shift state. Returns null when
 * the combination is swallowed (Cmd shortcuts are handled by the caller, not
 * sent to the PTY — Mac terminals do not forward Cmd). */
export function encodePrintable(char: string, code: number, m: Modifiers): string | null {
  if (m.cmd) return null;
  if (m.ctrl) {
    if (code >= 65 && code <= 90) return String.fromCharCode(code - 64);
    if (code >= 97 && code <= 122) return String.fromCharCode(code - 96);
  }
  if (m.alt) return `\x1b${char}`;
  return char;
}
