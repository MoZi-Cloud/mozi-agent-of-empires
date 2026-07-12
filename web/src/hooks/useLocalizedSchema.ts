import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { SettingsFieldDescriptor } from "../lib/types";
import { schema as zhSchema, type ZhSchemaCatalog } from "../locales/zh/schema";

/** Overlay the zh schema catalog onto the descriptors the backend served.
 *  Descriptors with no catalog entry pass through unchanged (graceful fallback
 *  to English), so a partial catalog never breaks the page. Plugin fields
 *  (`plugin:<id>`) have no catalog entries and fall through by design. In en
 *  (or any non-zh language) the input array is returned as-is, preserving
 *  referential stability for the common case. */
export function localizeSchema(
  schema: SettingsFieldDescriptor[],
  lang: string,
  catalog: ZhSchemaCatalog,
): SettingsFieldDescriptor[] {
  if (!lang.startsWith("zh")) return schema;
  return schema.map((d) => {
    const entry = catalog.fields[`${d.section}.${d.field}`];
    const category = catalog.categories[d.category];
    const optOverrides = d.widget.kind === "select" ? entry?.options : undefined;
    const widget =
      d.widget.kind === "select" && optOverrides
        ? {
            ...d.widget,
            options: d.widget.options.map((o) => {
              const overridden = optOverrides[o.value];
              return overridden !== undefined ? { ...o, label: overridden } : o;
            }),
          }
        : d.widget;
    return {
      ...d,
      label: entry?.label ?? d.label,
      description: entry?.desc ?? d.description,
      category: category ?? d.category,
      widget,
    };
  });
}

export function useLocalizedSchema(schema: SettingsFieldDescriptor[]): SettingsFieldDescriptor[] {
  const { i18n } = useTranslation();
  return useMemo(() => localizeSchema(schema, i18n.language, zhSchema), [schema, i18n.language]);
}
