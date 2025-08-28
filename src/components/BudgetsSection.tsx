// server component (no "use client")
import React from "react";

type BudgetItem = {
  _id: string;
  month: string;
  categoryId: string | null;
  categoryName: string;
  limitCents: number;
};

function moneyFromCents(cents: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format((cents ?? 0) / 100);
}

function pickArray(obj: any): any[] {
  if (Array.isArray(obj)) return obj;
  if (Array.isArray(obj?.categories)) return obj.categories;
  if (Array.isArray(obj?.perCategory)) return obj.perCategory;
  return [];
}

function pickCategoryId(it: any): string | null {
  return (it?.categoryId ?? it?._id ?? null) as string | null;
}

function computeSpentCents(it: any): number {
  // Prefer explicit expenseCents if present; else derive from totalCents (negative = spending)
  if (typeof it?.expenseCents === "number") return Math.max(0, it.expenseCents);
  if (typeof it?.totalCents === "number") return it.totalCents < 0 ? Math.abs(it.totalCents) : 0;
  return 0;
}

export default async function BudgetsSection({ month }: { month?: string }) {
  const monthQuery = month ? `?month=${encodeURIComponent(month)}` : "";

  const [budgetsRes, summaryRes] = await Promise.all([
    fetch(`/api/budgets${monthQuery}`, { cache: "no-store" }),
    fetch(`/api/analytics/summary${monthQuery}`, { cache: "no-store" }),
  ]);

  // Budgets
  const budgetsJson = (await budgetsRes.json()) as { month: string; budgets: BudgetItem[] };
  const budgets = (budgetsJson?.budgets ?? []).sort((a, b) =>
    (a.categoryName || "").localeCompare(b.categoryName || "")
  );

  // Analytics summary (to get spent per category for the same month)
  const summaryJson: any = await summaryRes.json();
  const catRows = pickArray(summaryJson);
  const spentByCatId = new Map<string | null, number>();
  for (const row of catRows) {
    const id = pickCategoryId(row);
    spentByCatId.set(id, computeSpentCents(row));
  }

  const rows = budgets.map((b) => {
    const spentCents = spentByCatId.get(b.categoryId) ?? 0;
    const limit = Math.max(0, b.limitCents ?? 0);
    const pct = limit > 0 ? Math.min(100, Math.round((spentCents / limit) * 100)) : 0;
    const overCents = Math.max(0, spentCents - limit);
    const leftCents = Math.max(0, limit - spentCents);
    return { ...b, spentCents, pct, overCents, leftCents };
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Budgets</h2>
        <span className="text-sm text-gray-500">{budgetsJson?.month ?? ""}</span>
      </div>

      {rows.length === 0 ? (
        <div className="text-sm text-gray-600 border rounded-xl p-4 bg-white">
          No budgets set for this month. (We’ll add an “Add Budget” form in the next step.)
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <div key={r._id} className="p-4 rounded-xl border bg-white space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{r.categoryName}</h3>
                <span className="text-xs text-gray-500">{r.pct}%</span>
              </div>

              <div className="w-full h-2 rounded bg-gray-200">
                <div
                  className="h-2 rounded"
                  style={{
                    width: `${r.pct}%`,
                    background: "linear-gradient(90deg, #60a5fa, #34d399)",
                  }}
                />
              </div>

              <div className="text-sm text-gray-700">
                <div>
                  Spent: <b>{moneyFromCents(r.spentCents)}</b>{" "}
                  {r.limitCents > 0 && <>/ {moneyFromCents(r.limitCents)}</>}
                </div>
                {r.limitCents > 0 ? (
                  r.overCents > 0 ? (
                    <div className="text-red-600">Over by {moneyFromCents(r.overCents)}</div>
                  ) : (
                    <div className="text-emerald-600">Left: {moneyFromCents(r.leftCents)}</div>
                  )
                ) : (
                  <div className="text-gray-500">No limit set</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

