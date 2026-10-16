# Covers and delegated administration — 2026-10-16

## Covers reference

`/admin?section=covers` contains all 113 photographs supplied in the user's `covers` folder, indexed with 79 model labels. Photographs were reviewed visually; local Windows OCR assisted indexing. Four references retain explicit review flags: the unbranded Note 10 label, two partially worn Realme labels and one partially erased Samsung label. Model labels describe the compatible phone, not the case manufacturer. Stock and prices were not inferred from photographs.

The page supports Arabic/English search and Arabic digits, phone-brand and design filters, review and favourite filters, numbered pages, CSV export and original photo viewing. Source photographs in the supplied folder are unchanged. The website uses full-frame WebP versions up to 1920px plus 640px thumbnails for cards; labels remain visible. High-resolution views load on opening. Model/design/colour/shelf/note corrections are stored in `cover_catalog_overrides` and shared across authorized accounts. Favourites remain per browser/account.

## Access model

Administrators choose Customer, Limited sections or Full administrator from Users & Permissions. The existing `role` field remains `customer` or `admin`; limited access uses the additive `admin_permissions` JSONB column. All 22 section identifiers are allowlisted in `lib/access.js`. The navigation and direct-route guard use this same policy. Opening the tool directory grants no other tool implicitly.

Only full administrators can change access or delete another account. Granting the Users section to a limited account allows viewing its list, not role management. The owner and current actor cannot be downgraded from the permissions editor. Product mutations require Products; Inventory alone allows reporting. Permissions refresh on focus, reconnect and visible 60-second intervals, while each privileged server request reads current saved permissions.

## Server boundary

Browser database queries now call `/api/store`. The database connection and SQL implementation live on the server. Public catalog results exclude hidden products and internal cost/source fields; account order history is scoped on the server to the verified account. Guest tracking requires both order number and phone. Browser cache data cannot authenticate an administrator, and the legacy owner-email/password bypass and local-password fallbacks are removed.

Verified Google sign-in, email/password sign-in and verified email OTP issue a random opaque HttpOnly, SameSite=Lax session cookie (Secure in production). Only the token hash is stored in `app_sessions`, with a 30-day expiry. Sessions are resolved against the current user row for every request. Existing password records are upgraded to salted scrypt on a successful password login; accounts without a password cannot sign in with an arbitrary value. Existing users may need to sign in once after upgrading from cached-only sessions.

Order creation forces unpaid/pending state, validates basic totals, and atomically checks live price/availability while deducting stock. Repeated order identifiers do not deduct stock again. Cancellation restocks only on the first transition to cancelled. These changes support the server boundary and do not constitute a full POS/accounting rewrite.

## Migration and verification

`migrations/20261016_admin_permissions.sql` adds the permission column and session/cover tables. It was checked against an isolated schema in a transaction before application; existing roles were preserved. The connected Neon MCP account belongs to a different project, so it was not used to create a branch or alter that unrelated project.

Automated tests cover allowlists, denied operations before SQL, limited-user role escalation, current-actor/owner protection, catalog field filtering, scoped access refresh, profile identity injection, opaque session cookies, password verification, the 113-photo inventory and prior catalog/report/delivery behavior. Browser UI checks use synthetic users and memory responses for permission editing, without promoting or demoting any real user. No real order or payment is submitted during verification.

Deployment must use the server-only `DATABASE_URL`. Previously published browser database credentials must be replaced; removing them only from the latest bundle does not revoke an older deployment's value. Do not copy the replacement connection string into public build variables or documentation.

The concurrently published fulfillment, support, supplier and security modules are retained behind section checks. TOTP setup belongs to the current verified account; Google, email OTP and password sign-in all create a pending, non-privileged session for accounts with 2FA enabled. The pending challenge expires after ten minutes and eight attempts. Support threads use a separate HttpOnly possession cookie; knowing a phone number does not disclose another thread.
