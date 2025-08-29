import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Transaction } from "@/models/Transaction";
import { Types } from "mongoose";

export const revalidate = 0;
export const dynamic = "force-dynamic";

// Update category (used by Review inline select)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await db();

  const { id } = await params; // <- IMPORTANT in Next 15
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({} as any));
  const cat = body?.categoryId ?? null;

  const update: any = {};
  if (cat === null || cat === "") {
    update.categoryId = null;
  } else if (Types.ObjectId.isValid(cat)) {
    update.categoryId = new Types.ObjectId(cat);
  } else {
    return NextResponse.json({ error: "Invalid categoryId" }, { status: 400 });
  }

  const doc = await Transaction.findByIdAndUpdate(id, update, { new: true });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}

// Delete a transaction (used by the trash button)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await db();

  const { id } = await params; // <- IMPORTANT in Next 15
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const deleted = await Transaction.findByIdAndDelete(id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}

