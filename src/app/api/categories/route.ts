export const runtime = "nodejs";

import { db } from "../../../lib/db";
import { Category } from "../../../models/Category";

export async function GET() {
  await db();
  const cats = await Category.find({}).sort({ name: 1 }).lean();
  // keep the payload minimal for the client
  return Response.json(cats.map(c => ({ _id: String(c._id), name: c.name })));
}

