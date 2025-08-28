"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ApplyResponse = { applied?: number };

export default function ApplySuggestionsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function forceRefresh() {
    // soft refresh + fallbacks so user never has to manually reload
    try { router.refresh(); } catch {}
    if ("requestIdleCallback" in window) {
      // @ts-expect-error
      requestIdleCallback(() => router.refresh());
    } else {
      setTimeout(() => router.refresh(), 120);
    }
    // last-resort hard reload after a short delay
    setTimeout(() => {
      try { router.refresh(); } catch {}
      // If still stale (rare), hard reload
      if (document.visibilityState === "visible") {
        // eslint-disable-next-line no-restricted-globals
        location.reload();
      }
    }, 900);
  }

  async function onClick() {
    if (loading) return;
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/categorize/apply", { method: "POST" });
      let applied = 0;
      try {
        const data = (await res.json()) as ApplyResponse;
        applied = Number(data?.applied ?? 0);
      } catch {}
      setMsg(applied > 0 ? `Applied ${applied}` : "No changes");

      window.dispatchEvent(new Event("tx-updated"));
      forceRefresh();
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(null), 1600);
    }
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-60 dark:border-white/10 dark:bg-white dark:text-black"
      >
        {loading ? "Applying..." : "Apply Suggestions"}
      </button>
      <div aria-live="polite" className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2">
        {msg && (
          <span className="whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[11px] text-white shadow">
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}

