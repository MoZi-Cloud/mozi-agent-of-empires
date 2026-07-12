import { common } from "./common";
import { settings } from "./settings";
import { shell } from "./shell";
import { sidebar } from "./sidebar";

// English has no `schema` namespace: field labels/descriptions arrive in
// English from the backend, so en needs no per-field overrides.
export const en = { common, settings, shell, sidebar };
