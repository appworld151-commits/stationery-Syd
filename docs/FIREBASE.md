# Firebase decision: not integrated

**Decision:** Firebase is not added. Supabase already provides everything the app needs (Postgres, Auth, private Storage, RLS).
Adding Firebase Auth or Firestore would duplicate those systems and split user data across two providers.

Optional Firebase services were considered:

| Service | Verdict |
|---|---|
| Analytics | Not needed yet. Adds a third-party SDK and consent/privacy obligations. Can be added later behind env flags. |
| Cloud Messaging (push) | Not feasible on GitHub Pages alone: sending pushes needs a trusted server (a Supabase Edge Function or similar) holding a Firebase **service account**, which must never be placed in this repo or in `VITE_*` variables. iOS web push also requires the PWA to be installed. |

If you later want push notifications: create a Firebase project, add a Web app, put only the public web config in
`VITE_FIREBASE_*` variables, and keep the service-account JSON as a secret of a Supabase Edge Function (never in GitHub Pages or `VITE_*`).
That would be a separate, tested piece of work (service-worker integration with the existing PWA plugin + a send function).
