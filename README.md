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
| Requote + tolerance (M4) | `npm run requote:manual-test` | REQUOTE flow, 2h auto-decline, DONE tolerance/receipt reconciliation (in-memory by default) |

For Stripe browser + webhook testing, see the **Stripe CLI end-to-end** section in `scripts/payments-manual-test.ts` (requires `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and test keys in `.env.local`).

MMS receipt upload requires server-side `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. Optional `RECEIPT_DEADLINE_SECONDS` overrides the 24-hour QStash delay for staging/tests. Optional `REQUOTE_TIMEOUT_SECONDS` overrides the 2-hour requote auto-decline delay (same pattern as `QUOTE_TIMEOUT_SECONDS`).

## Milestone 5 staging demos (no live Twilio / QStash / Cloudinary)

With `ALLOW_DEV_OTP=true` (and optional `NEXT_PUBLIC_ALLOW_DEV_OTP=true`):

| Flag | Effect |
|------|--------|
| `ALLOW_DEV_OTP=true` | Mechanic OTP accepts `000000`; outbound SMS logs to console (`SMS_MOCK` default) |
| `QSTASH_DEV=true` | Schedules workers locally (mock ids + delayed `fetch` to `APP_URL`) |
| Cloudinary unset | Web receipt upload uses a public placeholder URL; paste HTTPS URL also supported |
| `POST /api/dev/sms-inbound` | Simulate inbound SMS/MMS (requires `x-matching-dev-secret: $MATCHING_DEV_SECRET`) |

Example — mechanic `DIAGNOSING` then quote:

```bash
curl -s -X POST "$APP_URL/api/dev/sms-inbound" \
  -H "Content-Type: application/json" \
  -H "x-matching-dev-secret: $MATCHING_DEV_SECRET" \
  -d '{"from":"+15551234567","body":"DIAGNOSING"}'

curl -s -X POST "$APP_URL/api/dev/sms-inbound" \
  -H "Content-Type: application/json" \
  -H "x-matching-dev-secret: $MATCHING_DEV_SECRET" \
  -d '{"from":"+15551234567","body":"QUOTE $245 PARTS $80 ON_HAND"}'
```

Force real Twilio / QStash / Cloudinary: `SMS_MOCK=0`, `QSTASH_DEV=false`, configure Cloudinary, and omit `RECEIPT_UPLOAD_MOCK`.

Manual timer workers (when `QSTASH_DEV=true`):

```bash
curl -s -X POST "$APP_URL/api/jobs/quote/timeout" \
  -H "Content-Type: application/json" \
  -H "x-matching-dev-secret: $MATCHING_DEV_SECRET" \
  -d '{"jobId":"recXXXX"}'
```

For short local timer demos set `QUOTE_TIMEOUT_SECONDS=30` and/or `RECEIPT_DEADLINE_SECONDS=60`.
