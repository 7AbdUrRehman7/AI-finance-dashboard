"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Option = { id: string; name: string };

export function CategorySelect({
  txId,
  categories,
  value,
}: {
  txId: string;
  categories: Option[]; // expects plain {id, name}
  value?: string;
}) {
  const [v, setV] = useState(value ?? "");
  const router = useRouter();

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newId = e.target.value;
    setV(newId);

    // Send null to clear when “Uncategorized” is picked
    const body = newId ? { categoryId: newId } : { categoryId: null };
    await fetch(`/api/transactions/${txId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    router.refresh();
  }

  return (
    <select
      value={v}
      onChange={onChange}
      className="rounded border bg-white px-2 py-1 text-sm dark:bg-neutral-900"
    >
      <option value="">Uncategorized</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}

