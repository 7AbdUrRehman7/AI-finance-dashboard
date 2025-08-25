"use client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

type Point = { date: string; incomeCents: number; expenseCents: number; netCents: number };

const COLORS = {
  incomeStroke: "#10B981",   // emerald-500
  incomeFill:   "#10B98133", // ~20% opacity
  expenseStroke:"#EF4444",   // rose-500
  expenseFill:  "#EF444433", // ~20% opacity
};

function dollars(nCents: number) {
  return nCents / 100;
}

function CurrencyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const money = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });
  const byKey: Record<string, number> = {};
  for (const p of payload) byKey[p.dataKey] = p.value;
  return (
    <div className="rounded-lg border bg-white/95 p-2 text-xs shadow dark:border-white/10 dark:bg-neutral-900/95">
      <div className="font-medium">{label}</div>
      <div>Income: {money.format(dollars(byKey.incomeCents ?? 0))}</div>
      <div>Expenses: {money.format(dollars(byKey.expenseAbsCents ?? 0))}</div>
    </div>
  );
}

export default function MonthlyTrend({ data }: { data: Point[] }) {
  // Plot expenses as positive so both areas sit above zero and are comparable
  const prepared = data.map((p) => ({
    date: p.date,
    incomeCents: p.incomeCents,
    expenseAbsCents: Math.abs(p.expenseCents),
  }));

  const hasAny = prepared.some((p) => p.incomeCents !== 0 || p.expenseAbsCents !== 0);
  if (!hasAny) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">No data for this month.</div>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={prepared} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={24} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip content={<CurrencyTooltip />} />
          <Legend />
          <Area
            type="monotone"
            dataKey="incomeCents"
            name="Income"
            stroke={COLORS.incomeStroke}
            fill={COLORS.incomeFill}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
          <Area
            type="monotone"
            dataKey="expenseAbsCents"
            name="Expenses"
            stroke={COLORS.expenseStroke}
            fill={COLORS.expenseFill}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

