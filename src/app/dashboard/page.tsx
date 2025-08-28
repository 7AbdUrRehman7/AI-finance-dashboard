import { db } from "@/lib/db";
import { Transaction } from "@/models/Transaction";
import { Budget } from "@/models/Budget";
import CategoryPie from "@/components/charts/CategoryPie";
import MonthFilter from "@/components/MonthFilter";
import MonthlyTrend from "@/components/charts/MonthlyTrend";
import Link from "next/link";

const money = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

// Parse YYYY-MM -> [start, end)
function monthWindow(ym?: string) {
  const valid = /^\d{4}-\d{2}$/.test(ym ?? "");
  const used = valid ? (ym as string) : new Date().toISOString().slice(0, 7);
  const [y, m] = used.split("-").map(Number);
  const start = new Date(y, (m ?? 1) - 1, 1);
  const end = new Date(y, (m ?? 1), 1);
  return { used, start, end };
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await db();

  const sp = await searchParams;
  const { used: month, start, end } = monthWindow(sp?.month);

  // ── Per-category totals for the month (+income, -expense)
  const byCategory = await Transaction.aggregate([
    { $match: { postedAt: { $gte: start, $lt: end } } },
    { $group: { _id: "$categoryId", total: { $sum: "$amountCents" } } },
    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "_id",
        as: "cat",
      },
    },
    {
      $project: {
        _id: 0,
        category: { $ifNull: [{ $first: "$cat.name" }, "Uncategorized"] },
        total: 1,
      },
    },
    { $match: { total: { $ne: 0 } } },
    { $addFields: { absTotal: { $abs: "$total" } } },
    { $sort: { absTotal: -1 } },
    { $project: { absTotal: 0 } },
  ]);

  const net = byCategory.reduce((s: number, r: any) => s + r.total, 0);
  const netClass = net < 0 ? "text-rose-600" : "text-emerald-600";

  // ── Budgets for the month (by category name) + spent mapping
  const budgets = await Budget.aggregate([
    { $match: { month } },
    {
      $lookup: {
        from: "categories",
        localField: "categoryId",
        foreignField: "_id",
        as: "cat",
      },
    },
    {
      $project: {
        _id: 0,
        category: { $ifNull: [{ $first: "$cat.name" }, "Uncategorized"] },
        limitCents: 1,
      },
    },
  ]);

  // Map of category -> budget limit
  const budgetLimitByCat = new Map<string, number>();
  for (const b of budgets as any[]) budgetLimitByCat.set(b.category, b.limitCents);

  // Compute "spent" per category from byCategory (expenses only)
  const spentByCat = new Map<string, number>();
  for (const r of byCategory as any[]) {
    const spent = r.total < 0 ? -r.total : 0;
    spentByCat.set(r.category, spent);
  }

  // Budgets strip totals (sum only categories that have a budget)
  let totalBudgetedLimit = 0;
  let totalBudgetedSpend = 0;
  for (const b of budgets as any[]) {
    const lim = b.limitCents ?? 0;
    const spCents = spentByCat.get(b.category) ?? 0;
    totalBudgetedLimit += lim;
    totalBudgetedSpend += spCents;
  }

  // Left (positive = under budget; negative = over)
  const leftCents = totalBudgetedLimit - totalBudgetedSpend;
  const leftClass = leftCents < 0 ? "text-rose-600" : "text-emerald-600";

  // ── Daily income/expense lines for the chart
  const daily = await Transaction.aggregate([
    { $match: { postedAt: { $gte: start, $lt: end } } },
    {
      $project: {
        day: { $dateToString: { format: "%Y-%m-%d", date: "$postedAt" } },
        amountCents: 1,
      },
    },
    {
      $group: {
        _id: "$day",
        incomeCents: { $sum: { $cond: [{ $gt: ["$amountCents", 0] }, "$amountCents", 0] } },
        expenseCents: { $sum: { $cond: [{ $lt: ["$amountCents", 0] }, "$amountCents", 0] } },
        netCents: { $sum: "$amountCents" },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: "$_id", incomeCents: 1, expenseCents: 1, netCents: 1 } },
  ]);

  const byDay = new Map(daily.map((r: any) => [r.date, r]));
  const points: { date: string; incomeCents: number; expenseCents: number; netCents: number }[] = [];
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const key = ymd(d);
    const r = byDay.get(key);
    points.push({
      date: key,
      incomeCents: r?.incomeCents ?? 0,
      expenseCents: r?.expenseCents ?? 0,
      netCents: r?.netCents ?? 0,
    });
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      {/* Header card */}
      <section className="mb-6 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[1px] shadow-sm">
        <div className="rounded-2xl bg-white px-6 py-5 dark:bg-neutral-950">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">This Month ({month})</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Overview of your categorized spending and income
              </p>
            </div>
            <div className="flex items-center gap-2">
              <MonthFilter />
              <Link
                href={`/api/analytics/export?month=${encodeURIComponent(month)}`}
                className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/10"
              >
                Export Summary CSV
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Net total card */}
      <section className="rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[1px] shadow-sm">
        <div className="rounded-2xl bg-white px-6 py-5 dark:bg-neutral-950">
          <div className="text-sm text-gray-600 dark:text-gray-400">Net total</div>
          <div className={`text-3xl font-semibold ${netClass}`}>{money.format(net / 100)}</div>
        </div>
      </section>

      {/* Budget vs Spend strip (headline + always-visible breakdown + amount) */}
      <section className="rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[1px] shadow-sm">
        <div className="rounded-2xl bg-white px-6 py-5 dark:bg-neutral-950">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Budget vs Spend</div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Budgeted {money.format(totalBudgetedLimit / 100)} — Spent{" "}
                {money.format(totalBudgetedSpend / 100)}
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {budgets.length} categories budgeted
            </div>
          </div>

          <div className="mt-2 flex items-center justify-start">
            <span className={`text-2xl font-semibold ${leftClass}`}>
              {money.format(leftCents / 100)}
            </span>
          </div>
        </div>
      </section>

      {/* Income vs Expenses (Daily) */}
      <section className="rounded-2xl border p-4 dark:border-white/10">
        <h2 className="mb-3 text-lg font-semibold">Income vs Expenses (Daily)</h2>
        <MonthlyTrend data={points} />
      </section>

      {/* Category totals table (with budget badges + hover tooltips) */}
      <section className="overflow-hidden rounded-2xl border dark:border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100">
            <tr>
              <th className="p-2 text-left">Category</th>
              <th className="p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {(byCategory as any[]).map((r) => {
              const limit = budgetLimitByCat.get(r.category);
              const spent = r.total < 0 ? -r.total : 0; // expense only
              let badge: JSX.Element | null = null;

              if (typeof limit === "number" && limit > 0) {
                const tooltip = `Budgeted ${money.format(limit / 100)} — Spent ${money.format(
                  spent / 100
                )}`;

                if (spent > limit) {
                  const over = spent - limit;
                  badge = (
                    <span
                      title={tooltip}
                      className="ml-3 rounded-full bg-rose-900/20 px-2.5 py-0.5 text-xs font-medium text-rose-300 ring-1 ring-rose-500/30"
                    >
                      Over by {money.format(over / 100)}
                    </span>
                  );
                } else {
                  const pct = Math.round((spent / limit) * 100);
                  badge = (
                    <span
                      title={tooltip}
                      className="ml-3 rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium text-gray-300 ring-1 ring-white/10"
                    >
                      {pct}% used
                    </span>
                  );
                }
              }

              return (
                <tr key={r.category} className="border-t dark:border-white/10">
                  <td className="p-2">
                    <div className="flex items-center">
                      <span>{r.category}</span>
                      {badge}
                    </div>
                  </td>
                  <td
                    className={`p-2 text-right font-mono tabular-nums ${
                      r.total < 0 ? "text-rose-600" : "text-emerald-600"
                    }`}
                  >
                    {money.format(r.total / 100)}
                  </td>
                </tr>
              );
            })}
            {byCategory.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-500 dark:text-gray-400" colSpan={2}>
                  No transactions in this month.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Category breakdown pie */}
      <section className="rounded-2xl border p-4 dark:border-white/10">
        <h2 className="mb-3 text-lg font-semibold">Category Breakdown</h2>
        <CategoryPie data={byCategory as any} />
      </section>
    </main>
  );
}

