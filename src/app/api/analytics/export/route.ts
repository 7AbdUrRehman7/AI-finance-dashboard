import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { Transaction } from "@/models/Transaction";

type SummaryRow = {
  category: string;
  totalCents: number;
};

// Parse "YYYY-MM" -> [start, end)
function monthWindow(ym?: string) {
  const valid = /^\d{4}-\d{2}$/.test(ym ?? "");
  const used = valid ? (ym as string) : new Date().toISOString().slice(0, 7);
  const [y, m] = used.split("-").map(Number);
  const start = new Date(y, (m ?? 1) - 1, 1);
  const end = new Date(y, (m ?? 1), 1);
  return { used, start, end };
}

function csvEscape(s: string) {
  // Wrap in quotes if needed; escape quotes by doubling them
  const needs = /[",\n]/.test(s);
  const escaped = s.replaceAll('"', '""');
  return needs ? `"${escaped}"` : escaped;
}

function toCsv(rows: SummaryRow[]) {
  const header = "category,totalCents,total\n";
  const lines = rows.map((r) =>
    [csvEscape(r.category), String(r.totalCents), (r.totalCents / 100).toFixed(2)].join(",")
  );
  return header + lines.join("\n") + "\n";
}

export async function GET(req: NextRequest) {
  await db();

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") ?? undefined;
  const { used, start, end } = monthWindow(month);

  // Aggregate per-category totals for the month
  const agg = await Transaction.aggregate([
    { $match: { postedAt: { $gte: start, $lt: end } } },
    { $group: { _id: "$categoryId", totalCents: { $sum: "$amountCents" } } },
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
        totalCents: 1,
      },
    },
    { $sort: { totalCents: 1 } },
  ]);

  // Type the final shape without using `any`
  const rows = agg as unknown as SummaryRow[];
  const csv = toCsv(rows);

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="summary-${used}.csv"`,
      "cache-control": "no-store",
    },
  });
}

