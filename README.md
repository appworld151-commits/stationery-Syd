# AYANO KOJI
Digital bookstore: React + TypeScript + Vite + Tailwind + Supabase (PWA), deployed to GitHub Pages.

Live: https://appworld151-commits.github.io/stationery-Syd/

## Features
Browse/search the store, sign up / sign in, get free books or request paid ones, personal library with private
PDF/EPUB files (signed URLs), owner/admin purchase approval, 4 languages (Sorani Kurdish, Arabic, English, Japanese) with RTL,
dark/light theme, installable PWA. Database includes bookmarks, reading progress, favorites, roles and activity logs.

## Quick start
```
npm install
cp .env.example .env     # optional: add Supabase URL + anon key
npm run dev
npm run build            # typecheck + production build into dist/
```
The app runs without Supabase credentials and shows a setup notice instead of crashing.

## Docs
- `docs/SUPABASE_SETUP.md` - database, auth, storage, first owner account
- `docs/DEPLOY_GITHUB_PAGES.md` - GitHub Pages + Actions
- `docs/FIREBASE.md` - why Firebase is not used

## Status / not built yet
In-app reader UI (bookmarks/progress tables and policies exist), book upload UI, password reset, payment gateway.
