// src/app/api/transactions/search/route.ts
import { db } from "@/lib/db";
import { Transaction } from "@/models/Transaction";
import { Category } from "@/models/Category";
import type { FilterQuery } from "mongoose";
import { Types } from "mongoose";

export const revalidate = 0;
export const dynamic = "force-dynamic";

type Query = {
  text?: string;
  categoryId?: string;
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD (exclusive end if provided)
  min?: string;  // amount in cents (stringified number)
  max?: string;  // amount in cents
  onlyUncategorized?: string; // "1" or "true"
  page?: string;   // 1-based
  limit?: string;  // page size
  sort?: string;   // optional: "dateAsc" | "dateDesc" | "amountAsc" | "amountDesc"
};

type TxLean = {
  _id: Types.ObjectId;
  merchant?: string;
  rawDesc?: string;
  amountCents: number;
  postedAt: Date;
  categoryId?: Types.ObjectId | null;
};

function isTrue(v: string | undefined): boolean {
  if (!v) return false;
  const s = v.toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

function parseIntSafe(v?: string, fallback = 0): number | null {
  if (v == null || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function parseISODate(v?: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toObjectId(id?: string): Types.ObjectId | null {
  if (!id) return null;
  return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;
}

export async function GET(req: Request) {
  await db();

  const url = new URL(req.url);
  const q = Object.fromEntries(url.searchParams.entries()) as Query;

  // pagination
  const page = Math.max(1, parseIntSafe(q.page, 1) ?? 1);
  const limit = Math.min(100, Math.max(1, parseIntSafe(q.limit, 20) ?? 20));
  const skip = (page - 1) * limit;

  // build filter
  const filter: FilterQuery<TxLean> = {};

  // text search (regex fallback so index is optional; we will add a text index later)
  if (q.text && q.text.trim() !== "") {
    const needle = new RegExp(escapeRegExp(q.text.trim()), "i");
    filter.$or = [{ merchant: needle }, { rawDesc: needle }];
  }

  // category filter
  const catOid = toObjectId(q.categoryId);
  if (catOid) {
    filter.categoryId = catOid;
  }

  // only uncategorized
  if (isTrue(q.onlyUncategorized)) {
    filter.$or = filter.$or || [];
    filter.$or.push({ categoryId: null }, { categoryId: { $exists: false } });
  }

  // date range
  const from = parseISODate(q.from);
  const to = parseISODate(q.to);
  if (from || to) {
    filter.postedAt = {} as any;
    if (from) (filter.postedAt as any).$gte = from;
    if (to) (filter.postedAt as any).$lt = to;
  }

  // amount range
  const min = parseIntSafe(q.min);
  const max = parseIntSafe(q.max);
  if (min != null || max != null) {
    filter.amountCents = {} as any;
    if (min != null) (filter.amountCents as any).$gte = min!;
    if (max != null) (filter.amountCents as any).$lte = max!;
  }

  // sort
  let sort: Record<string, 1 | -1> = { postedAt: -1 };
  switch (q.sort) {
    case "dateAsc":
      sort = { postedAt: 1 };
      break;
    case "amountAsc":
      sort = { amountCents: 1 };
      break;
    case "amountDesc":
      sort = { amountCents: -1 };
      break;
    case "dateDesc":
    default:
      sort = { postedAt: -1 };
  }

  // query
  const [docs, total] = await Promise.all([
    Transaction.find(filter).sort(sort).skip(skip).limit(limit).lean<TxLean[]>(),
    Transaction.countDocuments(filter),
  ]);

  // fetch category names for the page
  const idSet = new Set<string>();
  for (const d of docs) {
    if (d.categoryId) idSet.add(String(d.categoryId));
  }
  const catIds = Array.from(idSet).map((s) => new Types.ObjectId(s));
  const cats = catIds.length
    ? await Category.find({ _id: { $in: catIds } }, { name: 1 }).lean<{ _id: Types.ObjectId; name: string }[]>()
    : [];

  const nameById = new Map<string, string>();
  for (const c of cats) nameById.set(String(c._id), c.name);

  // shape response (stringify ids and dates)
  const items = docs.map((d) => ({
    id: String(d._id),
    merchant: d.merchant ?? null,
    rawDesc: d.rawDesc ?? null,
    amountCents: d.amountCents,
    postedAt: d.postedAt.toISOString(),
    categoryId: d.categoryId ? String(d.categoryId) : null,
    category: d.categoryId ? nameById.get(String(d.categoryId)) ?? "Uncategorized" : "Uncategorized",
  }));

  return Response.json({
    page,
    pageSize: limit,
    total,
    items,
  });
}

