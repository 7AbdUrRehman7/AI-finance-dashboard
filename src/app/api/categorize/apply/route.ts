/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs";

import { db } from "../../../../lib/db";
import { Transaction } from "../../../../models/Transaction";
import { Category } from "../../../../models/Category";
import { suggestCategoryName } from "../../../../lib/rules";

async function applySuggestions() {
  await db();

  // Find recent uncategorized transactions
  const txns = await Transaction.find({
    $or: [{ categoryId: { $exists: false } }, { categoryId: null }],
  })
    .sort({ postedAt: -1 })
    .limit(1000)
    .lean();

  // Build suggestions via rules
  const suggestions: { _id: any; name: string }[] = [];
  const neededNames = new Set<string>();

  for (const t of txns) {
    const name = suggestCategoryName({
      merchant: (t as any).merchant,
      rawDesc: (t as any).rawDesc,
      amountCents: (t as any).amountCents,
    });
    if (name) {
      suggestions.push({ _id: (t as any)._id, name });
      neededNames.add(name);
    }
  }

  // Ensure categories exist for all needed names
  let categoriesCreated = 0;
  for (const name of neededNames) {
    const res = await Category.updateOne(
      { name },
      { $setOnInsert: { name } },
      { upsert: true }
    );
    if ((res as any).upsertedCount) categoriesCreated += 1;
  }

  // Map category name -> _id
  const cats = await Category.find({ name: { $in: Array.from(neededNames) } })
    .select({ _id: 1, name: 1 })
    .lean();
  const nameToId = new Map<string, string>(
    cats.map((c: any) => [c.name, String(c._id)])
  );

  // Bulk write updates (only if we found matches)
  const ops = suggestions
    .map((s) => {
      const categoryId = nameToId.get(s.name);
      if (!categoryId) return null;
      return {
        updateOne: {
          filter: {
            _id: s._id,
            $or: [{ categoryId: { $exists: false } }, { categoryId: null }],
          },
          update: { $set: { categoryId } },
        },
      };
    })
    .filter(Boolean) as any[];

  let applied = 0;
  if (ops.length) {
    const res = await (Transaction as any).bulkWrite(ops);
    // Different driver/Mongoose versions expose different fields — try them in order
    applied =
      (res?.modifiedCount as number) ??
      (res?.nModified as number) ??
      (res?.result?.nModified as number) ??
      0;
  }

  return {
    considered: txns.length,
    suggested: suggestions.length,
    applied,
    categoriesCreated,
  };
}

export async function POST() {
  const result = await applySuggestions();
  return Response.json(result);
}

// Allow GET to trigger from the browser too
export async function GET() {
  const result = await applySuggestions();
  return Response.json(result);
}

