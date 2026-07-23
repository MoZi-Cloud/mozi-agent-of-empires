// English locale, `mobile` namespace. The mobile terminal toolbar (system
// quick keys, modifier latches, custom quick buttons) and the long-press
// edit modal. English strings that already existed as hardcoded literals in
// MobileTerminalToolbar.tsx are kept byte-identical here.
export const mobile = {
  toolbar: {
    arrowUp: "Arrow up",
    arrowDown: "Arrow down",
    arrowLeft: "Arrow left",
    arrowRight: "Arrow right",
    tab: "Tab",
    escape: "Escape",
    enter: "Enter",
    shift: "Shift",
    ctrl: "Ctrl",
    alt: "Alt",
    cmd: "Cmd",
    fn: "Tilde",
    ctrlC: "Ctrl+C interrupt",
    copy: "Copy selection",
    paste: "Paste from clipboard",
    activeSuffix: ", active",
  },
  copyToast: {
    done: "Copied selection.",
    empty: "Nothing selected to copy.",
    failed: "Couldn't copy. Try selecting text in the terminal first.",
  },
  pasteToast: {
    needsHttps: "Paste needs HTTPS. Run `aoe serve --remote` for a Tailscale or Cloudflare HTTPS URL.",
    failed: "Couldn't read clipboard. Try copying again, or open this dashboard in Safari.",
  },
  editModal: {
    title: "Edit quick button",
    buttonN: "Button {{n}}",
    labelField: "Label",
    labelPlaceholder: "Button title",
    textField: "Text",
    textPlaceholder: "Text to send to the terminal",
    charCount: "{{n}} / 20000",
    autoEnter: "Press Enter after sending",
    save: "Save",
    cancel: "Cancel",
    labelTooLong: "Label must be 64 characters or fewer.",
    textTooLong: "Text must be 20000 characters or fewer.",
    saveFailed: "Couldn't save. Please try again.",
  },
};
