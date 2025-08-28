"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviewAcceptButton({ txId }: { txId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onClick() {
    if (loading) return;
    setLoading(true);
    try {
      await fetch("/api/review/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ txIds: [txId] }),
      });
      window.dispatchEvent(new Event("tx-updated"));
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-60 dark:border-white/10 dark:hover:bg-white/10"
      title="Accept"
    >
      {loading ? "Accepting..." : "Accept"}
    </button>
  );
}

