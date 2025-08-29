# AI Finance Dashboard (Full-Stack Next.js + TypeScript)

Personal finance web app to import transactions, categorize them (rules **and AI**), review uncategorized items in bulk, set **budgets** with progress/alerts, explore **insights** and charts, and **export** filtered results to CSV.

> Built with **Next.js 15 (App Router)**, **TypeScript**, **MongoDB/Mongoose**, **Tailwind**, and lightweight charting. Optional LLM endpoints power AI categorization.

---

## ✨ Features (shipping now)

* **CSV Import**: Upload bank/credit card CSVs (sample included).
* **Transactions Table**:

  * Text/category/date/amount filters (server-side).
  * **Pagination** (rows per page, next/prev).
  * Inline category editing.
  * **Filter-aware Export to CSV** (exports exactly what you filtered).
* **Categorization**:

  * Rules-first manual editing.
  * **AI categorization** (preview/apply) via API endpoints (optional).
  * **Review** tab with selection, bulk apply, and pagination.
* **Budgets**:

  * Create/read/update by category & month.
  * “Spent / Left / Over” numbers with progress bars.
  * **Budget alerts** on the dashboard.
* **Dashboard**:

  * Net total, **Budget vs Spend**, **Insights** card (top category, deltas vs last month, spike day).
  * Daily income vs expenses chart.
  * Category breakdown & per-category totals with budget badges.
* **Export**:

  * CSV export respects **all active filters** (text, category, dates, amounts, uncategorized, sort).

> Note: the **To** date filter is currently treated as an **exclusive** end (e.g., filtering `2025-08-01` → `2025-08-31` returns dates `< 2025-08-31`). Choose next day (e.g., `2025-09-01`) to include the last day.

---

## 📸 Screenshots

(Replace these with your own in `/public/screenshots` and update the paths.)

* Dashboard: ![Dashboard](/public/screenshots/dashboard1.png)
* Transactions: ![Transactions](/public/screenshots/Transactions.png)
* Review: ![Review](/public/screenshots/Review.png)
* Budgets: ![Budgets](/public/screenshots/Budgets.png)

---

## 🧱 Tech Stack

* **Frontend/SSR**: Next.js 15 (App Router), React, TypeScript, TailwindCSS
* **DB/ODM**: MongoDB Atlas, Mongoose
* **Charts**: Recharts/lightweight components
* **AI (optional)**: LLM endpoints for categorization
* **Tooling**: Turbopack dev/build, Node 18+

---

## 🗂️ Project Structure (high-level)

```
src/
  app/
    dashboard/            # main analytics view
    transactions/         # table + filters + export + pagination
    review/               # review queue with selection and bulk apply
    budgets/              # budgets CRUD + progress/usage
    import/               # CSV importer
    api/
      transactions/
        search/           # server-side filtering + pagination (JSON)
        export/           # CSV export (respects filters)
        [id]/             # per-transaction update (e.g., category)
        uncat/count/
      categorize/         # rules + AI preview/apply
      review/             # bulk apply/reject/pending/populate
      analytics/          # summary/timeseries/insights
      budgets/            # GET/PUT/DELETE, /copy
      setup/categories    # seed categories
      seed                # optional sample seed
  components/             # UI pieces (filters, tables, badges, charts)
  lib/                    # db, budgets, date, suggest, etc.
  models/                 # Mongoose models: Transaction, Category, Budget, Suggestion
```

---

## ⚙️ Setup

### 1) Prereqs

* Node.js **>= 18**
* MongoDB Atlas connection string

### 2) Environment

Create `.env.local` from the example below:

```bash
cp .env.example .env.local
```

### 3) Install & Run

```bash
npm install
npm run dev        # http://localhost:3000
```

> If you see a Turbopack “workspace root” warning about multiple lockfiles, remove any extra `package-lock.json` outside the project folder, or set `turbopack.root` in `next.config.ts`.

### 4) Initialize Data (optional)

* Seed default categories: `GET http://localhost:3000/api/setup/categories`
* Seed sample data: `GET http://localhost:3000/api/seed`
* Or import your own CSV at `/import` (see `samples/`).

