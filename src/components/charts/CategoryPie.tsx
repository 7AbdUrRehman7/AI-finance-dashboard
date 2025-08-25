"use client";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type Slice = { category: string; total: number };

// Your exact mapping
const CATEGORY_COLORS: Record<string, string> = {
  "Food": "#FF6384",           // Bright Pink/Red
  "Groceries": "#36A2EB",      // Bright Sky Blue
  "Income": "#FFCE56",         // Bright Yellow
  "Transport": "#4BC0C0",      // Teal / Cyan
  "Uncategorized": "#9966FF",  // Vivid Purple
  "Utilities": "#FF9F40",      // Bright Orange
};

// ---- Fallback color (for categories not in the mapping) ----
function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return Math.abs(h);
}
function hslToHex(h: number, s: number, l: number) {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h/30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(255 * x).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}
function fallbackColor(name: string) {
  const hue = (hashString(name) * 137.508) % 360; // spread hues
  return hslToHex(hue, 70, 50);
}

function colorFor(name: string) {
  return CATEGORY_COLORS[name] ?? fallbackColor(name);
}

export default function CategoryPie({ data }: { data: Slice[] }) {
  const prepared = (data || [])
    .filter((d) => d.total !== 0)
    .map((d) => ({
      name: d.category,
      value: Math.abs(d.total / 100), // cents -> dollars
    }));

  if (prepared.length === 0) {
    return (
      <div className="p-10 text-center text-sm text-gray-500">
        No data for this month yet.
      </div>
    );
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={prepared} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100}>
            {prepared.map((entry, i) => (
              <Cell
                key={i}
                fill={colorFor(entry.name)}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={1}
              />
            ))}
          </Pie>
          <Tooltip formatter={(v: any) => `$${Number(v).toFixed(2)}`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

