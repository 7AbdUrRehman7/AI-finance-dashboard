"use client";

import Link from "next/link";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  /** Query string of current filters WITHOUT page/limit (e.g. "text=foo&categoryId=123") */
  baseQuery: string;
  /** Which route to page on (defaults to /transactions) */
  basePath?: string;
};

function hrefWith(basePath: string, baseQuery: string, page: number, limit?: number) {
  const qs = new URLSearchParams(baseQuery);
  qs.set("page", String(page));
  if (limit) qs.set("limit", String(limit));
  return `${basePath}?${qs.toString()}`;
}

export default function Pagination({
  page,
  pageSize,
  total,
  baseQuery,
  basePath = "/transactions",
}: Props) {
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const prevDisabled = page <= 1;
  const nextDisabled = page >= maxPage;

  const prevHref = hrefWith(basePath, baseQuery, Math.max(1, page - 1), pageSize);
  const nextHref = hrefWith(basePath, baseQuery, Math.min(maxPage, page + 1), pageSize);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm">Rows per page</span>
        <select
          className="rounded-lg border px-2 py-1 text-sm dark:border-white/10 dark:bg-neutral-900"
          value={pageSize}
          onChange={(e) => {
            const n = Number(e.target.value);
            // When page size changes, reset to page 1
            window.location.href = hrefWith(basePath, baseQuery, 1, n);
          }}
        >
          {[10, 20, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <span className="px-2 text-sm">
        {page} / {maxPage}
      </span>

      <Link
        href={prevHref}
        aria-label="Previous page"
        className={`rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/10 ${
          prevDisabled ? "pointer-events-none opacity-50" : ""
        }`}
      >
        ‹ Prev
      </Link>

      <Link
        href={nextHref}
        aria-label="Next page"
        className={`rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/10 ${
          nextDisabled ? "pointer-events-none opacity-50" : ""
        }`}
      >
        Next ›
      </Link>
    </div>
  );
}

