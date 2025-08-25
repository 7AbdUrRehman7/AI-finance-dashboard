export const runtime = "nodejs";

import { db } from "../../../../../lib/db";
import { Transaction } from "../../../../../models/Transaction";

export async function GET() {
  await db();
  const count = await Transaction.countDocuments({
    $or: [{ categoryId: { $exists: false } }, { categoryId: null }],
  });
  return Response.json({ count });
}

