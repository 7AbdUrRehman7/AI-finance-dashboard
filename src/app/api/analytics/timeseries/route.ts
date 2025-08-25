import { db } from "@/lib/db";
import { Transaction } from "@/models/Transaction";

/** Parse ?month=YYYY-MM to local month window [start, end) */
function parseMonth(url: string) {
  const u = new URL(url);
  const ym = u.searchParams.get("month") || new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(ym)) return null;
  const [y, m] = ym.split("-").map(Number);
  const start = new Date(y, (m ?? 1) - 1, 1);
  const end = new Date(y, (m ?? 1), 1);
  return { ym, start, end };
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

  // Group by day using dateTrunc (no string slicing/UTC surprises)
  const rows = await Transaction.aggregate([
    { $match: { postedAt: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: { $dateTrunc: { date: "$postedAt", unit: "day" } },
        incomeCents: {
          $sum: { $cond: [{ $gt: ["$amountCents", 0] }, "$amountCents", 0] },
        },
        expenseCents: {
          $sum: { $cond: [{ $lt: ["$amountCents", 0] }, "$amountCents", 0] },
        },
        netCents: { $sum: "$amountCents" },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: { $dateToString: { date: "$_id", format: "%Y-%m-%d" } },
        incomeCents: 1,
        expenseCents: 1,
        netCents: 1,
      },
    },
  ]).exec();

  // Fill missing days with 0 so the chart is continuous
  const byDay = new Map(rows.map((r: any) => [r.date, r]));
  const points: { date: string; incomeCents: number; expenseCents: number; netCents: number }[] = [];
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const key = ymd(d);
    const r = byDay.get(key);
    points.push({
      date: key,
      incomeCents: r?.incomeCents ?? 0,
      expenseCents: r?.expenseCents ?? 0,
      netCents: r?.netCents ?? 0,
    });
  }

  return new Response(JSON.stringify({ month: ym, points }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

