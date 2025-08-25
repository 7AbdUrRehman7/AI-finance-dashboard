import { db } from "../../lib/db";
import { Transaction } from "../../models/Transaction";
import { Category } from "../../models/Category";
import { CategorySelect } from "../../components/CategorySelect";

const money = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

export default async function TransactionsPage() {
  await db();

  const [txns, categories] = await Promise.all([
    Transaction.find({}).sort({ postedAt: -1 }).limit(200).lean(),
    Category.find({}).sort({ name: 1 }).lean(),
  ]);

  // Convert Mongoose ObjectIds to plain strings for the client component
  const cats = (categories as any[]).map((c) => ({ _id: String(c._id), name: c.name }));

  return (
    <main className="mx-auto max-w-5xl p-6">
      {/* Header card */}
      <section className="mb-6 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[1px] shadow-sm">
        <div className="rounded-2xl bg-white px-6 py-5 dark:bg-neutral-950">
          <h1 className="text-2xl font-semibold tracking-tight">Recent Transactions</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing your latest {txns.length} records
          </p>
        </div>
      </section>

      {/* Table card */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm dark:border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100">
            <tr>
              <th className="p-3 text-left font-medium">Date</th>
              <th className="p-3 text-left font-medium">Merchant</th>
              <th className="p-3 text-left font-medium">Category</th>
              <th className="p-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {txns.length === 0 && (
              <tr>
                <td className="p-6 text-center text-gray-500 dark:text-gray-400" colSpan={4}>
                  No transactions yet.
                </td>
              </tr>
            )}
            {txns.map((t: any) => {
              const isIncome = t.amountCents > 0;
              const catId = t.categoryId ? String(t.categoryId) : "";
              return (
                <tr
                  key={String(t._id)}
                  className="border-t border-gray-100 transition hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
                >
                  <td className="p-3 whitespace-nowrap">{fmtDate(t.postedAt)}</td>
                  <td className="p-3">{t.merchant || t.rawDesc || "—"}</td>
                  <td className="p-3">
                    <CategorySelect txId={String(t._id)} categories={cats} value={catId} />
                  </td>
                  <td
                    className={`p-3 text-right font-mono tabular-nums ${
                      isIncome ? "text-emerald-600" : "text-rose-500"
                    }`}
                  >
                    {money.format(t.amountCents / 100)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}

