import { db } from "@/lib/db";
import { Budget } from "@/models/Budget";
import { Category } from "@/models/Category";
import MonthFilter from "@/components/MonthFilter";
import CopyBudgetsButton from "@/components/CopyBudgetsButton";
import BudgetEditor from "@/components/BudgetEditor";
import { Transaction } from "@/models/Transaction";

// month helper
function monthWindow(ym?: string) {
  const valid = /^\d{4}-\d{2}$/.test(ym ?? "");
  const used = valid ? (ym as string) : new Date().toISOString().slice(0, 7);
  const [y, m] = used.split("-").map(Number);
  const start = new Date(y, (m ?? 1) - 1, 1);
  const end = new Date(y, (m ?? 1), 1);
  return { used, start, end };
}

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await db();
  const sp = await searchParams;
  const { used: month, start, end } = monthWindow(sp?.month);

  // Plain categories for client component (avoid ObjectId leakage)
  const cats = await Category.find({}).sort({ name: 1 }).lean();
  const categories = cats.map((c: any) => ({ id: String(c._id), name: c.name as string }));

  // Plain budgets for client component
  const bs = await Budget.find({ month }).lean();
  const initialBudgets = bs.map((b: any) => ({
    categoryId: String(b.categoryId),
    limitCents: Number(b.limitCents) || 0,
  }));

  // Compute SPENT per category (positive cents) for this month
  const byCat = await Transaction.aggregate([
    { $match: { postedAt: { $gte: start, $lt: end } } },
    { $group: { _id: "$categoryId", total: { $sum: "$amountCents" } } },
  ]);

  // build map categoryId -> positive spent cents (ignore income)
  const spentByCategory: Record<string, number> = {};
  for (const r of byCat) {
    const catId = String(r._id ?? "");
    const cents = Number(r.total) || 0;
    spentByCategory[catId] = cents < 0 ? -cents : 0; // only expenses
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      {/* Header: month picker + copy button */}
      <section className="rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[1px] shadow-sm">
        <div className="rounded-2xl bg-white px-6 py-5 dark:bg-neutral-950">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">Budgets ({month})</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Set limits for your categories. Use the button to copy last month’s budgets.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <MonthFilter />
              <CopyBudgetsButton month={month} />
            </div>
          </div>
        </div>
      </section>

      {/* Editable table (rounded box, clipped corners) */}
      <section className="overflow-hidden rounded-2xl border dark:border-white/10">
        <BudgetEditor
          month={month}
          categories={categories}
          initialBudgets={initialBudgets}
          spentByCategory={spentByCategory}
        />
      </section>
    </main>
  );
}

