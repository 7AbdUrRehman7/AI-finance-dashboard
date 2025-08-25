"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ApplySuggestionsButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function onClick() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/categorize/apply", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(JSON.stringify(json));
      setMsg(`Applied ${json.applied ?? 0} suggestion(s)`);
      router.refresh(); // refresh the table data
    } catch (e: any) {
      setMsg(`Error: ${e.message || "failed"}`);
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(null), 4000);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onClick}
        disabled={loading}
        className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-60 dark:bg-white dark:text-black"
        title="Auto-categorize uncategorized transactions using rules"
      >
        {loading ? "Applying…" : "Apply suggestions"}
      </button>
      {msg && <span className="text-sm text-gray-600 dark:text-gray-400">{msg}</span>}
    </div>
  );
}

