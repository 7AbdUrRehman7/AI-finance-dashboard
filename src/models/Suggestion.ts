import mongoose, { Schema, model, models } from "mongoose";

const SuggestionSchema = new Schema(
  {
    txId: { type: Schema.Types.ObjectId, ref: "Transaction", required: true, index: true },
    suggestedCategoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    score: { type: Number, required: true, min: 0, max: 1 }, // confidence 0..1
    source: { type: String, enum: ["heuristic", "openai"], required: true },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending", index: true },
  },
  { timestamps: true }
);

// Do not allow more than one pending suggestion per transaction
SuggestionSchema.index(
  { txId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

export type SuggestionDoc = mongoose.InferSchemaType<typeof SuggestionSchema>;

export const Suggestion =
  models.Suggestion || model("Suggestion", SuggestionSchema);

