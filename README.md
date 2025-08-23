Love it—you’re ready to upgrade that boilerplate. Here’s a **drop-in README.md** you can paste over your current one.

---

# AI Finance Dashboard

A full-stack **Next.js + TypeScript** app with **MongoDB (Mongoose)** that imports/creates transactions and visualizes them. Day 1 ships a clean **Transactions** table and a **seed endpoint** to load demo data.

## ✨ Features (current)

* Next.js (App Router) + Tailwind UI
* MongoDB Atlas connection via `.env.local`
* `/api/seed` endpoint to insert sample transactions
* Transactions table with currency formatting, hover rows, and dark-mode friendly header

## 🧰 Tech Stack

* **Frontend:** Next.js (React, App Router), Tailwind CSS
* **Backend:** Next.js Route Handlers (Node runtime)
* **Database:** MongoDB Atlas + Mongoose
* **Language:** TypeScript

---

## 🚀 Quick Start

1. **Install**

```bash
npm i
```

2. **Set environment variables**
   Create a file **`.env.local`** in the project root:

```bash
MONGODB_URI="mongodb+srv://<username>:<URL_ENCODED_PASSWORD>@<cluster>.mongodb.net/finance?retryWrites=true&w=majority&appName=FinanceDashboard"
```

> If your password has `@ # / ? &` etc, encode it:
>
> ```bash
> node -e "console.log(encodeURIComponent(process.argv[1]))" 'YourRawPassword'
> ```

3. **Dev server**

```bash
npm run dev
```

4. **Seed demo data** (one time)
   Open this in your browser:

```
http://localhost:3000/api/seed
```

You should see:

```json
{"inserted":5}
```

5. **View transactions**

```
http://localhost:3000/transactions
```

---

## 📂 Project Structure

```
src/
  app/
    api/
      seed/
        route.ts         # inserts sample transactions
    transactions/
      page.tsx           # UI: table of recent transactions
    page.tsx             # (optional) link to /transactions
  lib/
    db.ts                # Mongoose connection helper
  models/
    Transaction.ts       # Mongoose schema
```

---

## 🔒 Secrets & Safety

* Do **not** commit `.env.local`. Ensure it’s in `.gitignore`.
* Add a shareable template for teammates:

  ```bash
  printf 'MONGODB_URI="<fill locally>"\n' > .env.example
  ```

---

## 🗺️ Roadmap (next steps)

* CSV Upload (drag-and-drop) → import real transactions
* Categories model + quick inline edit
* Monthly totals & category breakdown charts
* Budgets per category with progress rings
* AI categorization & insights
* Auth (NextAuth) and multi-account support

---

## 📝 Scripts

```bash
npm run dev     # start dev server
npm run build   # production build
npm run start   # start production server
```

---

## 📸 Screenshots

*Add screenshots here (e.g., Transactions page).*

---

## 📄 License

MIT (or choose your preferred license)

---

If you want, I can also generate the `.env.example` file content and a small screenshot block for you. After you paste this README, do:

```bash
git add README.md .env.example
git commit -m "Docs: Replace boilerplate README with project overview"
git push
```
