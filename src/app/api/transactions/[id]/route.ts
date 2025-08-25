export const runtime = "nodejs";

import { db } from "../../../../lib/db";
import { Transaction } from "../../../../models/Transaction";
import { Types } from "mongoose";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  await db();
  const { id } = await ctx.params;

  let body: any;
  try { body = await req.json(); } catch { return new Response("Invalid JSON", { status: 400 }); }

  const { categoryId } = body || {};

  // If no categoryId provided (null/empty), clear it
  if (!categoryId) {
    await Transaction.updateOne({ _id: id }, { $unset: { categoryId: 1 } });
    return Response.json({ ok: true, cleared: true });
  }

  if (!Types.ObjectId.isValid(categoryId)) {
    return new Response("categoryId invalid", { status: 400 });
  }

  const res = await Transaction.updateOne({ _id: id }, { $set: { categoryId } });
  if ((res as any).matchedCount === 0) return new Response("Transaction not found", { status: 404 });

  return Response.json({ ok: true });
}

