// src/components/BudgetUsage.tsx
type Props = {
  limitCents?: number | null;
  spentCents: number; // positive cents spent in the month for this category
};

const money = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

export default function BudgetUsage({ limitCents, spentCents }: Props) {
  const hasLimit = typeof limitCents === "number" && (limitCents ?? 0) > 0;
  const left = (limitCents ?? 0) - spentCents;
  const over = spentCents - (limitCents ?? 0);

  const pct = hasLimit
    ? Math.min(100, Math.max(0, Math.round((spentCents / (limitCents as number)) * 100)))
    : 0;

  const barColor = hasLimit && spentCents > (limitCents as number) ? "bg-rose-500" : "bg-emerald-500";
  const textColor =
    hasLimit && spentCents > (limitCents as number) ? "text-rose-500" : "text-emerald-500";

  return (
    <div className="mt-2 text-xs">
      {/* numbers */}
      {hasLimit ? (
        <div className="mb-1 flex items-center gap-2">
          <span className="text-gray-400">Spent {money.format(spentCents / 100)}</span>
          <span className="text-gray-500">·</span>
          {spentCents > (limitCents as number) ? (
            <span className={`${textColor} font-medium`}>
              Over by {money.format(over / 100)}
            </span>
          ) : (
            <span className={`${textColor} font-medium`}>
              Left {money.format(left / 100)}
            </span>
          )}
        </div>
      ) : (
        <div className="mb-1 text-gray-400">
          Spent {money.format(spentCents / 100)} (no limit)
        </div>
      )}

      {/* bar */}
      <div className="h-2 w-full rounded-full bg-white/10">
        {hasLimit ? (
          <div
            className={`h-2 rounded-full ${barColor}`}
            style={{ width: `${pct}%` }}
            title={`Spent ${money.format(spentCents / 100)} of ${money.format(
              (limitCents as number) / 100
            )} (${pct}%)`}
          />
        ) : (
          <div
            className="h-2 rounded-full bg-gray-400/40"
            style={{ width: "100%" }}
            title={`Spent ${money.format(spentCents / 100)} (no limit)`}
          />
        )}
      </div>
    </div>
  );
}

