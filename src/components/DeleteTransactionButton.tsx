"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Inline trash icon (keeps things dependency-free)
function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export default function DeleteTransactionButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (loading) return;
    const ok = confirm("Delete this transaction?");
    if (!ok) return;

    setLoading(true);
    try {
      await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      // notify others and refresh data
      window.dispatchEvent(new Event("tx-updated"));
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={loading}
      title={loading ? "Deleting..." : "Delete transaction"}
      aria-label="Delete transaction"
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border text-gray-600 hover:bg-gray-50 hover:text-rose-600 disabled:opacity-60 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-rose-400"
    >
      <TrashIcon className="h-4 w-4" />
      <span className="sr-only">Delete</span>
    </button>
  );
}

