
import { Schema, model, models } from "mongoose";

const CategorySchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    // later we can add userId for per-user categories
  },
  { timestamps: true }
);

export const Category =
  models.Category || model("Category", CategorySchema);
