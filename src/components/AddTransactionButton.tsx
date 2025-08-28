"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddTransactionButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setMsg(null);
    try {
      const n = parseFloat(amount);
      if (Number.isNaN(n)) throw new Error("Invalid amount");
      const amountCents = Math.round(n * 100);
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ postedAt: date, merchant, amountCents }),
      });
      if (!res.ok) throw new Error("Create failed");
      setMsg("Created");
      setOpen(false);
      setMerchant("");
      setAmount("");
      router.refresh();
    } catch {
      setMsg("Failed");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 1500);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/10"
      >
        Add Transaction
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[420px] rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900">
            <h3 className="mb-3 text-lg font-semibold">Add Transaction</h3>
            <form onSubmit={onSubmit} className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block">Date</span>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded border px-2 py-1 dark:border-white/10 dark:bg-neutral-800"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block">Merchant</span>
                <input
                  type="text"
                  required
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="w-full rounded border px-2 py-1 dark:border-white/10 dark:bg-neutral-800"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block">Amount (e.g. -12.99)</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded border px-2 py-1 dark:border-white/10 dark:bg-neutral-800"
                />
              </label>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-60 dark:bg白 dark:text-black"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
              {msg && <p className="pt-1 text-center text-xs text-gray-600 dark:text-gray-300">{msg}</p>}
            </form>
          </div>
        </div>
      )}
    </>
  );
}

