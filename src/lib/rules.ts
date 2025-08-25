
export type Rule = { pattern: RegExp; category: string };

export const RULES: Rule[] = [
  { pattern: /uber|lyft/i, category: "Transport" },
  { pattern: /chipotle|mcd|kfc|tim\s*h?ortons|burger|pizza|subway|starbucks|coffee/i, category: "Food" },
  { pattern: /walmart|costco|no\s*frills|loblaws|sobeys|aldi|kroger/i, category: "Groceries" },
  { pattern: /rogers|bell|telus|verizon|comcast|internet|wifi|vodafone|at&t|hydro|electric|water/i, category: "Utilities" },
  { pattern: /payroll|salary|payche?ck|direct\s*deposit|stripe\s*payout/i, category: "Income" },
  { pattern: /netflix|spotify|disney|prime\s*video|youtube\s*premium|hulu/i, category: "Entertainment" },
  { pattern: /apple|best\s*buy|amazon/i, category: "Shopping" },
  { pattern: /uber\s*eats|doordash|skip\s*the\s*dishes/i, category: "Food" },
  { pattern: /tuition|udemy|coursera|udacity|school|university/i, category: "Education" },
  { pattern: /pharmacy|drug|shoppers|walgreens|rite\s*aid|health|dent(ist|al)/i, category: "Health" },
  { pattern: /air\s*canada|delta|airlines|hotel|airbnb|booking\.com|expedia/i, category: "Travel" },
  { pattern: /rent|landlord|property\s*management/i, category: "Rent" },
  { pattern: /fee|fees|service\s*charge|overdraft|nsf/i, category: "Fees" },
];

export function suggestCategoryName(input: {
  merchant?: string;
  rawDesc?: string;
  amountCents?: number;
}): string | null {
  const text = `${input.merchant ?? ""} ${input.rawDesc ?? ""}`.toLowerCase();
  for (const rule of RULES) {
    if (rule.pattern.test(text)) return rule.category;
  }
  // Simple heuristic: positive amounts default to Income
  if ((input.amountCents ?? 0) > 0) return "Income";
  return null;
}
