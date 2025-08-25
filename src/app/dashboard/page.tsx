import { db } from "@/lib/db";
import { Transaction } from "@/models/Transaction";
import CategoryPie from "@/components/charts/CategoryPie";
import MonthFilter from "@/components/MonthFilter";
import MonthlyTrend from "@/components/charts/MonthlyTrend";
import Link from "next/link";

const money = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

// Parse YYYY-MM -> [start, end) using local time (consistent with your inserts)
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

  // 🔹 read ?month=
  const sp = await searchParams;
  const { used: month, start, end } = monthWindow(sp?.month);

  // 🔹 per-category totals for the month
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

  // 🔹 daily income/expense for the selected month (server-side aggregate)
  const daily = await Transaction.aggregate([
    { $match: { postedAt: { $gte: start, $lt: end } } },
    {
      $project: {
        day: { $dateToString: { format: "%Y-%m-%d", date: "$postedAt" } }, // UTC format; fine for chart labels
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

  // Fill missing days so the chart is continuous
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
      {/* Header card — matches /transactions */}
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
                href={`/api/analytics/export?month=${month}`}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-white/10"
                prefetch={false}
              >
                Export CSV
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Net total card */}
      <section className="rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[1px] shadow-sm">
        <div className="rounded-2xl bg-white px-6 py-5 dark:bg-neutral-950">
          <div className="text-sm text-gray-600 dark:text-gray-400">Net total</div>
          <div className={`text-3xl font-semibold ${netClass}`}>
            {money.format(net / 100)}
          </div>
          {byCategory.length === 0 && (
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              No transactions in this month.
            </div>
          )}
        </div>
      </section>

      {/* Income vs Expenses over the month (daily) */}
      <section className="rounded-2xl border p-4 dark:border-white/10">
        <h2 className="mb-3 text-lg font-semibold">Income vs Expenses (Daily)</h2>
        <MonthlyTrend data={points} />
      </section>

      {/* Category totals table */}
      <section className="overflow-hidden rounded-2xl border dark:border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100">
            <tr>
              <th className="p-2 text-left">Category</th>
              <th className="p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {byCategory.map((r: any) => (
              <tr key={r.category} className="border-t dark:border-white/10">
                <td className="p-2">{r.category}</td>
                <td
                  className={`p-2 text-right font-mono tabular-nums ${
                    r.total < 0 ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  {money.format(r.total / 100)}
                </td>
              </tr>
            ))}
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

      {/* Category breakdown chart */}
      <section className="rounded-2xl border p-4 dark:border-white/10">
        <h2 className="mb-3 text-lg font-semibold">Category Breakdown</h2>
        <CategoryPie data={byCategory as any} />
      </section>
    </main>
  );
}

