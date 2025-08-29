"use client";

type Cat = { _id: string; name: string };

export default function ReviewBulkBar({
  selectedCount,
  categories,
  bulkCatId,
  setBulkCatId,
  onApply,
  onClear,
  onToggleAll,
  allChecked,
}: {
  selectedCount: number;
  categories: Cat[];
  bulkCatId: string;
  setBulkCatId: (v: string) => void;
  onApply: () => void;
  onClear: () => void;
  onToggleAll: (on: boolean) => void;
  allChecked: boolean;
}) {
  const any = selectedCount > 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2 dark:border-white/10">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          className="h-4 w-4 accent-indigo-500"
          checked={allChecked}
          onChange={(e) => onToggleAll(e.target.checked)}
          aria-label="Select all"
        />
        <span className="text-sm text-gray-600 dark:text-gray-300">{selectedCount} selected</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={bulkCatId}
          onChange={(e) => setBulkCatId(e.target.value)}
          className="rounded border px-2 py-1 text-sm dark:border-white/10 dark:bg-neutral-900"
          disabled={!any}
          title={any ? "Choose a category to apply to selected" : "Select rows first"}
        >
          <option value="">Uncategorized</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>

        <button
          onClick={onApply}
          disabled={!any}
          className={`rounded-lg px-3 py-1.5 text-sm ring-1 transition ${
            any ? "ring-indigo-500 hover:bg-indigo-500/10" : "cursor-not-allowed opacity-50 ring-white/20"
          }`}
        >
          Apply Selected
        </button>

        <button
          onClick={onClear}
          disabled={!any}
          className={`rounded-lg px-3 py-1.5 text-sm ring-1 transition ${
            any ? "ring-gray-400 hover:bg-white/5 dark:ring-white/20" : "cursor-not-allowed opacity-50 ring-white/20"
          }`}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

