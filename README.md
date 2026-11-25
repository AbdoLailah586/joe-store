# JOE Store — Full-Stack E-Commerce & Inventory Platform

<p align="center">
  <img src="public/logo.png" alt="JOE Store Logo" width="120" />
</p>

<p align="center">
  <strong>Production e-commerce storefront, back-office ERP/CRM, and installable PWA for smartphones, accessories, covers, and certified pre-owned devices.</strong>
</p>

<p align="center">
  <a href="https://joe-store-2026.vercel.app" target="_blank">
    <img src="https://img.shields.io/badge/Live_Store-joe--store--2026.vercel.app-F59E0B?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Store" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-6.1-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Neon-PostgreSQL-00E599?style=for-the-badge&logo=postgresql&logoColor=black" alt="Neon PostgreSQL" />
  <img src="https://img.shields.io/badge/Vercel-Serverless_&_Edge-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
</p>

---

## Architecture & Layers

JOE Store is structured into clear, isolated application layers with a strict server-side security boundary:

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ 1. Presentation Layer (src/pages/, src/components/)                      │
│    React 18 + Tailwind CSS + GSAP + Bilingual RTL/LTR (Arabic / English) │
├──────────────────────────────────────────────────────────────────────────┤
│ 2. Client State & Offline Layer (src/context/, src/services/, pwa/)      │
│    AuthContext, StoreContext, LanguageContext, IndexedDB offline catalog │
│    & Service Worker shell/image cache (dist/sw.js)                       │
├──────────────────────────────────────────────────────────────────────────┤
│ 3. Edge CDN & Middleware Layer (vercel.json, middleware.js)              │
│    • Vercel Edge CDN caches public GET catalog/settings (s-maxage=30,    │
│      stale-while-revalidate=120)                                         │
│    • Edge Middleware rewrites crawler /product/:id traffic to OG tags    │
├──────────────────────────────────────────────────────────────────────────┤
│ 4. Serverless API Boundary (api/*.ts, api/*.js)                          │
│    • /api/store — Public GET (catalog/settings) + authenticated POST RPC │
│    • /api/google-auth, /api/send-otp, /api/verify-otp                    │
│    • /api/totp-*, /api/og-product, /api/health                           │
├──────────────────────────────────────────────────────────────────────────┤
│ 5. Domain, Security & Persistence Layer (server/, lib/, migrations/)     │
│    • Session tokens (opaque 256-bit SHA-256 hashed HttpOnly cookies)     │
│    • Salted scrypt password hashing + TOTP 2FA verification              │
│    • 22-section RBAC authorization allowlist (lib/access.js)             │
│    • Atomic order creation & stock locking (server/orderWrites.ts)       │
├──────────────────────────────────────────────────────────────────────────┤
│ 6. Database & Operations Layer (Neon PostgreSQL + scripts/)              │
│    • @neondatabase/serverless driver over pooled Postgres                │
│    • Automated Google Drive ZIP backups, limit monitoring & DB migration │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Key Features & Platform Updates

### Performance & Edge CDN Caching
- **CDN-Cached Public Reads (`GET /api/store`)**: Public storefront reads (`getProducts` and `getStoreSettings`) execute as canonical `GET` requests cached at Vercel Edge CDN (`Cache-Control: public, max-age=0, s-maxage=30, stale-while-revalidate=120`), eliminating redundant Neon database queries under concurrent traffic spikes.
- **Strict Public/Admin Isolation**: Public `GET` requests never read session cookies, never expose hidden products (`includeHidden: false`), strip internal fields (`cost_price`, `source_name`, `source_row`, `source_item_code`, `raw_source_stock`), and fall back to `Cache-Control: no-store` on empty/error responses.
- **Live Admin Bypass**: Staff with product/inventory permissions automatically fetch live uncached data (`POST /api/store`, `no-store`) to see hidden items, wholesale costs, and instant edits.

### Storefront, Catalog & Checkout
- **Bilingual RTL/LTR Engine**: Instant Arabic/English switching (`Cairo` + `Outfit` typography), Royal Gold / Titanium Blue / Emerald Tech themes, and responsive mobile-first layouts.
- **Certified Pre-Owned & Retail Catalog**: Supports 2,000+ SKUs, variant selection (storage & color), battery health badges, product reviews with shadow moderation (`pending` visible to author, `approved` public), and social OpenGraph previews (`/api/og-product`).
- **Atomic Checkout & Order Tracking**: Server-side transactional `saveOrder` locks product rows (`FOR UPDATE`), validates live prices and stock before inserting orders, and deducts inventory atomically. Cancellation (`cancelOrder`) restocks items safely on first transition.
- **Installable PWA & Offline Browsing**: Custom service worker generated at build time (`scripts/build_pwa.mjs` from `pwa/service-worker.template.js`) with bounded image caching (`100` images, `2 MB` max), IndexedDB public catalog snapshots, and offline-safe guards (offline mode blocks checkout and admin mutations).

### Security, Authentication & 22-Section RBAC Admin Hub
- **Authentication**: Google Sign-In (`google-auth-library`), Email/Password (`scrypt` salted hashes), Email OTP verification (`Nodemailer` Gmail SMTP / `Brevo` / `Resend`), and TOTP 2FA (`/api/totp-*`).
- **Session Security**: Random opaque `HttpOnly`, `SameSite=Lax` cookies (`joe_session`) stored hashed in `app_sessions` with `sameOrigin` request validation.
- **22-Section Delegated RBAC (`lib/access.js`)**: Granular staff permissions across `overview`, `analytics`, `products`, `inventory`, `quality`, `stocktake`, `reorder`, `suppliers`, `orders`, `fulfillment`, `support`, `crm`, `users`, `emails`, `whatsapp`, `screens`, `covers`, `pricing`, `labels`, `tools`, `security`, and `settings`.
- **Specialized Back-Office Tools**:
  - **Cover Finder & Screen Finder**: Indexed phone cover and screen protector catalogs with override persistence and manual additions.
  - **Fulfillment & Packing**: Picking lists, packing verification, courier dispatch, and refusal history tracking.
  - **Inventory Reports & Bulk Excel**: Exportable CSV/XLSX valuation and stock reports (with spreadsheet formula-injection protection) plus bulk Excel product import (`xlsx`).
  - **Support Tickets & CRM**: Possession-cookie-bound customer support threads, abandoned cart tracking, and supplier price quotes.

### Database Backup, Migration & Quota Automation
- **`scripts/backup_neon_to_drive.mjs`** (or `run_backup.bat`): Exports all Neon tables as SQL (`dump.sql`) + JSON (`tables/*.json`) + `manifest.json`, compresses into a ZIP archive (`archiver`), uploads to Google Drive (`googleapis`), and sends a WhatsApp summary report.
- **`scripts/monitor_neon_limits.mjs`** (or `run_neon_monitor.bat`): Queries the Neon v2 API for egress, compute CU-hours, and storage usage; triggers an automatic backup and sends a WhatsApp alert when usage crosses `NEON_ALERT_THRESHOLD_PCT` (default `80%`).
- **`scripts/migrate_neon_db.mjs`**: Full schema, sequence, constraint, index, and row-verified database migrator between Neon PostgreSQL instances.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend UI** | React 18.3, TypeScript 5.7, Tailwind CSS 3.4, GSAP 3.15, Lucide React, Canvas Confetti |
| **Build & Tooling** | Vite 6.1 (manual chunk splitting + dev API middleware), custom PWA SW builder |
| **API & Edge** | Vercel Serverless Functions (`api/`), Vercel Edge Middleware (`middleware.js`), Vercel CDN Caching |
| **Database** | Neon PostgreSQL (`@neondatabase/serverless`), SQL migrations (`migrations/`) |
| **Auth & Security** | `node:crypto` (`scrypt`, SHA-256, TOTP RFC 6238), `google-auth-library` |
| **Messaging & Email** | Nodemailer (Gmail SMTP), Brevo API, Resend API, WhatsApp Pro CRM webhook integration |
| **Data & Ops** | SheetJS (`xlsx`), `archiver`, `googleapis` (Drive v3), `sharp` |
| **Testing** | Node.js native test runner (`node --test`), React SSR test rendering, TypeScript compiler API |

---

## Project Structure

```text
joe-store/
├── api/                         # Vercel serverless endpoints (store, auth, otp, totp, og-product, health)
├── server/                      # Server DB queries (store.ts) and atomic order writes (orderWrites.ts)
├── lib/                         # Shared auth, RBAC policy, session, and TOTP helpers
├── migrations/                  # PostgreSQL schema migrations
├── middleware.js                # Edge middleware for product crawler OG redirects
├── pwa/                         # Service worker template
├── public/                      # Static assets, manifest, icons, product/cover/screen images
├── scripts/                     # PWA builder, Neon backup/monitor/migration, QA servers
├── src/
│   ├── components/              # Storefront & shared UI components
│   ├── context/                 # AuthContext, StoreContext, LanguageContext
│   ├── data/                    # Governorates, cover/screen datasets, seed fallback
│   ├── pages/                   # Storefront pages & admin/ (22-section ERP dashboard)
│   ├── services/                # Client API boundary (neonDb.ts), offlineCatalog.ts, pwa.ts
│   ├── types/                   # TypeScript domain types
│   └── utils/                   # Delivery formatting, Excel parser, inventory reports, storage
├── tests/                       # Automated unit, security, caching, PWA, and UI tests
├── vercel.json                  # SPA rewrites and Edge/asset cache headers
└── vite.config.ts               # Vite config + local /api/* dev middleware
```

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v20+
- A [Neon](https://neon.tech/) PostgreSQL database

### Setup & Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Copy `.env.example` to `.env` and fill in your server credentials:
   ```bash
   cp .env.example .env
   ```
   - `DATABASE_URL` (server-only; never expose with `VITE_` in production client code)
   - `VITE_GOOGLE_CLIENT_ID`
   - Email provider (`SMTP_*`, `BREVO_API_KEY`, or `RESEND_API_KEY`)
   - Optional backup/monitor variables (`NEON_API_KEY`, `NEON_PROJECT_ID`, `WHATSAPP_CRM_*`, `GOOGLE_DRIVE_*`)

3. **Run development server**:
   ```bash
   npm run dev
   ```
   Runs locally on `http://localhost:5174/` with Vite's `/api/*` middleware enabled.

---

## Verification & Testing

Run the full automated test suite and TypeScript type check:

```bash
node --test tests/*.test.mjs
npx tsc --noEmit
```

Build the production bundle and generate the PWA service worker (`dist/`):

```bash
npm run build
```

---

## Backup & Monitoring Commands

All credentials are read strictly from `.env` or environment variables:

```bash
# Full Neon SQL + JSON backup compressed to ZIP and uploaded to Google Drive
node scripts/backup_neon_to_drive.mjs

# Check Neon free-tier egress, compute, and storage usage (auto-backs up & alerts >= 80%)
node scripts/monitor_neon_limits.mjs

# Migrate schema + data + sequences + constraints to another Neon database
node scripts/migrate_neon_db.mjs "<TARGET_DATABASE_URL>"
```

---

## Deployment

Configured for **Vercel**:
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Required Env Vars in Vercel**: `DATABASE_URL`, `VITE_GOOGLE_CLIENT_ID`, and your email delivery keys (`SMTP_*` / `BREVO_API_KEY` / `RESEND_API_KEY`).

---

## License

Proprietary — developed for **JOE Store (Mansoura, Egypt)**. All rights reserved.
