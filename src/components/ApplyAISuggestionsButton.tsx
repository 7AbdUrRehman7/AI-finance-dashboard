"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ApplyAISuggestionsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function forceRefresh() {
    try { router.refresh(); } catch {}
    if ("requestIdleCallback" in window) {
      // @ts-expect-error
      requestIdleCallback(() => router.refresh());
    } else {
      setTimeout(() => router.refresh(), 120);
    }
    setTimeout(() => {
      try { router.refresh(); } catch {}
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
      const res = await fetch("/api/categorize/ai/apply", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      const applied = Number(data?.applied ?? data?.updated ?? data?.count ?? 0);
      setMsg(applied > 0 ? `Applied ${applied}` : "No changes");

      window.dispatchEvent(new Event("tx-updated"));
      forceRefresh();
    } catch {
      setMsg("Failed");
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
        title="AI will suggest categories for uncategorized transactions"
        className="group relative overflow-hidden rounded-xl border border-indigo-400/40 bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-pink-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 disabled:opacity-60"
      >
        <span className="relative z-10 flex items-center gap-1.5">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className={`h-4 w-4 ${loading ? "animate-spin" : "animate-pulse"} opacity-90`}
            fill="currentColor"
          >
            <path d="M12 2l2.1 4.3 4.8.7-3.5 3.4.8 4.8L12 13.9 7.8 15.2l.8-4.8L5.1 7l4.8-.7L12 2z" />
          </svg>
          {loading ? "Thinking..." : "Apply AI Suggestions"}
        </span>
        <span className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/10" />
        <span className="pointer-events-none absolute -left-16 top-0 h-full w-16 -skew-x-12 bg-white/25 opacity-0 blur-sm transition-all duration-700 group-hover:translate-x-[260%] group-hover:opacity-100" />
      </button>

      {msg && (
        <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[11px] text-white shadow">
          {msg}
        </span>
      )}
    </div>
  );
}

