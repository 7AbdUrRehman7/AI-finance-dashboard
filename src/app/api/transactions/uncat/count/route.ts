import { db } from "@/lib/db";
import { Transaction } from "@/models/Transaction";

export const revalidate = 0; // never cache

export async function GET() {
  await db();
  const count = await Transaction.countDocuments({
    $or: [{ categoryId: null }, { categoryId: { $exists: false } }],
  });

  return new Response(JSON.stringify({ count }), {
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store, must-revalidate",
    },
  });
}


