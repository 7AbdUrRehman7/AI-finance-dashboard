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
  to?: string;   // YYYY-MM-DD (inclusive in UI; server uses < next UTC day)
  min?: string;  // amount in DOLLARS
  max?: string;  // amount in DOLLARS
  onlyUncategorized?: string; // "1" | "true"
  page?: string;   // 1-based
  limit?: string;  // page size
  sort?: "dateAsc" | "dateDesc" | "amountAsc" | "amountDesc";
};

type TxLean = {
  _id: Types.ObjectId;
  merchant?: string;
  rawDesc?: string;
  amountCents: number;
  postedAt: Date;
  categoryId?: Types.ObjectId | null;
};

function isTrue(v?: string): boolean {
  if (!v) return false;
  const s = v.toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

function parseIntSafe(v?: string, fallback = 0): number | null {
  if (v == null || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function dollarsToCentsStr(v?: string): number | null {
  if (v == null || v.trim() === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

// Parse "YYYY-MM-DD" as a UTC midnight Date (no local timezone drift)
function parseYmdToUtcDate(v?: string): Date | null {
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1; // 0-based
  const d = Number(m[3]);
  return new Date(Date.UTC(y, mo, d, 0, 0, 0, 0));
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

  // Build AND clauses so multiple conditions combine correctly
  const and: FilterQuery<TxLean>[] = [];

  // text search
  if (q.text && q.text.trim() !== "") {
    const needle = new RegExp(escapeRegExp(q.text.trim()), "i");
    and.push({ $or: [{ merchant: needle }, { rawDesc: needle }] });
  }

  // category / uncategorized
  const catOid = toObjectId(q.categoryId);
  if (catOid) {
    and.push({ categoryId: catOid });
  } else if (isTrue(q.onlyUncategorized)) {
    and.push({ $or: [{ categoryId: null }, { categoryId: { $exists: false } }] });
  }

  // date range (TO inclusive -> < next UTC day)
  const fromUTC = parseYmdToUtcDate(q.from);
  const toUTC = parseYmdToUtcDate(q.to);
  if (fromUTC || toUTC) {
    const rng: any = {};
    if (fromUTC) rng.$gte = fromUTC;
    if (toUTC) {
      const toExclusive = new Date(toUTC.getTime());
      toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
      rng.$lt = toExclusive;
    }
    and.push({ postedAt: rng });
  }

  // amount range (dollars -> cents)
  const minC = dollarsToCentsStr(q.min);
  const maxC = dollarsToCentsStr(q.max);
  if (minC != null || maxC != null) {
    const rng: any = {};
    if (minC != null) rng.$gte = minC;
    if (maxC != null) rng.$lte = maxC;
    and.push({ amountCents: rng });
  }

  const filter: FilterQuery<TxLean> = and.length ? { $and: and } : {};

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

  // category names for page
  const idSet = new Set<string>();
  for (const d of docs) if (d.categoryId) idSet.add(String(d.categoryId));
  const catIds = Array.from(idSet).map((s) => new Types.ObjectId(s));
  const cats = catIds.length
    ? await Category.find({ _id: { $in: catIds } }, { name: 1 }).lean<{ _id: Types.ObjectId; name: string }[]>()
    : [];
  const nameById = new Map<string, string>();
  for (const c of cats) nameById.set(String(c._id), c.name);

  const items = docs.map((d) => ({
    id: String(d._id),
    merchant: d.merchant ?? null,
    rawDesc: d.rawDesc ?? null,
    amountCents: d.amountCents,
    postedAt: d.postedAt.toISOString(),
    categoryId: d.categoryId ? String(d.categoryId) : null,
    category: d.categoryId ? nameById.get(String(d.categoryId)) ?? "Uncategorized" : "Uncategorized",
  }));

  return Response.json({ page, pageSize: limit, total, items });
}

