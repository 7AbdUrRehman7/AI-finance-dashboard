/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs";

import { db } from "../../../../../lib/db";
import { Transaction } from "../../../../../models/Transaction";
import { Category } from "../../../../../models/Category";

// ----- same mock helper as the preview route -----
function mockCategorize(
  items: { id: string; merchant: string | null; description: string | null; amountCents: number }[],
  allowed: string[],
) {
  const has = (name: string) => allowed.includes(name);
  return items.map((t) => {
    const text = `${t.merchant ?? ""} ${t.description ?? ""}`.toLowerCase();
    let cat: string | null = null;
    if (t.amountCents > 0 && has("Income")) cat = "Income";
    else if (/uber|lyft|presto|ttc|go transit/.test(text) && has("Transport")) cat = "Transport";
    else if (/walmart|costco|loblaws|no frills|aldi|kroger|sobeys/.test(text) && has("Groceries")) cat = "Groceries";
    else if (/rogers|bell|telus|internet|wifi|hydro|electric|water/.test(text) && has("Utilities")) cat = "Utilities";
    else if (/chipotle|mcd|kfc|pizza|subway|starbucks|coffee/.test(text) && has("Food")) cat = "Food";
    else if (has("Other")) cat = "Other";
    else if (allowed.length) cat = allowed[0];
    return { id: t.id, category: cat! };
  });
}

async function getAssignments() {
  // Flags / key
  const AI_MOCK = process.env.AI_MOCK === "1" || process.env.AI_DEMO === "1";
  const KEY = process.env.OPENAI_API_KEY;

  // 1) Load recent uncategorized
  const txns = await Transaction.find({
    $or: [{ categoryId: { $exists: false } }, { categoryId: null }],
  })
    .sort({ postedAt: -1 })
    .limit(50) // small batch
    .lean();

  if (txns.length === 0) return { mode: AI_MOCK ? "mock" : (KEY ? "openai" : "no-key"), assignments: [], previewed: 0 };

  // 2) Allowed categories
  const cats = await Category.find({}).select({ name: 1 }).lean();
  const categoryNames = cats.map((c: any) => c.name);

  // 3) Compact items
  const items = txns.map((t: any) => ({
    id: String(t._id),
    merchant: t.merchant ?? null,
    description: t.rawDesc ?? null,
    amountCents: t.amountCents,
  }));

  // 4) Mock or missing key → mock
  if (AI_MOCK || !KEY) {
    const mock = mockCategorize(items, categoryNames);
    return { mode: AI_MOCK ? "mock" : "no-key", assignments: mock, previewed: items.length };
  }

  // 5) Real OpenAI call with graceful quota fallback
  const payload = {
    model: "gpt-4o-mini",
    response_format: { type: "json_object" as const },
    temperature: 0,
    messages: [
      { role: "system", content: "You are a precise finance transaction classifier. Output strict JSON only." },
      {
        role: "user",
        content: JSON.stringify({
          instructions:
            'Classify each transaction into exactly ONE category from the allowed list.\n' +
            'Return pure JSON of the form: {"assignments":[{"id":"...","category":"<one of allowed>"}]}.\n' +
            "- Use ONLY the allowed categories (case-sensitive).\n" +
            '- If nothing fits, pick "Other".\n' +
            "- Positive amounts are income; negatives are expenses.",
          allowedCategories: categoryNames,
          transactions: items,
        }),
      },
    ],
  };

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    if (resp.status === 429 || text.includes("insufficient_quota")) {
      const mock = mockCategorize(items, categoryNames);
      return { mode: "mock-fallback", assignments: mock, previewed: items.length };
    }
    throw new Error(`OpenAI failed (${resp.status}): ${text.slice(0, 500)}`);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content ?? "{}";
  let parsed: { assignments?: { id: string; category: string }[] } = {};
  try { parsed = JSON.parse(content); } catch {}

  const assignments = Array.isArray(parsed.assignments)
    ? parsed.assignments.filter((a) => a && typeof a.id === "string" && typeof a.category === "string")
    : [];

  return { mode: "openai", assignments, previewed: items.length };
}

async function applyAssignments(assignments: { id: string; category: string }[]) {
  // Ensure categories exist, build a name->id map
  const needed = Array.from(new Set(assignments.map((a) => a.category)));
  let categoriesCreated = 0;
  for (const name of needed) {
    const res = await Category.updateOne({ name }, { $setOnInsert: { name } }, { upsert: true });
    if ((res as any).upsertedCount) categoriesCreated += 1;
  }
  const cats = await Category.find({ name: { $in: needed } }).select({ _id: 1, name: 1 }).lean();
  const nameToId = new Map<string, string>(cats.map((c: any) => [c.name, String(c._id)]));

  // Build bulk ops (only set if still uncategorized)
  const ops = assignments.map((a) => {
    const categoryId = nameToId.get(a.category);
    if (!categoryId) return null;
    return {
      updateOne: {
        filter: { _id: a.id, $or: [{ categoryId: { $exists: false } }, { categoryId: null }] },
        update: { $set: { categoryId } },
      },
    };
  }).filter(Boolean) as any[];

  let applied = 0;
  if (ops.length) {
    const res = await (Transaction as any).bulkWrite(ops);
    applied =
      (res?.modifiedCount as number) ??
      (res?.nModified as number) ??
      (res?.result?.nModified as number) ??
      0;
  }

  return { applied, categoriesCreated };
}

export async function POST() {
  await db();

  const { mode, assignments, previewed } = await getAssignments();

  if (!assignments.length) {
    return Response.json({ mode, considered: previewed, suggested: 0, applied: 0, categoriesCreated: 0 });
  }

  const { applied, categoriesCreated } = await applyAssignments(assignments);
  return Response.json({
    mode,
    considered: previewed,
    suggested: assignments.length,
    applied,
    categoriesCreated,
  });
}

// Also allow GET for convenience
export async function GET() {
  return POST();
}

