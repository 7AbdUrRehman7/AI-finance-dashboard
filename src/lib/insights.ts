// src/lib/insights.ts
import { Transaction } from "@/models/Transaction";

export type Insights = {
  topCategory: { category: string; spentCents: number } | null;
  deltaCategory: { category: string; deltaCents: number } | null; // + = more spend vs last month
  spikeDay: { date: string; netCents: number } | null;            // largest absolute net day
};

export function ensureMonth(ym?: string | null): string {
  const valid = /^\d{4}-\d{2}$/.test(ym ?? "");
  if (valid) return ym as string;
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function monthWindow(ym: string) {
  const [yStr, mStr] = ym.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);
  return { start, end };
}

export function prevMonth(ym: string) {
  const [yStr, mStr] = ym.split("-");
  let y = Number(yStr);
  let m = Number(mStr) - 1;
  if (m === 0) {
    m = 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

export async function analyzeMonth(month: string): Promise<Insights> {
  const { start, end } = monthWindow(month);

  // Per-category totals (+income, -expense) for this month
  const byCategory: Array<{ category: string; total: number }> = await Transaction.aggregate([
    { $match: { postedAt: { $gte: start, $lt: end } } },
    { $group: { _id: "$categoryId", total: { $sum: "$amountCents" } } },
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
        total: 1,
      },
    },
  ]);

  // Top spend category (largest expense -> most negative total)
  let topCategory: Insights["topCategory"] = null;
  for (const r of byCategory) {
    const spent = r.total < 0 ? -r.total : 0;
    if (!topCategory || spent > topCategory.spentCents) {
      topCategory = { category: r.category, spentCents: spent };
    }
  }

  // Biggest change vs previous month (by expense)
  const prev = prevMonth(month);
  const { start: pStart, end: pEnd } = monthWindow(prev);

  const prevByCat: Array<{ category: string; total: number }> = await Transaction.aggregate([
    { $match: { postedAt: { $gte: pStart, $lt: pEnd } } },
    { $group: { _id: "$categoryId", total: { $sum: "$amountCents" } } },
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
        total: 1,
      },
    },
  ]);

  const spentThis = new Map<string, number>();
  for (const r of byCategory) spentThis.set(r.category, r.total < 0 ? -r.total : 0);
  const spentPrev = new Map<string, number>();
  for (const r of prevByCat) spentPrev.set(r.category, r.total < 0 ? -r.total : 0);

  const allCats = new Set<string>([...spentThis.keys(), ...spentPrev.keys()]);
  let deltaCategory: Insights["deltaCategory"] = null;
  for (const cat of allCats) {
    const a = spentThis.get(cat) ?? 0;
    const b = spentPrev.get(cat) ?? 0;
    const delta = a - b; // + means more spend than last month
    if (!deltaCategory || Math.abs(delta) > Math.abs(deltaCategory.deltaCents)) {
      deltaCategory = { category: cat, deltaCents: delta };
    }
  }

  // Spike day (largest absolute net)
  const byDay: Array<{ date: string; netCents: number; abs: number }> = await Transaction.aggregate([
    { $match: { postedAt: { $gte: start, $lt: end } } },
    {
      $project: {
        date: { $dateToString: { format: "%Y-%m-%d", date: "$postedAt" } },
        amountCents: 1,
      },
    },
    { $group: { _id: "$date", netCents: { $sum: "$amountCents" } } },
    { $project: { _id: 0, date: "$_id", netCents: 1, abs: { $abs: "$netCents" } } },
    { $sort: { abs: -1 } },
    { $limit: 1 },
  ]);

  const spikeDay = byDay.length
    ? ({ date: byDay[0].date, netCents: byDay[0].netCents } as const)
    : null;

  return { topCategory, deltaCategory, spikeDay };
}

