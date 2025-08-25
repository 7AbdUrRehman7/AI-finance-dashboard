import { db } from "@/lib/db";
import { Transaction } from "@/models/Transaction";

/** Parse ?month=YYYY-MM into a local [start, end) window */
function parseMonth(url: string) {
  const u = new URL(url);
  const ym = u.searchParams.get("month") || new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(ym)) return null;
  const [y, m] = ym.split("-").map(Number);
  const start = new Date(y, (m ?? 1) - 1, 1);
  const end = new Date(y, (m ?? 1), 1);
  return { ym, start, end };
}

function ymdLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  await db();
  const parsed = parseMonth(req.url);
  if (!parsed) {
    return new Response(JSON.stringify({ error: "Bad month. Use YYYY-MM." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const { ym, start, end } = parsed;

  // Pull rows for the month with category names
  const rows = await Transaction.aggregate([
    { $match: { postedAt: { $gte: start, $lt: end } } },
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
        postedAt: 1,
        merchant: 1,
        rawDesc: 1,
        amountCents: 1,
        category: { $ifNull: [{ $first: "$cat.name" }, "Uncategorized"] },
      },
    },
    { $sort: { postedAt: 1 } },
  ]);

  // Build CSV
  const header = ["date", "merchant", "description", "category", "amount", "amountCents"];
  const lines = [header.join(",")];

  for (const r of rows as any[]) {
    const date = ymdLocal(new Date(r.postedAt));
    const merchant = csvEscape(r.merchant ?? "");
    const desc = csvEscape(r.rawDesc ?? "");
    const category = csvEscape(r.category ?? "Uncategorized");
    const amountCents = Number(r.amountCents) || 0;
    const amount = (amountCents / 100).toFixed(2); // signed
    lines.push([date, merchant, desc, category, amount, String(amountCents)].join(","));
  }

  // Add UTF-8 BOM for Excel friendliness
  const csv = "\uFEFF" + lines.join("\r\n");
  const filename = `transactions-${ym}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

