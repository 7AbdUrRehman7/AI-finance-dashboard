
export const runtime = "nodejs";

import { db } from "../../../../lib/db";
import { Transaction } from "../../../../models/Transaction";
import { suggestCategoryName } from "../../../../lib/rules";

export async function GET() {
  await db();
  // Look at the most recent 200, suggest up to 50 uncategorized
  const txns = await Transaction.find({}).sort({ postedAt: -1 }).limit(200).lean();
  const suggestions: any[] = [];
  for (const t of txns) {
    if (t.categoryId) continue;
    const name = suggestCategoryName({
      merchant: t.merchant,
      rawDesc: t.rawDesc,
      amountCents: t.amountCents,
    });
    if (name) {
      suggestions.push({
        _id: String(t._id),
        merchant: t.merchant ?? null,
        rawDesc: t.rawDesc ?? null,
        amountCents: t.amountCents,
        suggestedCategory: name,
      });
      if (suggestions.length >= 50) break;
    }
  }
  return Response.json({ count: suggestions.length, suggestions });
}
