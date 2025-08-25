"use client";
import Papa from "papaparse";
import { useState } from "react";

function toCents(x: any) {
  // "$-1,234.56" -> -123456 cents
  const n = Number(String(x ?? "").replace(/[^0-9.-]/g, ""));
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

type Row = {
  postedAt: string;       // server will coerce to Date
  amountCents: number;    // negative = expense, positive = income
  merchant?: string;
  rawDesc?: string;
};

export default function ImportPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("");

  function onFile(file: File) {
    setRows([]);
    setStatus("Parsing…");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const mapped: Row[] = (res.data as any[])
          .map((r) => ({
            postedAt: r.Date || r.date || r.PostedAt || r.postedAt || r.DATE,
            amountCents: toCents(r.Amount ?? r.amount ?? r.AMOUNT),
            merchant: r.Merchant || r.merchant || undefined,
            rawDesc: r.Description || r.description || undefined,
          }))
          .filter((r) => r.postedAt && Number.isFinite(r.amountCents));

        setRows(mapped);
        setStatus(`Parsed ${mapped.length} rows`);
      },
      error: (e) => setStatus(`Parse error: ${e.message}`),
    });
  }

  async function upload() {
    if (!rows.length) return;
    setStatus("Uploading…");
    const res = await fetch("/api/transactions/bulk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(rows),
    });
    const json = await res.json().catch(() => ({}));
    setStatus(res.ok ? `Inserted ${json.inserted} rows` : `Error: ${JSON.stringify(json)}`);
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Import Transactions (CSV)</h1>

      <label className="block cursor-pointer rounded-xl border border-dashed p-6 text-center hover:bg-gray-50 dark:hover:bg-white/5">
        <input
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => e.target.files && onFile(e.target.files[0])}
        />
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Drop a CSV here or click to choose
        </div>
      </label>

      {status && <div className="text-sm text-gray-600 dark:text-gray-400">{status}</div>}

      {rows.length > 0 && (
        <>
          <div className="text-sm text-gray-600">
            Previewing <strong>{rows.length}</strong> rows
          </div>
          <button
            onClick={upload}
            className="rounded-lg bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
          >
            Upload
          </button>
        </>
      )}

      <div className="text-sm text-gray-500">
        Expected columns: <code>Date</code>, <code>Description</code>, <code>Amount</code> (case-insensitive). Optional: <code>Merchant</code>.
      </div>
    </main>
  );
}

