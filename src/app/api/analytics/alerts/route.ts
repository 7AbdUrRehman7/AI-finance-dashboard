import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { Transaction } from "@/models/Transaction";
import { Budget } from "@/models/Budget";
import { Category } from "@/models/Category";

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

  const url = new URL(req.url);
  const { used: month, start, end } = monthWindow(url.searchParams.get("month") ?? undefined);
  const threshold = Math.min(0.99, Math.max(0.5, Number(url.searchParams.get("threshold") ?? 0.8)));

  // Budgets for the month with category names
  const budgets = await Budget.aggregate([
    { $match: { month } },
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
        categoryId: "$categoryId",
        category: { $ifNull: [{ $first: "$cat.name" }, "Uncategorized"] },
        limitCents: 1,
      },
    },
  ]);

  // Spent (expenses only) per category in month
  const spend = await Transaction.aggregate([
    { $match: { postedAt: { $gte: start, $lt: end } } },
    {
      $project: {
        categoryId: 1,
        spent: {
          $cond: [{ $lt: ["$amountCents", 0] }, { $abs: "$amountCents" }, 0],
        },
      },
    },
    { $group: { _id: "$categoryId", spentCents: { $sum: "$spent" } } },
  ]);

  const spentById = new Map<string, number>();
  for (const r of spend) spentById.set(String(r._id ?? ""), Number(r.spentCents) || 0);

  const overBudget: Array<{
    categoryId: string;
    category: string;
    limitCents: number;
    spentCents: number;
    overCents: number;
  }> = [];

  const nearing: Array<{
    categoryId: string;
    category: string;
    limitCents: number;
    spentCents: number;
    pctUsed: number;
  }> = [];

  for (const b of budgets as any[]) {
    const id = String(b.categoryId ?? "");
    const limit = Number(b.limitCents) || 0;
    if (limit <= 0) continue;
    const spent = spentById.get(id) ?? 0;

    if (spent > limit) {
      overBudget.push({
        categoryId: id,
        category: b.category,
        limitCents: limit,
        spentCents: spent,
        overCents: spent - limit,
      });
    } else {
      const pct = limit > 0 ? spent / limit : 0;
      if (pct >= threshold) {
        nearing.push({
          categoryId: id,
          category: b.category,
          limitCents: limit,
          spentCents: spent,
          pctUsed: Math.round(pct * 100),
        });
      }
    }
  }

  // Sort most critical first
  overBudget.sort((a, b) => b.overCents - a.overCents);
  nearing.sort((a, b) => b.pctUsed - a.pctUsed);

  const totalOverCents = overBudget.reduce((s, r) => s + r.overCents, 0);

  return Response.json({
    month,
    threshold,
    summary: {
      numOver: overBudget.length,
      numNearing: nearing.length,
      totalOverCents,
    },
    overBudget,
    nearing,
  });
}

