export const runtime = "nodejs";

import { db } from "../../../lib/db";
import { Transaction } from "../../../models/Transaction";

function days(n: number) {
  return new Date(Date.now() - n * 24 * 3600 * 1000);
}

async function doSeed() {
  await db();
  const sample = [
    { postedAt: days(2), amountCents: -1899, merchant: "UBER *TRIP", rawDesc: "UBER HELP" },
    { postedAt: days(3), amountCents: -1299, merchant: "Chipotle", rawDesc: "CHIPOTLE TORONTO" },
    { postedAt: days(5), amountCents: -7999, merchant: "Rogers", rawDesc: "ROGERS COMM" },
    { postedAt: days(7), amountCents: 250000, merchant: "PAYROLL", rawDesc: "ACME PAYROLL" },
    { postedAt: days(8), amountCents: -4599, merchant: "Walmart", rawDesc: "WALMART TORONTO" },
  ];
  await Transaction.deleteMany({});
  await Transaction.insertMany(sample);
  return Response.json({ inserted: sample.length });
}

export async function GET()  { return doSeed(); }
export async function POST() { return doSeed(); }
