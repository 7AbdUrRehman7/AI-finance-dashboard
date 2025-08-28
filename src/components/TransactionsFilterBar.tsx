"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

type Cat = { _id: string; name: string };
type Init = {
  text?: string;
  categoryId?: string;
  from?: string;
  to?: string;
  min?: string;
  max?: string;
  onlyUncategorized?: string;
};

export default function TransactionsFilterBar({
  categories,
  initial,
}: {
  categories: Cat[];
  initial: Init;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const [text, setText] = useState(initial.text ?? "");
  const [categoryId, setCategoryId] = useState(initial.categoryId ?? "");
  const [from, setFrom] = useState(initial.from ?? "");
  const [to, setTo] = useState(initial.to ?? "");
  const [min, setMin] = useState(initial.min ?? "");
  const [max, setMax] = useState(initial.max ?? "");
  const [onlyUncat, setOnlyUncat] = useState(
    (initial.onlyUncategorized ?? "") === "1" ||
      (initial.onlyUncategorized ?? "").toLowerCase() === "true"
  );

  // Build query for Apply/Export (omit page/limit for export)
  const query = useMemo(() => {
    const q = new URLSearchParams();
    if (text) q.set("text", text);
    if (categoryId) q.set("categoryId", categoryId);
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    if (min) q.set("min", min);
    if (max) q.set("max", max);
    if (onlyUncat) q.set("onlyUncategorized", "1");
    return q;
  }, [text, categoryId, from, to, min, max, onlyUncat]);

  function apply() {
    const q = new URLSearchParams(query);
    const sort = sp.get("sort");
    if (sort) q.set("sort", sort);
    q.set("page", "1"); // reset to first page when applying new filters
    router.push(`/transactions?${q.toString()}`);
  }

  function reset() {
    setText("");
    setCategoryId("");
    setFrom("");
    setTo("");
    setMin("");
    setMax("");
    setOnlyUncat(false);
    router.push("/transactions");
  }

  const exportHref = useMemo(() => {
    const q = new URLSearchParams(query);
    const sort = sp.get("sort");
    if (sort) q.set("sort", sort);
    return `/api/transactions/export?${q.toString()}`;
  }, [query, sp]);

  return (
    <section className="rounded-2xl border p-4 dark:border-white/10">
      {/* Row 1 — compact inputs with labels above */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-4">
          <label className="mb-1 block text-xs text-gray-400">Search</label>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Merchant or description"
            className="w-full rounded-lg border px-3 py-2 dark:border-white/10 dark:bg-neutral-900"
          />
        </div>

        <div className="col-span-2">
          <label className="mb-1 block text-xs text-gray-400">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 dark:border-white/10 dark:bg-neutral-900"
          >
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className="mb-1 block text-xs text-gray-400">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 dark:border-white/10 dark:bg-neutral-900"
          />
        </div>

        <div className="col-span-2">
          <label className="mb-1 block text-xs text-gray-400">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 dark:border-white/10 dark:bg-neutral-900"
          />
        </div>

        <div className="col-span-1">
          <label className="mb-1 block text-xs text-gray-400">Min ($)</label>
          <input
            type="number"
            step="0.01"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 dark:border-white/10 dark:bg-neutral-900"
          />
        </div>

        <div className="col-span-1">
          <label className="mb-1 block text-xs text-gray-400">Max ($)</label>
          <input
            type="number"
            step="0.01"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 dark:border-white/10 dark:bg-neutral-900"
          />
        </div>
      </div>

      {/* Row 2 — left: checkbox + Export; right: Reset + Apply */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={onlyUncat}
              onChange={(e) => setOnlyUncat(e.target.checked)}
              className="h-4 w-4"
            />
            <span>Only uncategorized</span>
          </label>

          <a
            href={exportHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/10"
          >
            Export CSV
          </a>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/10"
          >
            Reset
          </button>
          <button
            onClick={apply}
            className="rounded-xl bg-white px-3 py-1.5 text-sm text-black hover:opacity-90 dark:text-black"
          >
            Apply
          </button>
        </div>
      </div>
    </section>
  );
}

