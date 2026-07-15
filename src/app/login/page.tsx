"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "../../components/Brand";
import { t } from "../../lib/i18n";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submittingRef = useRef(false);

  useEffect(() => {
    if (pin.length !== 6 || submittingRef.current) return;
    submittingRef.current = true;
    (async () => {
      setBusy(true);
      setError(null);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      }).catch(() => null);
      if (res?.ok) {
        const next =
          new URLSearchParams(window.location.search).get("next") ?? "/";
        router.replace(next.startsWith("/") ? next : "/");
        return; // keep busy=true while navigating away
      }
      const data = res ? await res.json().catch(() => ({})) : {};
      if (res?.status === 429) {
        const min = Math.ceil((data?.retry_after_s ?? 900) / 60);
        setError(t.pinLocked(min));
      } else if (res) {
        setError(
          data?.remaining !== undefined
            ? t.pinWrongRemaining(data.remaining)
            : t.pinWrong,
        );
      } else {
        setError(t.pinOffline);
      }
      setPin("");
      setBusy(false);
      submittingRef.current = false;
      inputRef.current?.focus();
    })();
  }, [pin, router]);

  return (
    <main className="login-shell relative flex flex-1 items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <section className="login-card relative z-1 w-full max-w-md rounded-3xl border border-[var(--line)] p-6 text-center sm:p-9">
        <h1 className="flex justify-center">
          <Brand />
        </h1>
        <p className="mt-3 text-sm text-[var(--muted)]">{t.brandTagline}</p>

        <label className="mt-9 flex flex-col items-center gap-4">
          <span className="text-sm font-medium">{t.pinPrompt}</span>
          <div className="relative w-full">
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={pin}
              disabled={busy}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="absolute inset-0 z-1 cursor-text opacity-0"
              aria-label={t.pinLabel}
            />
            <div className="pointer-events-none flex justify-center gap-2 sm:gap-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <span
                  key={i}
                  className={`pin-cell flex h-13 w-10 items-center justify-center rounded-xl border text-base font-bold sm:h-14 sm:w-11 ${
                    i < pin.length
                      ? "pin-cell--filled border-[var(--ink)]"
                      : "border-[var(--line-strong)]"
                  }`}
                >
                  {i < pin.length ? "●" : ""}
                </span>
              ))}
            </div>
          </div>
        </label>

        <p
          className="mt-5 h-5 text-sm font-medium text-[var(--accent)]"
          role="status"
          aria-live="polite"
        >
          {error ?? (busy ? t.pinChecking : "")}
        </p>
        <p className="mt-5 text-[11px] text-[var(--muted-soft)]">
          {t.pinPrivacy}
        </p>
      </section>
    </main>
  );
}
