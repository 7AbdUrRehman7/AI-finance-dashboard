"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteTransactionButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onDelete() {
    if (loading) return;
    const ok = window.confirm("Delete this transaction? This cannot be undone.");
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      router.refresh(); // re-fetch server data so the row disappears
    } catch (e) {
      alert("Delete failed. Check console.");
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={onDelete}
      disabled={loading}
      title={loading ? "Deleting…" : "Delete"}
      aria-label="Delete transaction"
      className="rounded-lg border px-2 py-1 text-xs hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-white/10 disabled:opacity-60"
    >
      {/* simple trash icon */}
      <svg
        width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className="inline align-[-1px]"
      >
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </svg>
    </button>
  );
}

