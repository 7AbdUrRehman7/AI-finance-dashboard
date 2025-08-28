import mongoose, { Schema, Types } from "mongoose";

export interface IBudget {
  _id: Types.ObjectId;
  categoryId: Types.ObjectId;        // which category this budget is for
  month: string;                      // "YYYY-MM"
  limitCents: number;                 // monthly limit in cents
  createdAt: Date;
  updatedAt: Date;
}

const BudgetSchema = new Schema<IBudget>(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    month: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    limitCents: { type: Number, required: true },
  },
  { timestamps: true }
);

// One budget per (category, month)
BudgetSchema.index({ categoryId: 1, month: 1 }, { unique: true });

export const Budget =
  (mongoose.models.Budget as mongoose.Model<IBudget>) ||
  mongoose.model<IBudget>("Budget", BudgetSchema);

