// src/lib/suggest.ts
// ASCII-only helpers for rule-based categorization (fast, offline)

export type SuggestInput = {
  merchant?: string | null;
  rawDesc?: string | null;
  amountCents: number;
};

export type HeuristicSuggest =
  | { category: string; score: number; source: "heuristic" }
  | null;

// Utility: lowercase, merge merchant + rawDesc safely
function combinedText(inp: SuggestInput): string {
  const a = inp.merchant ? String(inp.merchant) : "";
  const b = inp.rawDesc ? String(inp.rawDesc) : "";
  return (a + " " + b).toLowerCase();
}

/**
 * Scored heuristic suggestion.
 * Returns { category, score, source: "heuristic" } or null.
 */
export function heuristicSuggest(inp: SuggestInput): HeuristicSuggest {
  const text = combinedText(inp);

  // High-confidence Income if positive and looks like payroll
  if (inp.amountCents > 0) {
    const incomeStrong = /\b(payroll|salary|deposit|direct\s*deposit|adp|paychex|paycheque|paycheck)\b/;
    if (incomeStrong.test(text)) {
      return { category: "Income", score: 0.95, source: "heuristic" };
    }
  }

  // Keyword buckets (order matters). Tune as needed for your data.
  const checks: Array<{ re: RegExp; category: string; score: number }> = [
    // Groceries
    { re: /\b(walmart|costco|no ?frills|loblaw|superstore|metro|sobeys|freshco)\b/, category: "Groceries", score: 0.9 },

    // Transport
    { re: /\b(uber|lyft|presto|ttc|go transit|shell|petro canada|esso|bp|circle k)\b/, category: "Transport", score: 0.85 },

    // Utilities (Canada-ish set)
    { re: /\b(rogers|bell|telus|shaw|fido|koodo|hydro|enbridge|internet|water|electric|gas)\b/, category: "Utilities", score: 0.9 },

    // Rent / housing
    { re: /\b(rent|landlord|property management|apt|apartment)\b/, category: "Rent", score: 0.9 },

    // Food (restaurants/coffee)
    { re: /\b(starbucks|tim hortons|mcdonald|burger king|kfc|wendy|chipotle|subway|pizza|cafe|coffee)\b/, category: "Food", score: 0.85 },

    // Shopping / retail
    { re: /\b(amazon|best buy|ikea|indigo|canadian tire)\b/, category: "Shopping", score: 0.85 },

    // Health
    { re: /\b(pharma|pharmacy|shoppers drug mart|dentist|clinic|optical|vision)\b/, category: "Health", score: 0.85 },

    // Travel
    { re: /\b(air canada|westjet|expedia|hotel|booking\.com|airbnb)\b/, category: "Travel", score: 0.85 },

    // Fees
    { re: /\b(fee|service charge|overdraft|nsf|interest)\b/, category: "Fees", score: 0.8 },

    // Education
    { re: /\b(udemy|coursera|edx|university|college|tuition|textbook)\b/, category: "Education", score: 0.8 },

    // Entertainment / subscriptions
    { re: /\b(netflix|spotify|disney|prime video|youtube premium|hulu|crave)\b/, category: "Entertainment", score: 0.8 },
  ];

  for (const rule of checks) {
    if (rule.re.test(text)) {
      return { category: rule.category, score: rule.score, source: "heuristic" };
    }
  }

  // Fallbacks: if positive, weak Income; otherwise Other
  if (inp.amountCents > 0) {
    return { category: "Income", score: 0.6, source: "heuristic" };
  }
  return { category: "Other", score: 0.55, source: "heuristic" };
}

/**
 * Simple convenience: return only the category name or null.
 * This mirrors the earlier "rules-first categorizer" usage.
 */
export function heuristicCategory(inp: SuggestInput): string | null {
  const s = heuristicSuggest(inp);
  return s ? s.category : null;
}

