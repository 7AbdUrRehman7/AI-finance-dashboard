"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ReviewBulkBar() {
  const router = useRouter();
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);

  async function acceptAll() {
    if (loading) return;
    const ok = confirm("Accept all pending suggestions?");
    if (!ok) return;
    setLoading("accept");
    try {
      await fetch("/api/review/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "accept-all" }),
      });
      window.dispatchEvent(new Event("tx-updated"));
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function rejectAll() {
    if (loading) return;
    const ok = confirm("Reject all pending suggestions?");
    if (!ok) return;
    setLoading("reject");
    try {
      await fetch("/api/review/reject", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "reject-all" }),
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={acceptAll}
        disabled={loading !== null}
        className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
      >
        {loading === "accept" ? "Accepting..." : "Accept All"}
      </button>
      <button
        type="button"
        onClick={rejectAll}
        disabled={loading !== null}
        className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-60 dark:border-white/10 dark:hover:bg-white/10"
      >
        {loading === "reject" ? "Rejecting..." : "Reject All"}
      </button>
    </div>
  );
}

