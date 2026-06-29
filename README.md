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
| Edge cases (Phase 6) | `npm run phase6:manual-test` | Service SMS, cancel/no-show/dispute/stale (in-memory by default) |
| Receipt capture (M2) | `npm run receipt:manual-test` | Parts receipt upload, 24h deadline, MMS branch (in-memory by default) |
| Quote hardening (M3) | `npm run quote:manual-test` | $500 parts pre-approval, 2h auto-decline, $35 decline SMS (in-memory by default) |

For Stripe browser + webhook testing, see the **Stripe CLI end-to-end** section in `scripts/payments-manual-test.ts` (requires `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and test keys in `.env.local`).

MMS receipt upload requires server-side `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. Optional `RECEIPT_DEADLINE_SECONDS` overrides the 24-hour QStash delay for staging/tests.
