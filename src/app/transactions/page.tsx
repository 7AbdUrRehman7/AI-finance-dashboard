//src/app/transactions/page.tsx
import Link from "next/link";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { Transaction } from "@/models/Transaction"; // ok if unused
import { Category } from "@/models/Category";
import { CategorySelect } from "@/components/CategorySelect";
import ApplySuggestionsButton from "@/components/ApplySuggestionsButton";
import ApplyAISuggestionsButton from "@/components/ApplyAISuggestionsButton";
import AddTransactionButton from "@/components/AddTransactionButton";
import DeleteTransactionButton from "@/components/DeleteTransactionButton";
import UncategorizedBadge from "@/components/UncategorizedBadge";
import TransactionsFilterBar from "@/components/TransactionsFilterBar";
import Pagination from "@/components/Pagination";

const money = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });
const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });

type SP = Record<string, string | undefined>;

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  await db();

  // Categories (for selects and the filter bar)
  const categories = await Category.find({}).sort({ name: 1 }).lean();
  const categoriesPlain = categories.map((c: any) => ({ _id: String(c._id), name: String(c.name) }));

  // Build query string from current search params (this is the canonical, normalized set)
  const sp = await searchParams;
  const allowed = [
    "text",
    "categoryId",
    "from",
    "to",
    "min",
    "max",
    "onlyUncategorized",
    "page",
    "limit",
    "sort",
  ];
  const qs = new URLSearchParams();
  for (const k of allowed) {
    const v = sp?.[k];
    if (typeof v === "string" && v.length > 0) qs.set(k, v);
  }
  if (!qs.has("limit")) qs.set("limit", "10"); // default rows/page

  // For API call
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
  const data: { page: number; pageSize: number; total: number; items: any[] } = await res.json();
  const txns = data.items;

  const page = Number(sp.page ?? data.page ?? 1);
  const pageSize = Number(sp.limit ?? data.pageSize ?? 10);
  const start = data.total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = data.total === 0 ? 0 : Math.min(page * pageSize, data.total);

  // Build baseQuery for Pagination (current filters WITHOUT page/limit)
  const baseQS = new URLSearchParams(qs);
  baseQS.delete("page");
  baseQS.delete("limit");
  const baseQuery = baseQS.toString();

  // Build the export URL from the SAME normalized qs (drop pagination so we export all rows)
  const exportQS = new URLSearchParams(qs);
  exportQS.delete("page");
  exportQS.delete("limit");
  const exportHref =
    exportQS.toString().length > 0
      ? `/api/transactions/export?${exportQS.toString()}`
      : `/api/transactions/export`;

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-4">
      {/* Header */}
      <section className="rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[1px] shadow-sm">
        <div className="rounded-2xl bg-white px-6 py-5 dark:bg-neutral-950">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">Recent Transactions</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {txns.length} of {data.total}
                  </p>
                </div>
                <UncategorizedBadge />
              </div>
              {/* Suggestions */}
              <div className="flex items-center gap-2">
                <ApplySuggestionsButton />
                <ApplyAISuggestionsButton />
              </div>
            </div>

            {/* Import + Add */}
            <div className="flex items-center gap-2">
              <Link
                href="/import"
                className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/10"
              >
                Import CSV
              </Link>
              <AddTransactionButton />
            </div>
          </div>
        </div>
      </section>

      {/* Filters (with filter-aware Export CSV inside) */}
      <TransactionsFilterBar
        categories={categoriesPlain}
        initial={{
          text: sp.text,
          categoryId: sp.categoryId,
          from: sp.from,
          to: sp.to,
          min: sp.min,
          max: sp.max,
          onlyUncategorized: sp.onlyUncategorized,
        }}
        exportHref={exportHref}
      />

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
                  No transactions match your filters.
                </td>
              </tr>
            )}
            {txns.map((t: any) => {
              const isIncome = t.amountCents > 0;
              const catId = t.categoryId ? String(t.categoryId) : "";
              return (
                <tr
                  key={t.id}
                  className="border-t border-gray-100 transition hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
                >
                  <td className="p-3 whitespace-nowrap">{fmtDate(t.postedAt)}</td>
                  <td className="p-3">{t.merchant || t.rawDesc || "-"}</td>
                  <td className="p-3">
                    <CategorySelect txId={String(t.id)} categories={categoriesPlain as any} value={catId} />
                  </td>
                  <td
                    className={`p-3 text-right font-mono tabular-nums ${
                      isIncome ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {money.format(t.amountCents / 100)}
                  </td>
                  <td className="p-3 text-right">
                    <DeleteTransactionButton txId={String(t.id)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Single (bottom-only) pagination */}
        <div className="flex items-center justify-between p-3 text-sm text-gray-600 dark:text-gray-400">
          <span>
            Showing {start}-{end} of {data.total}
          </span>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={data.total}
            baseQuery={baseQuery}
          />
        </div>
      </div>
    </main>
  );
}

