
import Link from "next/link";
export default function Home() {
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">AI Finance Dashboard (Day 1)</h1>
      <Link className="underline" href="/transactions">View Transactions</Link>
    </main>
  );
}
