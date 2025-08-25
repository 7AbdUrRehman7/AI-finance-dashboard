"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function ApplyAISuggestionsButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<"openai" | "mock" | "no-key" | "unknown">("unknown");
  const router = useRouter();

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const res = await fetch("/api/categorize/ai/mode", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!canceled) setMode((json?.mode as any) ?? "unknown");
      } catch {
        if (!canceled) setMode("unknown");
      }
    })();
    return () => { canceled = true; };
  }, []);

  async function onClick() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/categorize/ai/apply", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      const applied = json?.applied ?? 0;
      const used = json?.mode ?? mode ?? "unknown";
      setMsg(`AI (${used}) applied ${applied} suggestion(s)`);
      router.refresh();
    } catch (e: any) {
      setMsg(`Error: ${e.message || "failed"}`);
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(null), 4000);
    }
  }

  const hint =
    mode === "openai"
      ? "Uses OpenAI (real model). Requires API credit."
      : mode === "mock"
      ? "Mock mode: heuristic suggestions, no API cost."
      : mode === "no-key"
      ? "No API key detected. Falls back to mock suggestions."
      : "Determining mode…";

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onClick}
        disabled={loading}
        className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-60 dark:bg-white dark:text-black"
        title={hint}
      >
        {loading ? "Applying AI…" : "Apply AI suggestions"}
      </button>
      {msg && <span className="text-sm text-gray-600 dark:text-gray-400">{msg}</span>}
    </div>
  );
}

