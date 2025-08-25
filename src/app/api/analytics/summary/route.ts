export const runtime = "nodejs";

import { db } from "../../../../lib/db";
import { Transaction } from "../../../../models/Transaction";

function monthStartEnd(d = new Date()) {
  // local month boundaries
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return { start, end };
}

export async function GET() {
  await db();
  const { start, end } = monthStartEnd();

  const agg = await Transaction.aggregate([
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
        categoryId: "$_id",
        category: { $ifNull: [{ $first: "$cat.name" }, "Uncategorized"] },
        total: 1,
      },
    },
    { $sort: { total: 1 } },
  ]);

  const month = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
  return Response.json({ month, byCategory: agg });
}
