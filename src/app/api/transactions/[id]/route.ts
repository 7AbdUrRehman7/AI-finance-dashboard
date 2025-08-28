import { db } from "@/lib/db";
import { Transaction } from "@/models/Transaction";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Update category (already had this earlier, kept here for completeness)
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isValidId(id)) return Response.json({ error: "invalid id" }, { status: 400 });

  await db();
  const { categoryId } = await req.json().catch(() => ({} as { categoryId: string | null }));

  const update: any = {};
  if (categoryId === null) {
    update.$unset = { categoryId: "" };
  } else if (typeof categoryId === "string" && isValidId(categoryId)) {
    update.$set = { categoryId: new mongoose.Types.ObjectId(categoryId) };
  } else {
    return Response.json({ error: "categoryId is required (ObjectId or null)" }, { status: 400 });
  }

  const res = await Transaction.updateOne({ _id: new mongoose.Types.ObjectId(id) }, update);
  return Response.json({ ok: true, modified: res.modifiedCount ?? 0 }, {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

// Delete a transaction
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isValidId(id)) return Response.json({ error: "invalid id" }, { status: 400 });

  await db();
  const res = await Transaction.deleteOne({ _id: new mongoose.Types.ObjectId(id) });
  return Response.json({ deleted: res.deletedCount ?? 0 }, {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

