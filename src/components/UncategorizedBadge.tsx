"use client";
import { useEffect, useState } from "react";

export default function UncategorizedBadge() {
  const [count, setCount] = useState<number | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/transactions/uncat/count?ts=" + Date.now(), {
        cache: "no-store",
      });
      const data = await res.json();
      setCount(typeof data?.count === "number" ? data.count : 0);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    load();

    // poll every 10s
    const id = setInterval(load, 10000);

    // refresh when tab becomes visible
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVis);

    // refresh immediately when other components dispatch "tx-updated"
    const onTx = () => load();
    window.addEventListener("tx-updated", onTx as EventListener);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("tx-updated", onTx as EventListener);
    };
  }, []);

  const text = count === null ? "…" : String(count);

  return (
    <span
      title="Uncategorized transactions"
      className="inline-flex items-center rounded-lg border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:border-amber-400/40 dark:bg-amber-950/40 dark:text-amber-200"
    >
      Uncategorized: {text}
    </span>
  );
}

