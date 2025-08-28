/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { Budget } from "@/models/Budget";
import mongoose from "mongoose";

function prevMonthStr(month: string) {
  // month: "YYYY-MM"
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1, 1);
  d.setMonth(d.getMonth() - 1);
  const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return ym;
}

export async function POST(req: NextRequest) {
  try {
    await db();

    const month = new URL(req.url).searchParams.get("month") || "";
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return Response.json({ error: "Invalid or missing ?month=YYYY-MM" }, { status: 400 });
    }

    const fromMonth = prevMonthStr(month);

    const [from, existing] = await Promise.all([
      Budget.find({ month: fromMonth }).lean(),
      Budget.find({ month }).lean(),
    ]);

    if (from.length === 0) {
      return Response.json({ copied: 0, skipped: 0, fromMonth, month, note: "No budgets in previous month." });
    }

    const existingSet = new Set(existing.map(b => String(b.categoryId)));

    const toInsert = from
      .filter(b => !existingSet.has(String(b.categoryId)))
      .map(b => ({
        month,
        categoryId: new mongoose.Types.ObjectId(String(b.categoryId)),
        limitCents: Number(b.limitCents) || 0,
      }));

    if (toInsert.length === 0) {
      return Response.json({ copied: 0, skipped: from.length, fromMonth, month, note: "All categories already budgeted." });
    }

    const inserted = await Budget.insertMany(toInsert);
    return Response.json({
      copied: inserted.length,
      skipped: from.length - inserted.length,
      fromMonth,
      month,
    });
  } catch (err: any) {
    console.error("budgets.copy POST error", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

