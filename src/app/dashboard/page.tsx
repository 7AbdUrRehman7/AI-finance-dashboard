import { db } from "@/lib/db";
import { Transaction } from "@/models/Transaction";

const money = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

function monthStartEnd(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return { start, end };
}

export default async function Dashboard() {
  await db();
  const { start, end } = monthStartEnd();

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
    { $sort: { total: 1 } },
  ]);

  const month = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
  const net = byCategory.reduce((s: number, r: any) => s + r.total, 0);

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">This Month ({month})</h1>

      <section className="rounded-2xl border p-4">
        <div className="text-sm text-gray-600">Net total</div>
        <div className="text-2xl font-semibold">{money.format(net / 100)}</div>
      </section>

      <section className="overflow-hidden rounded-2xl border">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100">
            <tr>
              <th className="p-2 text-left">Category</th>
              <th className="p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {byCategory.map((r: any) => (
              <tr key={r.category} className="border-t">
                <td className="p-2">{r.category}</td>
                <td className={`p-2 text-right font-mono tabular-nums ${r.total < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {money.format(r.total / 100)}
                </td>
              </tr>
            ))}
            {byCategory.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={2}>
                  No transactions in this month.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}