---

## 🔐 Environment Variables

See `.env.example` for the minimal set. For AI features, add your model provider key (e.g., `OPENAI_API_KEY`) and enable the endpoints.

---

## 🧭 Pages Overview

* **/dashboard**
  Net total, Budget vs Spend, Insights, daily trends, category tables.
* **/transactions**
  Filters (text/category/date/amount/uncategorized), **Export CSV (filtered)**, inline category edit, pagination.
* **/review**
  Shows uncategorized by default, selection checkboxes, **bulk apply**, pagination.
* **/budgets**
  Per-category monthly limits with **Spent/Left/Over** and progress bars; copy last month’s budgets.
* **/import**
  CSV importer (maps your file to `Transaction` schema).

---

## 📤 API (selected)

### `GET /api/transactions/search`

Server-side filtered list (JSON).

* Query: `text, categoryId, from (YYYY-MM-DD), to (YYYY-MM-DD exclusive), min, max` (in **cents**), `onlyUncategorized`, `page`, `limit`, `sort (dateAsc|dateDesc|amountAsc|amountDesc)`
* Returns: `{ page, pageSize, total, items[] }`

### `GET /api/transactions/export`

**CSV** export that **respects the same filters** as `search`.

* Query: `text, categoryId, from, to, min, max, onlyUncategorized, sort`
* Returns CSV with: Date, Merchant, Description, Category, Amount (CAD), AmountCents, Id

### Budgets

* `GET/PUT/DELETE /api/budgets` — upsert/remove budget for `{ month, categoryId, limitCents }`
* `POST /api/budgets/copy` — copy previous month’s budgets to the current month

### Review

* `POST /api/review/apply` — bulk apply `{ ids: string[], categoryId: string|null }`
* `POST /api/review/reject` — (if used) reject a suggestion
* `GET /api/review/pending` — (if used) pending suggestions
* `POST /api/review/populate` — (if used) populate suggestions

### Analytics

* `GET /api/analytics/summary` — totals for the dashboard
* `GET /api/analytics/timeseries` — daily points for the chart
* `GET /api/analytics/insights` — top category, deltas vs last month, spike day

### Categorization

* `POST /api/categorize/preview` — rules engine preview
* `POST /api/categorize/apply` — apply rules
* `POST /api/categorize/ai/preview` — AI preview (optional)
* `POST /api/categorize/ai/apply` — AI apply (optional)

---

## 🚀 Deployment (Vercel)

1. Push to GitHub.
2. Import the repo in Vercel.
3. Set **Environment Variables** (from `.env.local`).
4. **Build Command**: `npm run build` (Next.js 15).
5. **Start Command**: leave default.
6. Ensure MongoDB IP access list includes Vercel IPs or use SRV with user/pass.

---

## ✅ What’s Complete vs Skipped

* **Complete**: CSV import, transactions table + filters + pagination, rules/manual categorization, AI endpoints & UI actions, review queue + bulk apply + pagination, budgets CRUD + progress/alerts, dashboard charts & insights, filter-aware CSV export.
* **Intentionally Skipped**: Goals + what-if slider, cron jobs/email alerts, extensive test suite, NextAuth, polished skeleton states for every page (some exist), 404/500 pages (basic ones may exist via App Router defaults).

---

## 🧪 Tests (lightweight suggestion)

Add a few high-value tests:

* `transactions/search` date/amount filtering
* `transactions/export` honoring filters
* budget math (`Spent/Left/Over`, alert thresholds)

---

## 🙏 Acknowledgements

Inspired by real-world fintech workflows. Thanks to open-source maintainers of Next.js, Tailwind, Mongoose, and charting libs.

---

# .env.example

```env
# --- Server / DB ---
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority

# Optional: used by some internal URL builders (falls back to headers)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# --- AI (optional) ---
# Enable AI categorization endpoints by providing a key.
# OPENAI_API_KEY=sk-...

# --- Node/Next ---
# NODE_ENV=development
```
