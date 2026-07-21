"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArchiveIcon,
  KeepIcon,
  RestoreIcon,
  TrashIcon,
} from "../../../components/Board";
import { BrandMark } from "../../../components/Brand";
import { remainTime, t } from "../../../lib/i18n";
import type { ItemMeta, ItemStatus } from "../../../lib/types";
import { useStoredChoice } from "../../../lib/useStoredChoice";

const LIST_PATH: Record<ItemStatus, string> = {
  inbox: "/",
  archived: "/archive",
  trash: "/trash",
};

type ViewerWidth = "narrow" | "wide" | "full";
const VIEWER_WIDTH_KEY = "dropboard:viewer-width";
const VIEWER_WIDTH_OPTIONS: ViewerWidth[] = ["narrow", "wide", "full"];

interface ShareToast {
  msg: string;
  action?: { label: string; onClick: () => void };
}

export default function ViewerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [meta, setMeta] = useState<ItemMeta | null>(null);
  const [rawUrl, setRawUrl] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [viewerWidth, setViewerWidth] = useStoredChoice(
    VIEWER_WIDTH_KEY,
    VIEWER_WIDTH_OPTIONS,
    "narrow",
  );
  const [shareToast, setShareToast] = useState<ShareToast | null>(null);
  const [sharing, setSharing] = useState(false);
  const [organizing, setOrganizing] = useState(false);
  const [savingOrganization, setSavingOrganization] = useState(false);
  const [draftProject, setDraftProject] = useState("");
  const [draftFolder, setDraftFolder] = useState("");
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const shareToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showShareToast = (toastValue: ShareToast | null) => {
    if (shareToastTimer.current) clearTimeout(shareToastTimer.current);
    setShareToast(toastValue);
    if (toastValue) {
      shareToastTimer.current = setTimeout(() => setShareToast(null), 5000);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/items/${id}`, { cache: "no-store" });
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error(`load failed (${res.status})`);
        const { item, raw_url } = (await res.json()) as {
          item: ItemMeta;
          raw_url?: string;
        };
        if (cancelled) return;
        setMeta(item);
        setRawUrl(raw_url ?? `/api/items/${id}/raw`);
        if (!item.read_at) {
          fetch(`/api/items/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ read: true }),
          }).catch(() => {});
        }
      } catch {
        if (!cancelled) setLoadFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const patch = async (body: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      const { item } = (await res.json()) as { item: ItemMeta };
      return item;
    } catch {
      return null;
    }
  };

  const togglePin = async () => {
    if (!meta) return;
    const previous = meta;
    setMeta({ ...previous, pinned: !previous.pinned });
    const item = await patch({ pinned: !meta.pinned });
    if (item) {
      setMeta(item);
    } else {
      setMeta(previous);
      showShareToast({ msg: t.toastFailed });
    }
  };

  const openOrganizer = () => {
    if (!meta) return;
    setDraftProject(meta.project ?? "");
    setDraftFolder(meta.folder ?? "");
    setDraftTags(meta.tags);
    setTagInput("");
    setOrganizing(true);
  };

  const addPendingTag = () => {
    const next = tagInput.trim().replace(/^#/, "");
    if (next && !draftTags.includes(next) && draftTags.length < 20) {
      setDraftTags((current) => [...current, next]);
    }
    setTagInput("");
  };

  const saveOrganization = async () => {
    const pendingTag = tagInput.trim().replace(/^#/, "");
    const tags =
      pendingTag && !draftTags.includes(pendingTag) && draftTags.length < 20
        ? [...draftTags, pendingTag]
        : draftTags;
    setSavingOrganization(true);
    const item = await patch({
      project: draftProject,
      folder: draftFolder,
      tags,
    });
    setSavingOrganization(false);
    if (item) {
      setMeta(item);
      setOrganizing(false);
      showShareToast({ msg: t.organizationSaved });
    } else {
      showShareToast({ msg: t.toastFailed });
    }
  };

  const moveTo = async (status: ItemStatus) => {
    if (!meta) return;
    const item = await patch({ status });
    if (item) {
      router.push(LIST_PATH[meta.status]);
    } else {
      showShareToast({ msg: t.toastFailed });
    }
  };

  const keepItem = async () => {
    const item = await patch({ keep: true });
    if (item) {
      setMeta(item);
    } else {
      showShareToast({ msg: t.toastFailed });
    }
  };

  const revokeShare = async () => {
    try {
      const res = await fetch(`/api/items/${id}/share`, { method: "DELETE" });
      showShareToast({
        msg: res.ok ? t.toastShareRevoked : t.toastShareFailed,
      });
    } catch {
      showShareToast({ msg: t.toastShareFailed });
    }
  };

  const doShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const res = await fetch(`/api/items/${id}/share`, { method: "POST" });
      if (!res.ok) {
        showShareToast({ msg: t.toastShareFailed });
        return;
      }
      const { url } = (await res.json()) as { url: string };
      const full = /^https?:\/\//.test(url)
        ? url
        : `${window.location.origin}${url}`;
      try {
        await navigator.clipboard.writeText(full);
      } catch {
        // clipboard API unavailable — link is still shown via the toast fallback below
      }
      showShareToast({
        msg: t.toastShareCopied,
        action: { label: t.shareRevoke, onClick: revokeShare },
      });
    } catch {
      showShareToast({ msg: t.toastShareFailed });
    } finally {
      setSharing(false);
    }
  };

  const destroyTemp = async () => {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    try {
      const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`delete failed (${res.status})`);
      router.push("/");
    } catch {
      showShareToast({ msg: t.toastFailed });
    }
  };

  if (notFound || loadFailed) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p className="text-sm text-[var(--muted)]">
          {loadFailed ? t.loadFailed : t.notFound}
        </p>
        <Link href="/" className="text-sm font-semibold underline">
          {t.toInbox}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="viewer-header flex h-15 shrink-0 items-center gap-1 border-b border-[var(--line)] px-2 sm:px-3">
        <button
          aria-label={t.back}
          onClick={() =>
            meta ? router.push(LIST_PATH[meta.status]) : router.push("/")
          }
          className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-[var(--surface-2)] active:scale-95"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <BrandMark className="mr-2 hidden h-6 w-6 sm:block" />
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">
          {meta?.title ?? ""}
        </h1>
        {meta?.content_type === "markdown" && (
          <div
            className="hidden items-center gap-1 sm:flex"
            role="group"
            aria-label={t.widthLabel}
          >
            {VIEWER_WIDTH_OPTIONS.map((w) => (
              <button
                key={w}
                onClick={() => setViewerWidth(w)}
                title={t.widthLabel}
                className={`rounded-full px-2.5 py-1 font-mono text-[11px] ${
                  viewerWidth === w
                    ? "bg-[var(--ink)] font-semibold text-[var(--bg)]"
                    : "text-[var(--muted)]"
                }`}
              >
                {w === "narrow"
                  ? t.widthNarrow
                  : w === "wide"
                    ? t.widthWide
                    : t.widthFull}
              </button>
            ))}
          </div>
        )}
        {meta && (
          <button
            aria-label={t.organize}
            title={t.organize}
            onClick={openOrganizer}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--muted)] active:bg-[var(--surface-2)]"
          >
            <FolderIcon />
          </button>
        )}
        {meta && (
          <button
            aria-label={t.actionShare}
            title={t.actionShare}
            disabled={sharing}
            onClick={doShare}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--muted)] active:bg-[var(--surface-2)] disabled:opacity-50"
          >
            <ShareIcon />
          </button>
        )}
        {meta && meta.expires_at && (
          <div className="flex shrink-0 items-center gap-1">
            <span className="font-mono text-[11px] text-[var(--accent)]">
              ⏳ {remainTime(meta.expires_at)}
            </span>
            <button
              aria-label={t.actionKeep}
              title={t.actionKeep}
              onClick={keepItem}
              className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--muted)] active:bg-[var(--surface-2)]"
            >
              <KeepIcon />
            </button>
            {confirming ? (
              <button
                onClick={destroyTemp}
                className="flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-3 text-xs font-semibold text-white"
              >
                {t.actionConfirm}
              </button>
            ) : (
              <button
                aria-label={t.actionDelete}
                title={t.actionDelete}
                onClick={destroyTemp}
                className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--muted)] active:bg-[var(--surface-2)]"
              >
                <TrashIcon />
              </button>
            )}
          </div>
        )}
        {meta && !meta.expires_at && (
          <div className="flex shrink-0 items-center">
            <button
              aria-label={meta.pinned ? t.unpin : t.pin}
              onClick={togglePin}
              className={`flex h-11 w-11 items-center justify-center rounded-full active:bg-[var(--surface-2)] ${
                meta.pinned ? "text-[var(--accent)]" : "text-[var(--muted)]"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill={meta.pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 17v5" />
                <path d="M9 10.8V6a3 3 0 1 1 6 0v4.8l2 2.2v2H7v-2l2-2.2Z" />
              </svg>
            </button>
            {meta.status !== "archived" && meta.status !== "trash" && (
              <button
                aria-label={t.actionArchive}
                onClick={() => moveTo("archived")}
                className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--muted)] active:bg-[var(--surface-2)]"
              >
                <ArchiveIcon />
              </button>
            )}
            {meta.status !== "inbox" && (
              <button
                aria-label={t.actionToInbox}
                onClick={() => moveTo("inbox")}
                className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--muted)] active:bg-[var(--surface-2)]"
              >
                <RestoreIcon />
              </button>
            )}
            {meta.status !== "trash" && (
              <button
                aria-label={t.actionToTrash}
                onClick={() => moveTo("trash")}
                className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--muted)] active:bg-[var(--surface-2)]"
              >
                <TrashIcon />
              </button>
            )}
          </div>
        )}
      </header>
      {meta && rawUrl ? (
        <iframe
          sandbox="allow-scripts"
          src={
            meta.content_type === "markdown"
              ? `${rawUrl}${rawUrl.includes("?") ? "&" : "?"}w=${viewerWidth}`
              : rawUrl
          }
          title={meta.title}
          className="w-full flex-1 border-0 bg-white"
        />
      ) : (
        <p className="py-16 text-center text-sm text-[var(--muted)]">
          {t.loading}
        </p>
      )}
      {shareToast && (
        <div className="toast-in fixed inset-x-0 bottom-6 z-20 flex justify-center px-4">
          <div className="flex items-center gap-4 rounded-full bg-[var(--ink)] px-5 py-3 text-sm text-[var(--bg)] shadow-lg">
            <span>{shareToast.msg}</span>
            {shareToast.action && (
              <button
                onClick={() => {
                  shareToast.action?.onClick();
                }}
                className="text-[13px] font-semibold underline underline-offset-2"
              >
                {shareToast.action.label}
              </button>
            )}
          </div>
        </div>
      )}
      {organizing && meta && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-[rgb(12_16_22_/_0.42)] p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="organize-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingOrganization) {
              setOrganizing(false);
            }
          }}
        >
          <section className="w-full max-w-lg rounded-t-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-md)] sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] font-semibold tracking-[0.12em] text-[var(--accent)] uppercase">
                  {t.organize}
                </p>
                <h2 id="organize-title" className="mt-1 text-xl font-bold tracking-[-0.025em]">
                  {t.organizeItem}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                  {t.organizeHint}
                </p>
              </div>
              <button
                type="button"
                aria-label={t.cancel}
                onClick={() => setOrganizing(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-[var(--muted)] hover:bg-[var(--surface-2)]"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <OrganizerField label={t.project}>
                <input
                  value={draftProject}
                  maxLength={100}
                  placeholder={t.projectPlaceholder}
                  onChange={(event) => setDraftProject(event.target.value)}
                  className="organizer-input"
                />
              </OrganizerField>
              <OrganizerField label={t.folder}>
                <input
                  value={draftFolder}
                  maxLength={240}
                  placeholder={t.folderPlaceholder}
                  onChange={(event) => setDraftFolder(event.target.value)}
                  className="organizer-input"
                />
              </OrganizerField>
            </div>

            <div className="mt-4">
              <label className="text-xs font-semibold text-[var(--muted)]">
                {t.tags}
              </label>
              <div className="mt-1.5 flex min-h-12 flex-wrap items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-2 focus-within:border-[var(--accent)] focus-within:ring-3 focus-within:ring-[var(--accent-ring)]">
                {draftTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-lg bg-[var(--surface-2)] px-2 py-1 font-mono text-[11px]"
                  >
                    #{tag}
                    <button
                      type="button"
                      aria-label={t.removeTag(tag)}
                      onClick={() =>
                        setDraftTags((current) =>
                          current.filter((entry) => entry !== tag),
                        )
                      }
                      className="text-[var(--muted)] hover:text-[var(--accent)]"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  value={tagInput}
                  maxLength={50}
                  placeholder={draftTags.length === 0 ? t.tagPlaceholder : ""}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === ",") {
                      event.preventDefault();
                      addPendingTag();
                    }
                    if (
                      event.key === "Backspace" &&
                      !tagInput &&
                      draftTags.length > 0
                    ) {
                      setDraftTags((current) => current.slice(0, -1));
                    }
                  }}
                  className="min-w-36 flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-[var(--muted-soft)]"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOrganizing(false)}
                disabled={savingOrganization}
                className="rounded-xl px-4 py-2.5 text-sm text-[var(--muted)] hover:bg-[var(--surface-hover)] disabled:opacity-40"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={saveOrganization}
                disabled={savingOrganization}
                className="rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-[var(--bg)] shadow-sm active:scale-95 disabled:opacity-50"
              >
                {savingOrganization ? t.saving : t.saveChanges}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function OrganizerField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="text-xs font-semibold text-[var(--muted)]">
      {label}
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

function FolderIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5Z" />
      <path d="M8 13h8M12 9v8" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 10.5 15.4 6.5" />
      <path d="M8.6 13.5 15.4 17.5" />
    </svg>
  );
}
