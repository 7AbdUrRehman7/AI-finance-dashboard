"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useMemo, useRef } from "react";

function fmtLabel(ym: string) {
  // ym = "YYYY-MM"
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1, 1);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function clampYM(ym: string) {
  // basic guard; fall back to current month
  const m = /^\d{4}-\d{2}$/.test(ym) ? ym : new Date().toISOString().slice(0, 7);
  return m;
}

function addMonths(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1, 1);
  d.setMonth(d.getMonth() + delta);
  return d.toISOString().slice(0, 7); // YYYY-MM
}

export default function MonthFilter() {
  const router = useRouter();
  const params = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  // current month (default = this month)
  const currentYM = useMemo(() => {
    const fromUrl = params.get("month");
    return clampYM(fromUrl ?? new Date().toISOString().slice(0, 7));
  }, [params]);

  function setMonth(ym: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set("month", ym);
    router.push(`/dashboard?${sp.toString()}`, { scroll: false });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50 dark:hover:bg-white/10"
        onClick={() => setMonth(addMonths(currentYM, -1))}
        title="Previous month"
      >
        ‹
      </button>

      <button
        type="button"
        className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-white/10"
        onClick={() => inputRef.current?.showPicker?.()}
        title="Pick month"
      >
        {fmtLabel(currentYM)}
      </button>

      <button
        type="button"
        className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50 dark:hover:bg-white/10"
        onClick={() => setMonth(addMonths(currentYM, +1))}
        title="Next month"
      >
        ›
      </button>

      {/* hidden native month picker (appears as a dialog on click) */}
      <input
        ref={inputRef}
        type="month"
        value={currentYM}
        onChange={(e) => setMonth(e.target.value)}
        className="sr-only"
        aria-hidden
      />
    </div>
  );
}

