"use client";

type Props = {
  /** Your month’s spend for this category (can be negative if it’s stored as an expense). */
  spentCents: number;
  /** Budget limit for the month in cents. 0 (or missing) means “no limit”. */
  limitCents: number;
  /** Visual tweaks */
  size?: number;   // px
  stroke?: number; // px
  className?: string;
  title?: string;  // accessible label
};

/**
 * Small, dependency-free radial progress ring for budgets.
 * Green <85%, Amber 85–100%, Red >100%.
 */
export default function BudgetRing({
  spentCents,
  limitCents,
  size = 28,
  stroke = 4,
  className,
  title,
}: Props) {
  // Normalize + guard
  const spent = Math.abs(Number(spentCents) || 0);
  const limit = Math.max(0, Number(limitCents) || 0);

  const pct = limit > 0 ? Math.min(999, Math.round((spent / limit) * 100)) : 0;

  // Geometry
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;

  // Colors
  const color = pct > 100 ? "#dc2626" : pct >= 85 ? "#f59e0b" : "#10b981"; // red / amber / green

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-label={title ?? `${pct}% used`}
      role="img"
    >
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="currentColor"
        strokeOpacity="0.15"
        strokeWidth={stroke}
        fill="none"
      />
      {/* Progress */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${circ} ${circ}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

