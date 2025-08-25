import { Schema, model, models, Types } from "mongoose";

const TransactionSchema = new Schema(
  {
    postedAt: { type: Date, required: true, index: true },
    amountCents: { type: Number, required: true }, // income +, expense -
    merchant: { type: String },
    rawDesc: { type: String },

    // NEW: optional category reference
    categoryId: { type: Types.ObjectId, ref: "Category", index: true },
  },
  { timestamps: true }
);

TransactionSchema.index({ categoryId: 1, postedAt: -1 });

export const Transaction =
  models.Transaction || model("Transaction", TransactionSchema);

