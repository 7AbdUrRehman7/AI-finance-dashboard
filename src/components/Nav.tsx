"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/review", label: "Review" },
  { href: "/budgets", label: "Budgets" },
  // future: { href: "/insights", label: "Insights" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-neutral-950/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="text-base font-semibold tracking-tight">
          Finance Dashboard
        </Link>

        <nav className="flex items-center gap-2">
          {links.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm transition
                  ${active
                    ? "bg-gray-900 text-white dark:bg-white dark:text-black"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/10"
                  }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

