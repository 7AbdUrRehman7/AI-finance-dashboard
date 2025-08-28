import { db } from "@/lib/db";
import { Suggestion } from "@/models/Suggestion";

export const revalidate = 0;

export async function GET() {
  await db();

  // Join with transactions & categories for a useful preview
  const rows = await Suggestion.aggregate([
    { $match: { status: "pending" } },
    {
      $lookup: {
        from: "transactions",
        localField: "txId",
        foreignField: "_id",
        as: "tx",
      },
    },
    { $unwind: "$tx" },
    {
      $lookup: {
        from: "categories",
        localField: "suggestedCategoryId",
        foreignField: "_id",
        as: "cat",
      },
    },
    { $unwind: "$cat" },
    {
      $project: {
        _id: 0,
        txId: "$txId",
        suggestedCategoryId: 1,
        score: 1,
        source: 1,
        merchant: "$tx.merchant",
        rawDesc: "$tx.rawDesc",
        amountCents: "$tx.amountCents",
        postedAt: "$tx.postedAt",
        suggestedCategory: "$cat.name",
        createdAt: 1,
      },
    },
    { $sort: { score: -1, createdAt: -1 } },
    { $limit: 500 },
  ]);

  // stringify ObjectIds for safety
  const suggestions = rows.map((r: any) => ({
    txId: String(r.txId),
    suggestedCategoryId: String(r.suggestedCategoryId),
    score: Number(r.score),
    source: String(r.source),
    merchant: r.merchant ?? null,
    rawDesc: r.rawDesc ?? null,
    amountCents: Number(r.amountCents),
    postedAt: r.postedAt,
    suggestedCategory: String(r.suggestedCategory),
    createdAt: r.createdAt,
  }));

  return Response.json(
    { count: suggestions.length, suggestions },
    { headers: { "cache-control": "no-store" } }
  );
}

