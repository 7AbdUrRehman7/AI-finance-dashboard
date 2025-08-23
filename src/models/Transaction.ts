
import { Schema, model, models } from "mongoose";

const TransactionSchema = new Schema(
  {
    postedAt: { type: Date, required: true, index: true },
    amountCents: { type: Number, required: true }, // income +, expense -
    merchant: { type: String },
    rawDesc: { type: String },
  },
  { timestamps: true }
);

export const Transaction =
  models.Transaction || model("Transaction", TransactionSchema);
