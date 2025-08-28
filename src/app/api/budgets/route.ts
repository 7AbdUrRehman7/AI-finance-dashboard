import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { Budget } from "@/models/Budget";
import mongoose from "mongoose";

function isId(v: string) {
  return mongoose.Types.ObjectId.isValid(v);
}

export async function GET(req: NextRequest) {
  await db();
  const month = new URL(req.url).searchParams.get("month") || "";
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return Response.json({ error: "Invalid or missing ?month=YYYY-MM" }, { status: 400 });
  }

  // Return budgets for the month with category names
  const budgets = await Budget.aggregate([
    { $match: { month } },
    {
      $lookup: {
        from: "categories",
        localField: "categoryId",
        foreignField: "_id",
        as: "cat",
      },
    },
    {
      $project: {
        _id: 1,
        month: 1,
        limitCents: 1,
        categoryId: 1,
        category: { $ifNull: [{ $first: "$cat.name" }, "Unknown"] },
      },
    },
    { $sort: { category: 1 } },
  ]);

  return Response.json({ month, budgets });
}

export async function POST(req: NextRequest) {
  // Upsert (create or update) — kept for compatibility
  await db();
  const { month, categoryId, limitCents } = await req.json();

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return Response.json({ error: "month must be YYYY-MM" }, { status: 400 });
  }
  if (!categoryId || !isId(String(categoryId))) {
    return Response.json({ error: "categoryId is required (ObjectId)" }, { status: 400 });
  }

  const doc = await Budget.findOneAndUpdate(
    { month, categoryId: new mongoose.Types.ObjectId(String(categoryId)) },
    { $set: { limitCents: Number(limitCents) || 0 } },
    { upsert: true, new: true }
  );
  return Response.json({ ok: true, budget: doc });
}

export async function PUT(req: NextRequest) {
  // Same behavior as POST, idempotent upsert
  return POST(req);
}

export async function DELETE(req: NextRequest) {
  await db();
  const { month, categoryId } = await req.json();

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return Response.json({ error: "month must be YYYY-MM" }, { status: 400 });
  }
  if (!categoryId || !isId(String(categoryId))) {
    return Response.json({ error: "categoryId is required (ObjectId)" }, { status: 400 });
  }

  const res = await Budget.deleteOne({
    month,
    categoryId: new mongoose.Types.ObjectId(String(categoryId)),
  });

  return Response.json({ ok: true, deleted: res.deletedCount });
}

