/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs";

import { db } from "../../../../../lib/db";
import { Transaction } from "../../../../../models/Transaction";
import { Category } from "../../../../../models/Category";

// ----- simple mock suggestion (no OpenAI needed) -----
function mockCategorize(
  items: { id: string; merchant: string | null; description: string | null; amountCents: number }[],
  allowed: string[],
) {
  const has = (name: string) => allowed.includes(name);

  return items.map((t) => {
    const text = `${t.merchant ?? ""} ${t.description ?? ""}`.toLowerCase();

    // very small heuristic just for demo
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

export async function GET() {
  await db();

  // 0) Read flags
  const AI_MOCK = process.env.AI_MOCK === "1" || process.env.AI_DEMO === "1";

  // 1) Load up to 20 uncategorized rows
  const txns = await Transaction.find({
    $or: [{ categoryId: { $exists: false } }, { categoryId: null }],
  })
    .sort({ postedAt: -1 })
    .limit(20)
    .lean();

  if (txns.length === 0) {
    return Response.json({ count: 0, assignments: [], previewed: 0 });
  }

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

  // 4) If mock mode, return mock assignments immediately
  if (AI_MOCK || !process.env.OPENAI_API_KEY) {
    const mock = mockCategorize(items, categoryNames);
    return Response.json({
      mode: AI_MOCK ? "mock" : "no-key",
      count: mock.length,
      assignments: mock,
      previewed: items.length,
    });
  }

  // 5) Real call to OpenAI
  const payload = {
    model: "gpt-4o-mini",
    response_format: { type: "json_object" as const },
    temperature: 0,
    messages: [
      {
        role: "system",
        content: "You are a precise finance transaction classifier. Output strict JSON only.",
      },
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
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  // 6) Friendly handling for quota/billing errors
  if (!resp.ok) {
    const status = resp.status;
    const text = await resp.text().catch(() => "");
    // If it's a quota/billing error, gently degrade to mock so you can keep going
    if (status === 429 || text.includes("insufficient_quota")) {
      const mock = mockCategorize(items, categoryNames);
      return Response.json({
        mode: "mock-fallback",
        count: mock.length,
        assignments: mock,
        previewed: items.length,
        note: "OpenAI quota exceeded; using mock suggestions.",
      });
    }
    return new Response(JSON.stringify({ error: "OpenAI failed", status, body: text }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content ?? "{}";

  let parsed: { assignments?: { id: string; category: string }[] } = {};
  try {
    parsed = JSON.parse(content);
  } catch {}

  const assignments = Array.isArray(parsed.assignments)
    ? parsed.assignments.filter((a) => a && typeof a.id === "string" && typeof a.category === "string")
    : [];

  return Response.json({
    mode: "openai",
    count: assignments.length,
    assignments,
    previewed: items.length,
  });
}

