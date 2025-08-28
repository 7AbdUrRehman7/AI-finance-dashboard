"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

type Row = { category: string; total: number };

const money = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

// A stable, high-contrast palette (works in light & dark)
const PALETTE = [
  "#6366F1", // indigo-500
  "#22C55E", // emerald-500
  "#EF4444", // red-500
  "#F59E0B", // amber-500
  "#06B6D4", // cyan-500
  "#8B5CF6", // violet-500
  "#10B981", // green-500
  "#F97316", // orange-500
  "#3B82F6", // blue-500
  "#E11D48", // rose-600
  "#84CC16", // lime-500
  "#A855F7", // purple-500
];

export default function CategoryPie({
  data,
}: {
  data: Row[] | undefined;
}) {
  // Normalize incoming rows into recharts-friendly shape
  // We use absolute value so negative (expense) and positive (income) sizes are comparable.
  const items =
    (data ?? [])
      .map((r) => ({
        name: r?.category ?? "Uncategorized",
        value: Math.abs(Number(r?.total) || 0),
        raw: r,
      }))
      // If you want “spending only”, swap the filter to: .filter(r => (r.raw?.total ?? 0) < 0)
      .filter((r) => r.value > 0) || [];

  if (items.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        No data for this period.
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={items}
            dataKey="value"
            nameKey="name"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={2}
            isAnimationActive={false}
          >
            {items.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(val: any, _name: any, ctx: any) =>
              [
                money.format((Number(val) || 0) / 100),
                ctx?.payload?.name ?? "Category",
              ] as [string, string]
            }
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

