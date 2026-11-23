# Supabase setup (primary database, auth and file storage)

## 1. Create the project
1. https://supabase.com -> New project. Save the database password somewhere safe.
2. **Project Settings -> API**: copy the **Project URL** and the **Publishable key** (`sb_publishable_...`; the legacy `anon` key also works).
   Do NOT copy or use the `service_role` key anywhere in this repo or in GitHub Actions.

## 2. Run the SQL (SQL Editor -> New query), in this order
1. `supabase/migrations/0001_schema.sql`  (tables, roles, base RLS)
2. `supabase/migrations/0002_functions_policies_storage.sql`  (permissions, purchase workflow, storage buckets + policies)
3. `supabase/seed.sql`  (optional: starter categories)

Run each file once and check for errors. If 0001 reports "already exists", you ran it before - skip it and run 0002.

## 3. Authentication settings (Authentication -> URL Configuration)
- **Site URL**: `https://appworld151-commits.github.io/stationery-Syd/`
- **Redirect URLs**: add `https://appworld151-commits.github.io/stationery-Syd/**` and `http://localhost:5173/**`
- Authentication -> Providers -> Email: keep enabled. "Confirm email" on is recommended.
  The built-in mailer is rate limited; configure custom SMTP before real launch.

## 4. Create your owner account
1. Open the site, **Sign in -> Create account**, confirm the email, sign in once.
2. In the SQL editor run `supabase/bootstrap_owner.sql` (edit the email first).
   Roles can only be changed by an owner or from the SQL editor; users cannot promote themselves.

## 5. Storage (created by migration 0002)
| Bucket | Public | Contents | Path stored in `books` column |
|---|---|---|---|
| `covers` | yes | cover images (jpg/png/webp, 5 MB max) | `cover_path` e.g. `<book-id>.jpg` |
| `previews` | yes | free sample PDF/EPUB (20 MB max) | `preview_path` |
| `books` | **no** | full PDF/EPUB (50 MB max) | `file_path` e.g. `<book-id>/book.pdf` |

Only staff with `manage_books` can upload. A signed-in user can read a file in `books` only if the book is in their `user_library`
(the app opens it via a 1-hour signed URL). The free plan caps uploads at 50 MB per file.

## 6. Adding a book today (there is no upload UI yet)
1. Table editor -> `books` -> insert a row (title, author, price_cents, currency, `published = true`, `published_at = now()`).
2. Storage -> upload the cover to `covers` and the file to `books`, then set `cover_path` / `file_path` to the exact object path.

## 7. How purchases work
- Free book (`price_cents = 0`): **Get free** adds it to the library immediately.
- Paid book: **Request** creates a `pending` purchase (price taken from the database, not the browser). An owner, or an admin with
  `can_approve_payments`, approves it under **Admin**, which adds it to the user's library. No payment gateway is integrated.

## 8. Local development
```
cp .env.example .env     # fill in URL + anon key
npm install
npm run dev
```
Without `.env` the app still runs and shows a "Supabase is not configured" notice.

## Security notes
- All tables have RLS enabled. The browser only ever holds the anon key.
- Clients cannot insert into `purchases` or `user_library`; only the `request_book` / `approve_purchase` functions can.
- Test your RLS yourself before launch (try reading another user's rows with a second account).

## GitHub Actions secrets (exact location)
Repository on github.com -> **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret** (Secrets tab). Add two:

| Name (exact) | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://<your-project-id>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | your `sb_publishable_...` key |

Then **Actions -> Deploy to GitHub Pages -> Run workflow**; values are read at build time. Do **not** add the secret key.
The app refuses to start Supabase if it detects a secret / service_role key and shows an on-screen warning.

## If a secret key was ever shared
Rotate it: Supabase -> Project Settings -> API Keys -> secret key -> regenerate / delete. Do this for any key pasted in chat, email or a repo.
