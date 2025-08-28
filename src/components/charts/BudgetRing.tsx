"use client";
import React from "react";

type Props = {
  /** cents spent (positive number). Only pass expense (not income). */
  spentCents: number;
  /** cents as the limit for the month */
  limitCents: number;
  /** pixel size of the ring (outer square) */
  size?: number;
  /** optional label under the ring */
  label?: string;
};

export default function BudgetRing({
  spentCents,
  limitCents,
  size = 72,
  label,
}: Props) {
  const spent = Math.max(0, spentCents);
  const limit = Math.max(0, limitCents);
  const pct = limit > 0 ? Math.min(spent / limit, 1.5) : 0; // cap visual at 150%

  // color thresholds
  const color =
    pct >= 1 ? "#ef4444" : pct >= 0.7 ? "#f59e0b" : "#10b981"; // red / amber / green

  // simple SVG donut
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = Math.PI * 2 * r;
  const dash = Math.min(c * pct, c);

  const money = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  });

  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#e5e7eb"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize="12"
          className="fill-gray-700 dark:fill-gray-200"
        >
          {limit > 0 ? `${Math.round((spent / limit) * 100)}%` : "—"}
        </text>
      </svg>

      <div className="leading-tight">
        {label && <div className="text-sm font-medium">{label}</div>}
        <div className="text-xs text-gray-600 dark:text-gray-400">
          Spent {money.format(spent / 100)} / Limit {money.format(limit / 100)}
        </div>
      </div>
    </div>
  );
}

