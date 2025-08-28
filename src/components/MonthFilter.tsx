"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useCallback } from "react";

function formatYM(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
function normalizeMonth(m?: string) {
  return m && /^\d{4}-\d{2}$/.test(m) ? m : formatYM(new Date());
}
function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1 + delta, 1);
  return formatYM(d);
}

export default function MonthFilter() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const month = useMemo(
    () => normalizeMonth(searchParams.get("month") ?? undefined),
    [searchParams]
  );

  const navigateTo = useCallback(
    (newMonth: string) => {
      const sp = new URLSearchParams(searchParams);
      sp.set("month", newMonth);
      router.push(`${pathname}?${sp.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Previous month"
        title="Previous month"
        onClick={() => navigateTo(shiftMonth(month, -1))}
        className="rounded-lg border px-2 py-1.5 text-sm hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/10"
      >
        ‹
      </button>

      <input
        type="month"
        value={month}
        onChange={(e) => navigateTo(normalizeMonth(e.target.value))}
        className="rounded-lg border px-3 py-1.5 text-sm dark:border-white/10 dark:bg-neutral-900"
      />

      <button
        type="button"
        aria-label="Next month"
        title="Next month"
        onClick={() => navigateTo(shiftMonth(month, +1))}
        className="rounded-lg border px-2 py-1.5 text-sm hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/10"
      >
        ›
      </button>
    </div>
  );
}

