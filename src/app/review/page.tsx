import Link from "next/link";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { Category } from "@/models/Category";
import ReviewTable from "@/components/ReviewTable";

type SP = Record<string, string | undefined>;

const allowed = [
  "text",
  "categoryId",
  "from",
  "to",
  "min",
  "max",
  "onlyUncategorized",
  "limit",
  "page", // added so paging flows through to the API
] as const;

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  await db();

  const sp = await searchParams;

  // Categories (plain -> safe for client)
  const categories = await Category.find({}).sort({ name: 1 }).lean();
  const categoriesPlain = categories.map((c: any) => ({
    _id: String(c._id),
    name: String(c.name),
  }));

  // Build query string for server fetch (defaults: uncategorized, limit 10, page 1)
  const qs = new URLSearchParams();
  for (const k of allowed) {
    const v = sp?.[k];
    if (typeof v === "string" && v.length > 0) qs.set(k, v);
  }
  if (!qs.has("onlyUncategorized")) qs.set("onlyUncategorized", "1");
  if (!qs.has("limit")) qs.set("limit", "10"); // match Transactions default
  if (!qs.has("page")) qs.set("page", "1");

  // Absolute base URL (await headers() in Next 15)
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const base = `${proto}://${host}`;

  // Fetch items to review
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
      category?: string | null;
    }>;
  } = await res.json();

  // Compact, safe payload for the client table
  const items = data.items.map((t) => ({
    id: String(t.id),
    merchant: t.merchant ?? t.rawDesc ?? "-",
    postedAt: t.postedAt,
    amountCents: Number(t.amountCents),
    categoryId: t.categoryId ? String(t.categoryId) : "",
    category: t.category ?? "",
  }));

  // Default to keeping uncategorized-first behavior enabled
  const uncFirst = sp?.uncFirst === "0" ? false : true;

  // Build baseQuery for Pagination (current filters WITHOUT page/limit)
  const baseQS = new URLSearchParams(qs);
  baseQS.delete("page");
  baseQS.delete("limit");
  const baseQuery = baseQS.toString();

  const page = Number(sp.page ?? data.page ?? 1);
  const pageSize = Number(sp.limit ?? data.pageSize ?? 10);

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-4">
      {/* Header */}
      <section className="rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[1px] shadow-sm">
        <div className="rounded-2xl bg-white px-6 py-5 dark:bg-neutral-950">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Review</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Quickly clean up uncategorized transactions and apply bulk changes.
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

      {/* Client table with selection + bulk apply + pagination */}
      <ReviewTable
        initialItems={items}
        categories={categoriesPlain}
        uncFirstDefault={uncFirst}
        page={page}
        pageSize={pageSize}
        total={data.total}
        baseQuery={baseQuery}
        basePath="/review"
      />
    </main>
  );
}

