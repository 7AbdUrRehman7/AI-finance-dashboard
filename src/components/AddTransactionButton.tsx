"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Option = { id: string; name: string };

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function AddTransactionButton({ categories }: { categories: Option[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(toISO(new Date()));
  const [desc, setDesc] = useState("");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState(""); // string; we'll parse on submit
  const [category, setCategory] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          postedAt: date,
          description: desc || undefined,
          merchant: merchant || undefined,
          amount,               // can be "-12.34" or "$-12.34"
          categoryId: category || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setMsg("Created ✓");
      // reset minimal fields, keep date as convenience
      setDesc("");
      setMerchant("");
      setAmount("");
      setCategory("");
      router.refresh();
      setTimeout(() => setMsg(null), 2500);
    } catch (err: any) {
      setMsg(err?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/10"
        title="Create a single transaction"
      >
        {open ? "Close" : "Add Transaction"}
      </button>

      {open && (
        <form onSubmit={onSubmit}
          className="mt-2 flex flex-wrap items-end gap-2 rounded-xl border px-3 py-2 dark:border-white/10"
        >
          <div className="flex flex-col">
            <label className="text-xs text-gray-600 dark:text-gray-300">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded border px-2 py-1 text-sm dark:bg-neutral-900"
              required
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-600 dark:text-gray-300">Description</label>
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="e.g., Coffee"
              className="w-40 rounded border px-2 py-1 text-sm dark:bg-neutral-900"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-600 dark:text-gray-300">Merchant (optional)</label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="e.g., Starbucks"
              className="w-40 rounded border px-2 py-1 text-sm dark:bg-neutral-900"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-600 dark:text-gray-300">Amount</label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="-12.34 (expense) or 100.00 (income)"
              className="w-52 rounded border px-2 py-1 text-sm dark:bg-neutral-900"
              required
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-600 dark:text-gray-300">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-40 rounded border px-2 py-1 text-sm dark:bg-neutral-900"
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-60 dark:bg-white dark:text-black"
          >
            {loading ? "Saving…" : "Save"}
          </button>

          {msg && <span className="text-sm text-gray-600 dark:text-gray-400">{msg}</span>}
        </form>
      )}
    </div>
  );
}

