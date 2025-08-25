import { db } from "@/lib/db";
import { Transaction } from "@/models/Transaction";
import { Category } from "@/models/Category";

function parseMonthParam(url: string) {
  const u = new URL(url);
  const ym = u.searchParams.get("month") || new Date().toISOString().slice(0, 7); // YYYY-MM
  if (!/^\d{4}-\d{2}$/.test(ym)) return null;
  const [y, m] = ym.split("-").map(Number);
  const start = new Date(Date.UTC(y, (m ?? 1) - 1, 1));
  const end = new Date(Date.UTC(y, (m ?? 1), 1));
  return { ym, start, end };
}

export async function GET(req: Request) {
  await db();

  const parsed = parseMonthParam(req.url);
  if (!parsed) {
    return new Response(JSON.stringify({ error: "Bad month. Use YYYY-MM." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const { ym, start, end } = parsed;

  // Aggregate per category for the month
  const perCat = await Transaction.aggregate([
    { $match: { postedAt: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: "$categoryId", // may be null
        totalCents: { $sum: "$amountCents" },
      },
    },
  ]).exec();

  // Map categoryId -> name
  const catIds = perCat.map((r) => r._id).filter(Boolean);
  const catDocs = await Category.find({ _id: { $in: catIds } })
    .select({ _id: 1, name: 1 })
    .lean();

  const nameById = new Map<string, string>(
    catDocs.map((c: any) => [String(c._id), c.name as string]),
  );

  // Build response rows (include Uncategorized if _id is null)
  const byCategory = perCat
    .map((r: any) => {
      const id = r._id ? String(r._id) : "";
      const name = r._id ? nameById.get(id) ?? "Other" : "Uncategorized";
      return { categoryId: id, name, totalCents: r.totalCents as number };
    })
    // optional: hide true zeros
    .filter((r) => r.totalCents !== 0)
    // sort biggest magnitude first
    .sort((a, b) => Math.abs(b.totalCents) - Math.abs(a.totalCents));

  const netCents = byCategory.reduce((s, r) => s + r.totalCents, 0);
  const incomeCents = byCategory
    .filter((r) => r.totalCents > 0)
    .reduce((s, r) => s + r.totalCents, 0);
  const expenseCents = byCategory
    .filter((r) => r.totalCents < 0)
    .reduce((s, r) => s + r.totalCents, 0);

  return new Response(
    JSON.stringify({
      month: ym,
      netCents,
      incomeCents,
      expenseCents,
      byCategory,
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

