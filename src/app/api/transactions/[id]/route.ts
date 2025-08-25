import { db } from "@/lib/db";
import { Transaction } from "@/models/Transaction";
import mongoose from "mongoose";

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Update category
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> } // params must be awaited
) {
  await db();

  const { id } = await ctx.params; // ✅ await params
  if (!isValidId(id)) {
    return new Response(JSON.stringify({ ok: false, error: "invalid id" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const { categoryId } = await req.json().catch(() => ({} as any));

  let res;
  if (!categoryId) {
    // clear category
    res = await Transaction.updateOne({ _id: id }, { $unset: { categoryId: "" } });
  } else {
    res = await Transaction.updateOne({ _id: id }, { $set: { categoryId } });
  }

  const ok =
    !!(res as any).modifiedCount ||
    !!(res as any).nModified ||
    !!(res as any).acknowledged;

  return new Response(JSON.stringify({ ok }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

// Delete transaction
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> } // params must be awaited
) {
  await db();

  const { id } = await ctx.params; // ✅ await params
  if (!isValidId(id)) {
    return new Response(JSON.stringify({ deleted: 0, error: "invalid id" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const res = await Transaction.deleteOne({ _id: id });
  return new Response(JSON.stringify({ deleted: res.deletedCount }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

