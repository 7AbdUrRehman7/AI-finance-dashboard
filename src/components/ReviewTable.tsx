"use client";

import { useMemo, useState } from "react";
import DeleteTransactionButton from "@/components/DeleteTransactionButton";
import Pagination from "@/components/Pagination";

type Item = {
  id: string;
  merchant: string;
  postedAt: string; // ISO
  amountCents: number;
  categoryId: string; // "" for uncategorized
  category?: string | null;
};

type Cat = { _id: string; name: string };

const money = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });
const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });

export default function ReviewTable({
  initialItems,
  categories,
  uncFirstDefault = true,
  // new (optional) pagination props
  page,
  pageSize,
  total,
  baseQuery,
  basePath = "/review",
}: {
  initialItems: Item[];
  categories: Cat[];
  uncFirstDefault?: boolean;
  page?: number;
  pageSize?: number;
  total?: number;
  baseQuery?: string;
  basePath?: string;
}) {
  // sort uncategorized first if requested
  const [items, setItems] = useState<Item[]>(
    uncFirstDefault
      ? [...initialItems].sort((a, b) => (a.categoryId ? 1 : 0) - (b.categoryId ? 1 : 0))
      : initialItems,
  );

  // selection state
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  // bulk controls
  const [bulkCatId, setBulkCatId] = useState<string>(""); // default “Uncategorized”

  const allChecked = items.length > 0 && selectedIds.length === items.length;
  const anyChecked = selectedIds.length > 0;

  function toggleRow(id: string, on?: boolean) {
    setSelected((prev) => ({ ...prev, [id]: on ?? !prev[id] }));
  }
  function toggleAll(on: boolean) {
    const next: Record<string, boolean> = {};
    if (on) for (const it of items) next[it.id] = true;
    setSelected(next);
  }
  function clearSelection() {
    setSelected({});
  }

  async function applySelected() {
    if (!anyChecked) return;

    const res = await fetch("/api/review/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: selectedIds, categoryId: bulkCatId || null }),
    });

    if (!res.ok) {
      const m = await res.text().catch(() => "Failed");
      alert(m || "Failed to apply");
      return;
    }

    // After apply, remove categorized rows from this page.
    setItems((prev) => prev.filter((it) => !selectedIds.includes(it.id)));
    clearSelection();
    // Page refresh handled by server navigation; no need to force here.
  }

  // compute footer text if pagination props provided
  const hasPager = page != null && pageSize != null && total != null && baseQuery != null;
  const start = hasPager ? (total === 0 ? 0 : (page! - 1) * pageSize! + 1) : 0;
  const end = hasPager ? (total === 0 ? 0 : Math.min(page! * pageSize!, total!)) : 0;

  return (
    <section className="space-y-3">
      {/* Bulk bar: always visible; disabled until selection */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2 dark:border-white/10">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 accent-indigo-500"
            checked={allChecked}
            onChange={(e) => toggleAll(e.target.checked)}
            aria-label="Select all"
          />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {selectedIds.length} selected
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={bulkCatId}
            onChange={(e) => setBulkCatId(e.target.value)}
            className="rounded border px-2 py-1 text-sm dark:border-white/10 dark:bg-neutral-900"
            disabled={!anyChecked}
            title={anyChecked ? "Choose a category to apply to selected" : "Select rows first"}
          >
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={applySelected}
            disabled={!anyChecked}
            className={`rounded-lg px-3 py-1.5 text-sm ring-1 transition ${
              anyChecked
                ? "ring-indigo-500 hover:bg-indigo-500/10"
                : "cursor-not-allowed opacity-50 ring-white/20"
            }`}
          >
            Apply Selected
          </button>

          <button
            onClick={clearSelection}
            disabled={!anyChecked}
            className={`rounded-lg px-3 py-1.5 text-sm ring-1 transition ${
              anyChecked
                ? "ring-gray-400 hover:bg-white/5 dark:ring-white/20"
                : "cursor-not-allowed opacity-50 ring-white/20"
            }`}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Table card with bottom pager (inside the same rounded container) */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm dark:border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100">
            <tr>
              <th className="w-10 p-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-indigo-500"
                  checked={allChecked}
                  onChange={(e) => toggleAll(e.target.checked)}
                  aria-label="Select all"
                />
              </th>
              <th className="p-3 text-left font-medium">Date</th>
              <th className="p-3 text-left font-medium">Merchant</th>
              <th className="p-3 text-left font-medium">Category</th>
              <th className="p-3 text-right font-medium">Amount</th>
              <th className="p-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td className="p-6 text-center text-gray-500 dark:text-gray-400" colSpan={6}>
                  Nothing to review. 🎉
                </td>
              </tr>
            )}

            {items.map((t) => {
              const isIncome = t.amountCents > 0;
              return (
                <tr
                  key={t.id}
                  className="border-t border-gray-100 transition hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
                >
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-indigo-500"
                      checked={!!selected[t.id]}
                      onChange={(e) => toggleRow(t.id, e.target.checked)}
                      aria-label={`Select ${t.merchant}`}
                    />
                  </td>

                  <td className="p-3 whitespace-nowrap">{fmtDate(t.postedAt)}</td>
                  <td className="p-3">{t.merchant}</td>

                  <td className="p-3">
                    {/* Inline per-row select (immediate apply via /api/transactions/[id]) */}
                    <select
                      className="rounded border px-2 py-1 text-sm dark:border-white/10 dark:bg-neutral-900"
                      value={t.categoryId}
                      onChange={async (e) => {
                        const value = e.target.value;
                        const res = await fetch(`/api/transactions/${t.id}`, {
                          method: "PUT",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ categoryId: value || null }),
                        });
                        if (!res.ok) {
                          alert("Failed to update category");
                          return;
                        }
                        // Remove from this page after categorizing.
                        setItems((prev) => prev.filter((x) => x.id !== t.id));
                        setSelected((prev) => {
                          const n = { ...prev };
                          delete n[t.id];
                          return n;
                        });
                      }}
                    >
                      <option value="">Uncategorized</option>
                      {categories.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td
                    className={`p-3 text-right font-mono tabular-nums ${
                      isIncome ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {money.format(t.amountCents / 100)}
                  </td>

                  <td className="p-3 text-right">
                    <DeleteTransactionButton txId={t.id} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Bottom-only pagination inside the card */}
        {hasPager && (
          <div className="flex items-center justify-between p-3 text-sm text-gray-600 dark:text-gray-400">
            <span>
              Showing {start}-{end} of {total}
            </span>
            <Pagination
              page={page!}
              pageSize={pageSize!}
              total={total!}
              baseQuery={baseQuery!}
              basePath={basePath}
            />
          </div>
        )}
      </div>
    </section>
  );
}

