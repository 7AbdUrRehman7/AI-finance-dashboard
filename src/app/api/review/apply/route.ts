import { db } from "@/lib/db";
import { Transaction } from "@/models/Transaction";
import { Suggestion } from "@/models/Suggestion";
import { Types } from "mongoose";

export const revalidate = 0;

type Body =
  | { mode: "accept-all" }
  | { txIds: string[] };

export async function POST(req: Request) {
  await db();
  const body = (await req.json()) as Body;

  const filter: any = { status: "pending" };
  if ("txIds" in body && Array.isArray(body.txIds) && body.txIds.length > 0) {
    filter.txId = { $in: body.txIds.map((id) => new Types.ObjectId(id)) };
  }

  // Load pending suggestions we will apply
  const suggestions = await Suggestion.find(filter).lean();

  if (suggestions.length === 0) {
    return Response.json({ applied: 0 });
  }

  // Build bulk ops
  const txOps = suggestions.map((s: any) => ({
    updateOne: {
      filter: { _id: new Types.ObjectId(String(s.txId)) },
      update: { $set: { categoryId: new Types.ObjectId(String(s.suggestedCategoryId)) } },
    },
  }));

  const sugOps = suggestions.map((s: any) => ({
    updateOne: {
      filter: { _id: new Types.ObjectId(String(s._id)) },
      update: { $set: { status: "accepted" } },
    },
  }));

  if (txOps.length > 0) await Transaction.bulkWrite(txOps, { ordered: false });
  if (sugOps.length > 0) await Suggestion.bulkWrite(sugOps, { ordered: false });

  return Response.json({ applied: suggestions.length }, { headers: { "cache-control": "no-store" } });
}

