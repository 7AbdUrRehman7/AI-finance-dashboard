import { db } from "@/lib/db";
import { Suggestion } from "@/models/Suggestion";
import { Types } from "mongoose";

export const revalidate = 0;

type Body =
  | { mode: "reject-all" }
  | { txIds: string[] };

export async function POST(req: Request) {
  await db();
  const body = (await req.json()) as Body;

  const filter: any = { status: "pending" };
  if ("txIds" in body && Array.isArray(body.txIds) && body.txIds.length > 0) {
    filter.txId = { $in: body.txIds.map((id) => new Types.ObjectId(id)) };
  }

  const res = await Suggestion.updateMany(filter, { $set: { status: "rejected" } });

  return Response.json({ rejected: res.modifiedCount ?? 0 }, { headers: { "cache-control": "no-store" } });
}

