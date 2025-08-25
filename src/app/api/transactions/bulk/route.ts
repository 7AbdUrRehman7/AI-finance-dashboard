
export const runtime = "nodejs";

import { db } from "../../../../lib/db";
import { Transaction } from "../../../../models/Transaction";
import { z } from "zod";

// One normalized CSV row
const Row = z.object({
  postedAt: z.coerce.date(),       // accepts "YYYY-MM-DD" or ISO
  amountCents: z.number().int(),   // negative = expense, positive = income
  merchant: z.string().optional(),
  rawDesc: z.string().optional(),
});

export async function POST(req: Request) {
  await db();

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!Array.isArray(payload)) {
    return new Response("Expected an array of rows", { status: 400 });
  }

  // Validate and coerce
  let rows: z.infer<typeof Row>[];
  try {
    rows = z.array(Row).parse(payload);
  } catch (e: any) {
    return new Response(`Validation error: ${e.message}`, { status: 400 });
  }

  const res = await Transaction.insertMany(rows);
  return Response.json({ inserted: res.length });
}
