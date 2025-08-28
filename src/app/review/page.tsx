// src/app/review/page.tsx
import Link from "next/link";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { Category } from "@/models/Category";
import { CategorySelect } from "@/components/CategorySelect";
import DeleteTransactionButton from "@/components/DeleteTransactionButton";

type SP = Record<string, string | undefined>;

const money = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });
const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });

const allowed = [
  "text",
  "categoryId",
  "from",
  "to",
  "min",
  "max",
  "onlyUncategorized",
  "limit",
] as const;

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  await db();

  const sp = await searchParams;

  // Categories (plain for selects)
  const categories = await Category.find({}).sort({ name: 1 }).lean();
  const categoriesPlain = categories.map((c: any) => ({ _id: String(c._id), name: String(c.name) }));

  // Build query string for server fetch (defaults: uncategorized, limit 100)
  const qs = new URLSearchParams();
  for (const k of allowed) {
    const v = sp?.[k];
    if (typeof v === "string" && v.length > 0) qs.set(k, v);
  }
  if (!qs.has("onlyUncategorized")) qs.set("onlyUncategorized", "1");
  if (!qs.has("limit")) qs.set("limit", "100");

  // Absolute base URL (await headers() in Next 15)
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const base = `${proto}://${host}`;

  const res = await fetch(`${base}/api/transactions/search?${qs.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Search API failed (${res.status}): ${body}`);
  }

  const data: {
    page: number;
    pageSize: number;
    total: number;
    items: Array<{
      id: string;
      merchant?: string | null;
      rawDesc?: string | null;
      amountCents: number;
      postedAt: string;
      categoryId?: string | null;
    }>;
  } = await res.json();

  const txns = data.items.map((t) => ({
    id: String(t.id),
    merchant: t.merchant ?? t.rawDesc ?? "-",
    postedAt: t.postedAt,
    amountCents: Number(t.amountCents),
    categoryId: t.categoryId ? String(t.categoryId) : "",
  }));

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-4">
      {/* Header */}
      <section className="rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[1px] shadow-sm">
        <div className="rounded-2xl bg-white px-6 py-5 dark:bg-neutral-950">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Review</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Quickly clean up uncategorized transactions.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/transactions"
                className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/10"
              >
                Go to Transactions
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Simple server-rendered table */}
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
                  Nothing to review. 🎉
                </td>
              </tr>
            )}
            {txns.map((t) => {
              const isIncome = t.amountCents > 0;
              return (
                <tr
                  key={t.id}
                  className="border-t border-gray-100 transition hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
                >
                  <td className="p-3 whitespace-nowrap">{fmtDate(t.postedAt)}</td>
                  <td className="p-3">{t.merchant}</td>
                  <td className="p-3">
                    <CategorySelect
                      txId={t.id}
                      categories={categoriesPlain as any}
                      value={t.categoryId}
                    />
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
      </div>
    </main>
  );
}

