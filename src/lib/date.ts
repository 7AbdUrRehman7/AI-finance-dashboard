// src/lib/date.ts
export function monthWindow(ym?: string) {
  const valid = /^\d{4}-\d{2}$/.test(ym ?? "");
  const used = valid ? (ym as string) : new Date().toISOString().slice(0, 7);
  const [y, m] = used.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { used, start, end };
}

