---
name: joe-store-production-guardrails
description: Enforces production engineering standards, server-side pricing validation, idempotency, operational alerting, privacy/DSAR compliance, and core performance guardrails for the JOE Store e-commerce platform. Use when modifying checkout, order creation, payment webhooks, auth/session flows, catalog imports, tracking analytics, legal/policy flows, or deployment configuration in joe-store.
---

# JOE Store Production Guardrails

Apply these mandatory architectural standards whenever extending or auditing the `joe-store` repository.

## 1. Server-Side Integrity, Idempotency & Payment Security
- **Never trust client pricing or totals**: Compute product prices, coupon discounts, and governorate shipping fees strictly on the server inside `api/store.ts` using `server/pricing.ts` (`validateAndComputeCouponDiscount`, `calculateServerShippingFee`, `sanitizeUploadedImage`) and real database product rows.
- **Enforce idempotency keys**: Preserve `idempotency_key` per checkout attempt (`server/orderWrites.ts` and `server/paymentGateway.ts` reuse matching pending/existing transactions instead of double-charging).
- **Verify gateway amounts & record alerts**: On Paymob/payment webhook callbacks (`server/paymentGateway.ts`), compare paid amount against expected `orders.total`. Never swallow gateway, WhatsApp CRM, or DB write failures silently — call `recordOperationalAlert` (`server/monitoring.ts`) with admin WhatsApp notification on critical failures.
- **Bounded external calls**: Use `fetchWithTimeout` (`server/monitoring.ts`) for all outbound API calls (Paymob, WhatsApp CRM, Brevo/Resend, Meta CAPI). Defer slow non-blocking follow-ups to `background_jobs` (`server/jobs.ts`).

## 2. Authentication, Rate Limits, Headers & Uploads
- **Brute-force protection**: Keep `checkRateLimit` (`server/rateLimit.ts`) active on `authenticateUser`, `trackOrder`, `google-auth`, OTP verification, password resets, and public breach reports.
- **Session lifecycle**: Password changes and resets must revoke all open device sessions (`DELETE FROM app_sessions`) and enforce `>= 8` alphanumeric characters.
- **CORS & CSP**: Never re-enable wildcard `*` CORS on authenticated/mutation endpoints (`applyCors` + `sameOrigin` in `lib/session.js`). Keep `Content-Security-Policy` headers active in `vercel.json`.
- **Upload validation**: Accept only `image/jpeg`, `image/png`, `image/webp` within size bounds (never raw SVG or unvalidated blobs).

## 3. Database Performance & Resilience
- **Explicit column selection & batching**: Never query `SELECT *` on heavy tables in `server/store.ts`; use explicit column lists (`PRODUCT_SELECT_COLUMNS`, `ORDER_SELECT_COLUMNS`) and single-statement `jsonb_to_recordset` upserts for bulk imports.
- **Server pagination & indexing**: Orders use paginated `getOrdersPaginated` (`limit=50`) and indexed search columns; do not load unbounded order history in UI views.
- **Region & Backups**: Keep Vercel functions pinned to `"regions": ["fra1"]` alongside Neon `eu-central-1`, with `.github/workflows/backup-neon.yml` scheduled every 2 hours (`0 */2 * * *`).

## 4. SEO, Analytics & Consent Separation
- **Cookie Consent Gate**: Zero tracking (`initMetaPixel`, `initGa4`, `startWebVitalsObserver`, `trackActivity`, `trackMetaEvent`) may fire before `hasAnalyticsConsent()` returns `true` (`joe_cookie_consent_v1 === 'accepted'`). Strip IP/geo profiling server-side unless consented.
- **Feeds & Crawlers**: Keep `googlebot` / search crawlers pre-rendered in `middleware.js` and supply `mpn`, `gtin`, and accurate `new`/`used` condition inside `server/feeds.js`.

## 5. Legal Compliance & Accessibility (WCAG)
- **Separated consents**: Keep required Terms/Privacy acceptance separate from optional marketing WhatsApp offers, optional AI personalization, and 18+/parental age confirmation (`AuthModal.tsx`, `Checkout.tsx`).
- **DSAR Rights**: Maintain `exportMyData` (JSON export), single-click `updateConsentPreferences` opt-out, full PII anonymization + purge in `deleteUser`, and the 48-hour Data Breach reporting channel (`PolicyPage.tsx` + `SecurityPanel.tsx`).
- **Electronic Invoices & Truthful Claims**: Render itemized QR invoices (`src/utils/invoiceGenerator.ts`, `src/components/InvoiceModal.tsx`) showing Commercial Register & Tax ID. Never re-introduce synthetic seed ratings or fake urgency counters.

## Verification Checklist Before Commit / Deploy
1. `npx tsc --noEmit` exits `0`.
2. `npm audit` reports `0` known vulnerabilities.
3. `npm test` passes across all suites (including `tests/production-hardening.test.mjs`).
4. `npm run build` succeeds cleanly with lazy route code-splitting.
