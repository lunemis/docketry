import {
  categorySeal,
  defaultCategorySettings,
  type CategoryPreference,
} from "../lib/categories";
import { LOCALE, TYPE_LABELS } from "../lib/i18n";
import type { ItemType } from "../lib/types";

export const TYPE_COLORS: Record<ItemType, { fg: string; bg: string }> = {
  review: { fg: "var(--c-review)", bg: "var(--c-review-bg)" },
  decision: { fg: "var(--c-decision)", bg: "var(--c-decision-bg)" },
  report: { fg: "var(--c-report)", bg: "var(--c-report-bg)" },
  info: { fg: "var(--c-info)", bg: "var(--c-info-bg)" },
  fun: { fg: "var(--c-fun)", bg: "var(--c-fun-bg)" },
};

export function typeLabel(type: ItemType): string {
  return TYPE_LABELS[type].label;
}

/** Stamp-seal type badge — the one loud element on each card.
 * Temp items get a dashed border: the stamp isn't "pressed" yet. */
export function TypeSeal({
  type,
  temp,
  category,
}: {
  type: ItemType;
  temp?: boolean;
  category?: CategoryPreference;
}) {
  const preference =
    category ??
    defaultCategorySettings().categories.find((entry) => entry.id === type)!;
  const label = preference.label;
  const seal = categorySeal(preference);
  return (
    <span
      aria-label={label}
      title={label}
      className={`type-seal mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border font-bold sm:h-11 sm:w-11 ${
        LOCALE === "ko" ? "text-[15px]" : "font-mono text-[9px] tracking-wide"
      }`}
      style={{
        color: preference.color,
        borderColor: preference.color,
        background: temp
          ? "transparent"
          : `color-mix(in srgb, ${preference.color} 12%, var(--surface))`,
        borderStyle: temp ? "dashed" : "solid",
        opacity: temp ? 0.78 : 1,
      }}
    >
      {seal}
    </span>
  );
}
