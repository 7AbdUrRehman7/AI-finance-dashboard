import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is not set");

type G = typeof globalThis & { _mongoose?: Promise<typeof mongoose> };
let cached = (global as G)._mongoose;

if (!cached) {
  (global as G)._mongoose = mongoose.connect(uri, { dbName: "finance" });
  cached = (global as G)._mongoose;
}

export async function db() {
  return cached!;
}
