
import { db } from "@/lib/db";
import { Transaction } from "@/models/Transaction";
import { Category } from "@/models/Category";
import { Suggestion } from "@/models/Suggestion";
import { heuristicSuggest } from "@/lib/suggest";
import { Types } from "mongoose";
import type { AnyBulkWriteOperation } from "mongodb";

export const revalidate = 0;

export async function POST() {
  await db();

  // Build a case-insensitive map: category name -> id
  const cats = await Category.find({}).lean();
  const byName = new Map<string, string>();
  for (const c of cats as any[]) {
    byName.set(String(c.name).toLowerCase(), String(c._id));
  }

  // Skip tx that are already queued as pending
  const existing = await Suggestion.find({ status: "pending" }, { txId: 1 }).lean();
  const pendingTxIds = new Set(existing.map((s: any) => String(s.txId)));

  // Only uncategorized tx
  const txns = await Transaction.find({
    $or: [{ categoryId: null }, { categoryId: { $exists: false } }],
  })
    .sort({ postedAt: -1 })
    .limit(1000)
    .lean();

  const ops: AnyBulkWriteOperation[] = [];
  let scanned = 0;
  let created = 0;

  for (const t of txns as any[]) {
    scanned++;
    const txId = String(t._id);
    if (pendingTxIds.has(txId)) continue;

    const s = heuristicSuggest({
      merchant: t.merchant,
      rawDesc: t.rawDesc,
      amountCents: t.amountCents,
    });
    if (!s) continue;

    const catId = byName.get(s.category.toLowerCase());
    if (!catId) continue;

    created++;
    ops.push({
      updateOne: {
        filter: { txId: new Types.ObjectId(txId), status: "pending" },
        update: {
          $set: {
            txId: new Types.ObjectId(txId),
            suggestedCategoryId: new Types.ObjectId(catId),
            score: s.score,
            source: s.source,
            status: "pending",
          },
        },
        upsert: true,
      },
    });
  }

  if (ops.length > 0) {
    await Suggestion.bulkWrite(ops, { ordered: false });
  }

  return Response.json(
    { scanned, created },
    { headers: { "cache-control": "no-store" } }
  );
}
