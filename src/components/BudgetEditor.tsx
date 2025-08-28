"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BudgetUsage from "@/components/BudgetUsage";

type Cat = { id: string; name: string };
type BudgetRow = { categoryId: string; limitCents: number };

function toCents(dollars: string) {
  const n = Number(dollars.replace(/[^0-9.-]/g, ""));
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}
function toDollars(cents: number) {
  return (Math.round(cents) / 100).toFixed(2);
}

type Status = "idle" | "saving" | "saved" | "error";

export default function BudgetEditor({
  month,
  categories,
  initialBudgets,
  spentByCategory, // categoryId -> positive cents spent this month
}: {
  month: string;
  categories: Cat[];
  initialBudgets: BudgetRow[];
  spentByCategory?: Record<string, number>;
}) {
  const router = useRouter();

  // map: categoryId -> cents
  const [values, setValues] = useState<Record<string, number>>({});
  // map: categoryId -> status
  const [statusById, setStatusById] = useState<Record<string, Status>>({});
  // map: categoryId -> dirty flag (input changed since last save)
  const [dirtyById, setDirtyById] = useState<Record<string, boolean>>({});

  // keep per-row timeout refs so we can clear them on rerenders/unmount
  const timeoutsRef = useRef<Record<string, any>>({});

  // reset when month or server data changes
  const budgetsKey = useMemo(
    () => JSON.stringify(initialBudgets.map((b) => `${b.categoryId}:${b.limitCents}`)),
    [initialBudgets]
  );

  useEffect(() => {
    const m: Record<string, number> = {};
    for (const b of initialBudgets) m[b.categoryId] = b.limitCents ?? 0;
    setValues(m);
    setStatusById({});
    setDirtyById({});
    // clear any pending timers
    for (const k of Object.keys(timeoutsRef.current)) {
      clearTimeout(timeoutsRef.current[k]);
    }
    timeoutsRef.current = {};
  }, [month, budgetsKey]);

  function onEdit(catId: string, dollars: string) {
    const cents = toCents(dollars);
    setValues((prev) => ({ ...prev, [catId]: cents }));
    setDirtyById((prev) => ({ ...prev, [catId]: true }));
    setStatusById((prev) => ({ ...prev, [catId]: "idle" })); // reset label to Save
  }

  async function save(catId: string) {
    try {
      setStatusById((prev) => ({ ...prev, [catId]: "saving" }));
      const limitCents = values[catId] ?? 0;

      const res = await fetch("/api/budgets", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ month, categoryId: catId, limitCents }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatusById((prev) => ({ ...prev, [catId]: "error" }));
        alert(data?.error || "Failed to save budget");
        return;
      }

      setDirtyById((prev) => ({ ...prev, [catId]: false }));
      setStatusById((prev) => ({ ...prev, [catId]: "saved" }));

      // revert to "Save" after a short success flash
      if (timeoutsRef.current[catId]) clearTimeout(timeoutsRef.current[catId]);
      timeoutsRef.current[catId] = setTimeout(() => {
        setStatusById((prev) => ({ ...prev, [catId]: "idle" }));
      }, 1200);

      router.refresh();
    } catch {
      setStatusById((prev) => ({ ...prev, [catId]: "error" }));
      alert("Something went wrong.");
    }
  }

  async function remove(catId: string) {
    try {
      setStatusById((prev) => ({ ...prev, [catId]: "saving" }));
      const res = await fetch("/api/budgets", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ month, categoryId: catId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatusById((prev) => ({ ...prev, [catId]: "error" }));
        alert(data?.error || "Failed to delete budget");
        return;
      }

      setValues((prev) => {
        const next = { ...prev };
        delete next[catId];
        return next;
      });
      setDirtyById((prev) => {
        const next = { ...prev };
        delete next[catId];
        return next;
      });
      setStatusById((prev) => ({ ...prev, [catId]: "saved" }));
      if (timeoutsRef.current[catId]) clearTimeout(timeoutsRef.current[catId]);
      timeoutsRef.current[catId] = setTimeout(() => {
        setStatusById((prev) => ({ ...prev, [catId]: "idle" }));
      }, 1200);

      router.refresh();
    } catch {
      setStatusById((prev) => ({ ...prev, [catId]: "error" }));
      alert("Something went wrong.");
    }
  }

  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100">
        <tr>
          <th className="p-2 text-left">Category</th>
          <th className="p-2 text-right">Limit</th>
          <th className="p-2 text-left">Usage</th>
          <th className="p-2 text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {categories.map((c) => {
          const cents = values[c.id] ?? 0;
          const status = statusById[c.id] ?? "idle";
          const disabled = status === "saving";
          const label =
            status === "saving"
              ? "Saving…"
              : status === "saved"
              ? "Saved ✓"
              : status === "error"
              ? "Retry"
              : "Save";

          const hasValue = values[c.id] != null;
          const spentCents = spentByCategory?.[c.id] ?? 0;

          return (
            <tr key={c.id} className="border-t align-top dark:border-white/10">
              <td className="p-2">{c.name}</td>

              {/* Limit column: just the input */}
              <td className="p-2 text-right">
                <div className="inline-flex items-center gap-2">
                  <span className="text-gray-500">$</span>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    inputMode="decimal"
                    className="w-28 rounded border px-2 py-1 text-right dark:border-white/10 dark:bg-neutral-900"
                    value={toDollars(cents)}
                    onChange={(e) => onEdit(c.id, e.target.value)}
                    disabled={disabled}
                  />
                </div>
              </td>

              {/* Usage column: spent/left text + bar */}
              <td className="p-2">
                <div className="w-64 max-w-full">
                  <BudgetUsage limitCents={cents} spentCents={spentCents} />
                </div>
              </td>

              {/* Actions */}
              <td className="p-2 text-right">
                <div className="inline-flex items-center gap-2">
                  <button
                    onClick={() => save(c.id)}
                    disabled={disabled}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                      disabled ? "cursor-not-allowed opacity-60" : "hover:bg-gray-50 dark:hover:bg-white/10"
                    }`}
                  >
                    {label}
                  </button>
                  {hasValue && (
                    <button
                      onClick={() => remove(c.id)}
                      disabled={disabled}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                        disabled ? "cursor-not-allowed opacity-60" : "hover:bg-gray-50 dark:hover:bg-white/10"
                      }`}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

