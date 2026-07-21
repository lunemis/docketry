"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Brand } from "../../../components/Brand";
import {
  categorySeal,
  defaultCategorySettings,
  type CategoryPreference,
  type CategorySettings,
} from "../../../lib/categories";
import { t } from "../../../lib/i18n";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function CategorySettingsPage() {
  const [categories, setCategories] = useState<CategoryPreference[]>(
    defaultCategorySettings().categories,
  );
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/categories", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`load failed (${response.status})`);
        return (await response.json()) as CategorySettings;
      })
      .then((settings) => {
        if (!cancelled) setCategories(settings.categories);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function update(index: number, patch: Partial<CategoryPreference>) {
    setCategories((current) =>
      current.map((category, i) =>
        i === index ? { ...category, ...patch } : category,
      ),
    );
    setDirty(true);
    setSaveState("idle");
  }

  function move(index: number, offset: -1 | 1) {
    const target = index + offset;
    if (target < 0 || target >= categories.length) return;
    setCategories((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDirty(true);
    setSaveState("idle");
  }

  async function save() {
    setSaveState("saving");
    try {
      const response = await fetch("/api/settings/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: 1, categories }),
      });
      if (!response.ok) throw new Error(`save failed (${response.status})`);
      const settings = (await response.json()) as CategorySettings;
      setCategories(settings.categories);
      setDirty(false);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  function reset() {
    setCategories(defaultCategorySettings().categories);
    setDirty(true);
    setSaveState("idle");
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-3 py-3 sm:px-5 sm:py-5">
      <header className="board-chrome rounded-2xl border border-[var(--line)] px-4 py-3.5 sm:px-5">
        <div className="flex items-center justify-between gap-4">
          <Brand compact />
          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"
          >
            ← {t.back}
          </Link>
        </div>
      </header>

      <section className="py-7 sm:py-10">
        <p className="font-mono text-[11px] font-semibold tracking-[0.12em] text-[var(--accent)] uppercase">
          {t.settings}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em] sm:text-3xl">
          {t.categorySettings}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          {t.categorySettingsHint}
        </p>
        {loadFailed && (
          <p className="mt-4 rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent)]">
            {t.settingsLoadFailed}
          </p>
        )}
      </section>

      <div
        className={`flex flex-col gap-3 transition-opacity ${loading ? "pointer-events-none opacity-55" : ""}`}
        aria-busy={loading}
      >
        {categories.map((category, index) => (
          <article
            key={category.id}
            className={`category-editor rounded-2xl border bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] sm:p-5 ${
              category.hidden ? "border-dashed border-[var(--line-strong)] opacity-70" : "border-[var(--line)]"
            }`}
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <span
                className="type-seal flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border font-bold"
                style={{
                  color: category.color,
                  borderColor: category.color,
                  background: `color-mix(in srgb, ${category.color} 12%, var(--surface))`,
                }}
              >
                {categorySeal(category)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-[var(--muted)]">
                    {t.categoryStableId} · {category.id}
                  </span>
                  <div className="flex gap-1">
                    <MoveButton
                      label={t.moveUp}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      ↑
                    </MoveButton>
                    <MoveButton
                      label={t.moveDown}
                      disabled={index === categories.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      ↓
                    </MoveButton>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_9rem]">
                  <label className="text-xs font-medium text-[var(--muted)]">
                    {t.categoryLabel}
                    <input
                      value={category.label}
                      maxLength={24}
                      onChange={(event) =>
                        update(index, { label: event.target.value })
                      }
                      className="mt-1.5 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] px-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-3 focus:ring-[var(--accent-ring)]"
                    />
                  </label>
                  <label className="text-xs font-medium text-[var(--muted)]">
                    {t.categoryColor}
                    <span className="mt-1.5 flex h-11 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] px-2">
                      <input
                        type="color"
                        value={category.color}
                        onChange={(event) =>
                          update(index, { color: event.target.value })
                        }
                        className="category-color h-7 w-9 shrink-0"
                      />
                      <span className="font-mono text-[11px] text-[var(--muted)]">
                        {category.color.toUpperCase()}
                      </span>
                    </span>
                  </label>
                </div>
                <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={!category.hidden}
                    onChange={(event) =>
                      update(index, { hidden: !event.target.checked })
                    }
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                  {t.categoryVisible}
                </label>
              </div>
            </div>
          </article>
        ))}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-[var(--muted)]">
        {t.categoryHiddenHint}
      </p>

      <div className="sticky bottom-3 mt-7 flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_90%,transparent)] p-3 shadow-[var(--shadow-md)] backdrop-blur-xl">
        <button
          type="button"
          onClick={reset}
          disabled={loading || saveState === "saving"}
          className="rounded-xl px-3 py-2.5 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--ink)] disabled:opacity-40"
        >
          {t.resetDefaults}
        </button>
        <div className="flex items-center gap-3">
          {saveState === "saved" && (
            <span className="text-xs font-medium text-[var(--report,#17877a)]">
              {t.settingsSaved}
            </span>
          )}
          {saveState === "error" && (
            <span className="max-w-48 text-right text-xs text-[var(--accent)]">
              {t.settingsSaveFailed}
            </span>
          )}
          <button
            type="button"
            onClick={save}
            disabled={loading || !dirty || saveState === "saving"}
            className="rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-[var(--bg)] shadow-sm transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saveState === "saving" ? t.saving : t.saveChanges}
          </button>
        </div>
      </div>
    </main>
  );
}

function MoveButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line)] font-mono text-sm text-[var(--muted)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--ink)] disabled:opacity-25"
    >
      {children}
    </button>
  );
}
