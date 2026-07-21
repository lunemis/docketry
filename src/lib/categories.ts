import { LOCALE, TYPE_LABELS } from "./i18n";
import { ITEM_TYPES, type ItemType } from "./types";

export interface CategoryPreference {
  id: ItemType;
  label: string;
  color: string;
  hidden: boolean;
}

export interface CategorySettings {
  version: 1;
  categories: CategoryPreference[];
}

const DEFAULT_COLORS: Record<ItemType, string> = {
  review: "#5665df",
  decision: "#d45c43",
  report: "#17877a",
  info: "#64707a",
  fun: "#ac46bd",
};

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;
export const MAX_CATEGORY_LABEL_LENGTH = 24;

export function defaultCategorySettings(): CategorySettings {
  return {
    version: 1,
    categories: ITEM_TYPES.map((id) => ({
      id,
      label: TYPE_LABELS[id].label,
      color: DEFAULT_COLORS[id],
      hidden: false,
    })),
  };
}

export type CategorySettingsResult =
  | { ok: true; value: CategorySettings }
  | { ok: false; error: string };

export function parseCategorySettings(value: unknown): CategorySettingsResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "settings must be an object" };
  }

  const categories = (value as Record<string, unknown>).categories;
  if (!Array.isArray(categories) || categories.length !== ITEM_TYPES.length) {
    return {
      ok: false,
      error: `categories must contain exactly: ${ITEM_TYPES.join(", ")}`,
    };
  }

  const seen = new Set<string>();
  const normalized: CategoryPreference[] = [];
  for (const candidate of categories) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      return { ok: false, error: "each category must be an object" };
    }
    const category = candidate as Record<string, unknown>;
    if (
      typeof category.id !== "string" ||
      !ITEM_TYPES.includes(category.id as ItemType) ||
      seen.has(category.id)
    ) {
      return { ok: false, error: "category IDs must be unique, known IDs" };
    }
    const label = typeof category.label === "string" ? category.label.trim() : "";
    if (!label || label.length > MAX_CATEGORY_LABEL_LENGTH) {
      return {
        ok: false,
        error: `category labels must be 1-${MAX_CATEGORY_LABEL_LENGTH} characters`,
      };
    }
    if (typeof category.color !== "string" || !HEX_COLOR_RE.test(category.color)) {
      return { ok: false, error: "category colors must be 6-digit hex colors" };
    }
    if (typeof category.hidden !== "boolean") {
      return { ok: false, error: "category hidden values must be boolean" };
    }
    seen.add(category.id);
    normalized.push({
      id: category.id as ItemType,
      label,
      color: category.color.toLowerCase(),
      hidden: category.hidden,
    });
  }

  if (ITEM_TYPES.some((id) => !seen.has(id))) {
    return { ok: false, error: "all fixed category IDs are required" };
  }
  return { ok: true, value: { version: 1, categories: normalized } };
}

export function categorySeal(category: CategoryPreference): string {
  const label = category.label.trim();
  return LOCALE === "ko" ? Array.from(label)[0] : label.slice(0, 3).toUpperCase();
}
