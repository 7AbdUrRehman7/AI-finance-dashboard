import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { Transaction } from "@/models/Transaction";

type Totals = {
  incomeCents: number;
  expenseCents: number; // negative number (sum of expenses)
  netCents: number;     // income + expense
};

type ByCategoryRow = {
  categoryId: string | null; // category id as string, or null for Uncategorized
  category: string;
  totalCents: number;        // can be positive or negative
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

export async function GET(req: NextRequest) {
  await db();

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") ?? undefined;
  const { used, start, end } = monthWindow(month);

  // Overall totals for the month
  const totalsAgg = await Transaction.aggregate([
    { $match: { postedAt: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: null,
        incomeCents: {
          $sum: { $cond: [{ $gt: ["$amountCents", 0] }, "$amountCents", 0] },
        },
        expenseCents: {
          $sum: { $cond: [{ $lt: ["$amountCents", 0] }, "$amountCents", 0] },
        },
        netCents: { $sum: "$amountCents" },
      },
    },
    { $project: { _id: 0, incomeCents: 1, expenseCents: 1, netCents: 1 } },
  ]);

  const totals: Totals =
    totalsAgg[0] ?? { incomeCents: 0, expenseCents: 0, netCents: 0 };

  // Per-category totals for the month (project id as string to avoid ObjectId in JSON)
  const catAgg = await Transaction.aggregate([
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
        categoryId: {
          $cond: [
            { $ifNull: ["$_id", false] },
            { $toString: "$_id" },
            null,
          ],
        },
        category: { $ifNull: [{ $first: "$cat.name" }, "Uncategorized"] },
        totalCents: 1,
      },
    },
    { $sort: { totalCents: 1 } },
  ]);

  const byCategory = catAgg as unknown as ByCategoryRow[];

  return Response.json({
    month: used,
    totals,
    byCategory,
  });
}

