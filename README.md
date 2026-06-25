Next.js App Router scaffold for migration.

This folder contains placeholder pages mapping the current Vite routes.

Migration notes:
- Replace placeholders in `app/*` with migrated components from `src/*`.
- Client-only components must be annotated with `"use client"`.
- Server components should import pure UI or data-fetching logic.
- See the migration plan in the project root for details.

## Manual tests

| Script | Command | Purpose |
|--------|---------|---------|
| Matching (Phase 4) | `npm run matching:manual-test` | Tier escalation + SMS response matrix |
| Payments (Phase 5) | `npm run payments:manual-test` | SetupIntent, PI helpers, idempotency (in-memory by default) |

For Stripe browser + webhook testing, see the **Stripe CLI end-to-end** section in `scripts/payments-manual-test.ts` (requires `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and test keys in `.env.local`).
