"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CopyBudgetsButton({ month }: { month: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onClick() {
    try {
      setLoading(true);
      const res = await fetch(`/api/budgets/copy?month=${encodeURIComponent(month)}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error ?? "Failed to copy budgets");
      } else {
        const msg = `Copied ${data.copied} · Skipped ${data.skipped} (from ${data.fromMonth} → ${data.month})`;
        // keep it simple; you can swap alert for a toast later
        alert(msg);
        router.refresh();
      }
    } catch (e) {
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      title="Copy last month's budgets into this month"
      className={`rounded-lg border px-3 py-1.5 text-sm transition ${
        loading
          ? "cursor-not-allowed opacity-60"
          : "hover:bg-gray-50 dark:hover:bg-white/10"
      }`}
    >
      {loading ? "Copying..." : "Copy from last month"}
    </button>
  );
}

