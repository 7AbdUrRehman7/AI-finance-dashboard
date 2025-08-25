"use client";
import { useEffect, useState } from "react";

export function UncategorizedBadge() {
  const [count, setCount] = useState<number | null>(null);

  async function refresh() {
    try {
      const res = await fetch("/api/transactions/uncat/count", { cache: "no-store" });
      const json = await res.json();
      setCount(typeof json?.count === "number" ? json.count : 0);
    } catch {
      setCount(null);
    }
  }

  useEffect(() => {
    refresh();
    // Optional: refresh every 20s while on the page
    const id = setInterval(refresh, 20000);
    return () => clearInterval(id);
  }, []);

  const label = count === null ? "…" : String(count);

  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium
                 border-gray-300 text-gray-700 dark:border-white/20 dark:text-gray-200"
      title="Uncategorized transactions remaining"
    >
      Uncategorized: {label}
    </span>
  );
}

