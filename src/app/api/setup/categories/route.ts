export const runtime = "nodejs";

import { db } from "../../../../lib/db";
import { Category } from "../../../../models/Category";

export async function GET() {
  await db();
  const defaults = [
    "Food","Transport","Groceries","Utilities","Rent","Income",
    "Shopping","Entertainment","Health","Travel","Education","Fees","Other"
  ];

  let created = 0;
  for (const name of defaults) {
    const res = await Category.updateOne(
      { name },
      { $setOnInsert: { name } },
      { upsert: true }
    );
    // upsertedCount exists at runtime; cast to any for TS
    if ((res as any).upsertedCount) created += 1;
  }
  return Response.json({ ok: true, created });
}

