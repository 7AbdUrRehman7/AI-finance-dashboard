// src/app/api/transactions/export/route.ts
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { Transaction } from "@/models/Transaction";
import { Category } from "@/models/Category"; // ensures model is registered

function parseBool(v: string | null): boolean | undefined {
  if (v == null) return undefined;
  return v === "1" || v.toLowerCase() === "true";
}

function buildMatch(u: URL) {
  const text = u.searchParams.get("text")?.trim();
  const categoryId = u.searchParams.get("categoryId")?.trim();
  const onlyUncat = parseBool(u.searchParams.get("onlyUncategorized"));
  const from = u.searchParams.get("from")?.trim();
  const to = u.searchParams.get("to")?.trim();
  const min = u.searchParams.get("min")?.trim();
  const max = u.searchParams.get("max")?.trim();

  const match: any = {};

  if (text) {
    const rx = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    match.$or = [{ merchant: rx }, { rawDesc: rx }];
  }

  if (categoryId) {
    match.categoryId = categoryId;
  } else if (onlyUncat) {
    match.$or = [...(match.$or ?? []), { categoryId: { $exists: false } }, { categoryId: null }];
  }

  if (from || to) {
    match.postedAt = {};
    if (from) match.postedAt.$gte = new Date(from);
    if (to) match.postedAt.$lt = new Date(to);
  }

  if (min || max) {
    match.amountCents = {};
    if (min) match.amountCents.$gte = Math.round(Number(min) * 100);
    if (max) match.amountCents.$lte = Math.round(Number(max) * 100);
  }

  return match;
}

function csvEscape(s: string) {
  if (s == null) return "";
  const str = String(s);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function GET(req: NextRequest) {
  await db();

  const url = new URL(req.url);
  const match = buildMatch(url);

  // sort param (optional): amountAsc|amountDesc|dateAsc|dateDesc
  const sortParam = url.searchParams.get("sort");
  let sort: any = { postedAt: -1 };
  if (sortParam === "amountAsc") sort = { amountCents: 1 };
  if (sortParam === "amountDesc") sort = { amountCents: -1 };
  if (sortParam === "dateAsc") sort = { postedAt: 1 };
  if (sortParam === "dateDesc") sort = { postedAt: -1 };

  const rows = await Transaction.aggregate([
    { $match: match },
    { $sort: sort },
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
        _id: 0,
        id: "$_id",
        postedAt: 1,
        merchant: 1,
        rawDesc: 1,
        amountCents: 1,
        category: { $ifNull: [{ $first: "$cat.name" }, "Uncategorized"] },
      },
    },
  ]);

  const header = [
    "Date",
    "Merchant",
    "Description",
    "Category",
    "Amount (CAD)",
    "AmountCents",
    "Id",
  ];

  const lines = [header.join(",")];
  for (const r of rows) {
    const date = new Date(r.postedAt).toISOString().slice(0, 10);
    const amount = (r.amountCents / 100).toFixed(2);
    lines.push(
      [
        csvEscape(date),
        csvEscape(r.merchant ?? ""),
        csvEscape(r.rawDesc ?? ""),
        csvEscape(r.category ?? "Uncategorized"),
        csvEscape(amount),
        csvEscape(String(r.amountCents)),
        csvEscape(String(r.id)),
      ].join(",")
    );
  }

  const csv = lines.join("\n");
  const today = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="transactions-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

