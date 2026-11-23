# Deploying to GitHub Pages

Site: `https://appworld151-commits.github.io/stationery-Syd/`

## One-time repository settings
1. **Settings -> Pages -> Build and deployment -> Source: GitHub Actions.**
2. (Optional, for Supabase) **Settings -> Secrets and variables -> Actions**:
   add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, either under **Variables** or **Secrets**.
   These values end up in the public JavaScript bundle by design, so use only the URL and the anon key.
   They are read at build time: after changing them, re-run the workflow.

## Deploy
Push to `main` (or Actions -> "Deploy to GitHub Pages" -> Run workflow). The workflow runs
`npm install`, `npm run build` (typecheck + Vite build + `dist/404.html` copy), checks the output, and publishes `dist`.

## How the subpath is handled
- `vite.config.ts`: `base: '/stationery-Syd/'` (assets, PWA manifest `start_url`/`scope`, service worker scope).
- `src/main.tsx`: `BrowserRouter basename` is derived from `import.meta.env.BASE_URL`.
- `scripts/postbuild.mjs`: copies `index.html` to `404.html` so refreshing a deep link such as `/stationery-Syd/store` loads the app.
  (GitHub serves that page with HTTP 404 status; the app still renders. This is a known limitation of Pages.)
- If you rename the repository, change `BASE` in `vite.config.ts` and the string in `.github/workflows/deploy.yml`.

## If the page looks stale
The PWA service worker caches the app. Hard refresh (Ctrl+Shift+R) or DevTools -> Application -> Service Workers -> Unregister.

## Local check of the production build
```
npm install
npm run build
npm run preview      # open the printed URL, including /stationery-Syd/
```
Commit the generated `package-lock.json` after your first local install so builds are reproducible.
