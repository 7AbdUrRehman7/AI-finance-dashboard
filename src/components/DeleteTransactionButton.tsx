"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteTransactionButton({ txId }: { txId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (loading) return;
    const ok = window.confirm("Delete this transaction?");
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/transactions/${encodeURIComponent(txId)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || "Failed to delete transaction.");
        return;
      }

      // Refresh the list so the row disappears
      router.refresh();
    } catch (err) {
      alert("Something went wrong while deleting.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={onDelete}
      disabled={loading}
      title="Delete transaction"
      className={`rounded-lg border px-2.5 py-1 text-sm hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/10 ${
        loading ? "cursor-not-allowed opacity-60" : ""
      }`}
      aria-label="Delete"
    >
      🗑️
    </button>
  );
}

