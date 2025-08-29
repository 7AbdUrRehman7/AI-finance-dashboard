// src/app/api/analytics/insights/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyzeMonth, ensureMonth } from "@/lib/insights";

export async function GET(req: Request) {
  await db();
  const url = new URL(req.url);
  const month = ensureMonth(url.searchParams.get("month"));
  try {
    const insights = await analyzeMonth(month);
    return NextResponse.json(insights);
  } catch (err) {
    console.error("insights error", err);
    return NextResponse.json({ error: "Failed to compute insights" }, { status: 500 });
  }
}

