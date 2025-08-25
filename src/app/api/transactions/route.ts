import { db } from "@/lib/db";
import { Transaction } from "@/models/Transaction";
import mongoose from "mongoose";

function toCents(x: unknown) {
  if (typeof x === "number" && Number.isFinite(x)) return Math.round(x * 100);
  const n = Number(String(x ?? "").replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100);
}

export async function POST(req: Request) {
  await db();

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const { date, postedAt, description, rawDesc, merchant, amount, amountCents, categoryId } = body;

  // Allow "date" or "postedAt" (YYYY-MM-DD preferred)
  const whenStr = postedAt ?? date;
  const when = whenStr ? new Date(whenStr) : new Date();
  if (isNaN(when.getTime())) {
    return new Response(JSON.stringify({ error: "Invalid date (use YYYY-MM-DD)" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // Amount: accept either amountCents or amount (string like "-12.34" or "$-12.34")
  const cents = Number.isFinite(amountCents) ? Number(amountCents) : toCents(amount);
  if (!Number.isFinite(cents) || Math.abs(cents) < 1) {
    return new Response(
      JSON.stringify({ error: "Invalid amount. Use negative for expense, positive for income." }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  let catId: string | undefined = undefined;
  if (categoryId) {
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return new Response(JSON.stringify({ error: "Invalid categoryId" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    catId = categoryId;
  }

  const doc = await Transaction.create({
    postedAt: when,
    amountCents: Math.trunc(cents),
    merchant: merchant || undefined,
    rawDesc: description ?? rawDesc ?? undefined,
    ...(catId ? { categoryId: catId } : {}),
  });

  return new Response(JSON.stringify({ ok: true, id: String(doc._id) }), {
    status: 201,
    headers: { "content-type": "application/json" },
  });
}

