import { db } from "../../lib/db";
import { Transaction } from "../../models/Transaction";
import { Category } from "../../models/Category";
import { CategorySelect } from "../../components/CategorySelect";
import { ApplySuggestionsButton } from "../../components/ApplySuggestionsButton";
import { ApplyAISuggestionsButton } from "../../components/ApplyAISuggestionsButton";
import { UncategorizedBadge } from "../../components/UncategorizedBadge";
import { DeleteTransactionButton } from "../../components/DeleteTransactionButton";
import { AddTransactionButton } from "../../components/AddTransactionButton";

const money = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });
const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });

export default async function TransactionsPage() {
  await db();
  const [txns, categories] = await Promise.all([
    Transaction.find({}).sort({ postedAt: -1 }).limit(200).lean(),
    Category.find({}).sort({ name: 1 }).lean(),
  ]);

  // 🔑 Make categories safe for Client Components
  const catOptions = categories.map((c: any) => ({
    id: String(c._id),
    name: c.name as string,
  }));

  return (
    <main className="mx-auto max-w-5xl p-6">
{/* Header card */}
<section className="mb-6 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[1px] shadow-sm">
  <div className="rounded-2xl bg-white px-6 py-5 dark:bg-neutral-950">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recent Transactions</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing your latest {txns.length} records
          </p>
        </div>
        <UncategorizedBadge />
      </div>
      <div className="flex items-center gap-3">
        <AddTransactionButton categories={catOptions} />
        <ApplySuggestionsButton />
        <ApplyAISuggestionsButton />
      </div>
    </div>
  </div>
</section>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm dark:border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100">
            <tr>
              <th className="p-3 text-left font-medium">Date</th>
              <th className="p-3 text-left font-medium">Merchant</th>
              <th className="p-3 text-left font-medium">Category</th>
              <th className="p-3 text-right font-medium">Amount</th>
              <th className="p-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {txns.length === 0 && (
              <tr>
                <td className="p-6 text-center text-gray-500 dark:text-gray-400" colSpan={5}>
                  No transactions yet.
                </td>
              </tr>
            )}
            {txns.map((t: any) => {
              const isIncome = t.amountCents > 0;
              const txId = String(t._id);
              const catId = t.categoryId ? String(t.categoryId) : "";

              return (
                <tr
                  key={txId}
                  className="border-t border-gray-100 transition hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
                >
                  <td className="p-3 whitespace-nowrap">{fmtDate(t.postedAt)}</td>
                  <td className="p-3">{t.merchant || t.rawDesc || "—"}</td>
                  <td className="p-3">
                    {/* pass ONLY plain values to client component */}
                    <CategorySelect txId={txId} categories={catOptions} value={catId} />
                  </td>
                  <td
                    className={`p-3 text-right font-mono tabular-nums ${
                      isIncome ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {money.format(t.amountCents / 100)}
                  </td>
                  <td className="p-3 text-right">
                    <DeleteTransactionButton id={txId} />
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

