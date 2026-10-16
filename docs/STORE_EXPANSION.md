# Storefront and administration expansion — 2026-10-16

This change extends the production light storefront. It is independent of the unfinished POS/ERP prototype in the original workspace. No database schema migration is required.

## Customer experience

- Account dropdown and responsive account sidebar, with direct links to profile, orders, addresses, payments, preferences and security. Existing warranty and account controls remain available.
- Payments show the account's recorded orders and payment states; this is not a stored-value wallet. Order association uses a matching email, or an exact normalized phone when the order has no email. Names and partial phone matches no longer associate orders.
- Catalog pagination offers 24, 36 or 48 products per page, numbered navigation, and URL persistence for search, filters, sort and page. Back/forward restores state. A failed catalog refresh is visibly identified as a local fallback.
- Dedicated wishlist, current deals, recently viewed, brands, product finder, bundle builder, help and contact pages. Home and navigation expose these destinations.
- The finder uses actual purchasable catalog entries and the customer's category, brand, budget and text filters. Preferences and recent views are saved in that browser.
- The bundle builder adds 2–4 selected, available products at their current combined prices. It does not assert a discount or technical compatibility. Cart stock is checked before adding the whole selection.

The user-supplied reference was https://sonata-eg.com/ and screenshots of its account menu/sidebar and pagination. The implementation retains JOE Store's own branding and uses features appropriate for electronics retail. It does not claim feature parity with signed-in reference pages that were unavailable for inspection.

## Administration

The responsive administration shell has 17 sections: overview, order analytics, products, inventory reports, data review, stocktake, reorder planning, orders, customers, users, email, WhatsApp, screen finder, pricing, price labels, tool directory and settings. Existing product, order and user workflows remain in place.

New tools:

- Data review queue filters seven reasons, opens the existing product editor and exports every matching row.
- Stocktake records counted quantities, computes differences against recorded stock and exports the draft. Drafts are browser-local and separated by administrator ID. They do not change database quantities; reviewed corrections use the existing product editor.
- Reorder planning accepts a stock threshold and target quantity, excludes negative balances from quantity suggestions, shows a budget from known costs and exports a plan. No purchase is sent.
- Pricing calculates a target margin on selling price after entered fixed fees and percentage commission. It does not change stored product prices.
- Price labels select up to 24 products and display an A4 print preview. Product data is HTML-escaped and zero-price items say to ask for the price.
- Analytics filter the recorded orders by Cairo date. Delivered order value excludes pending and cancelled orders, and shipping is shown separately. The overview also uses delivered order value. These are not full accounting or profit statements.

List tools have numbered pagination and exports cover the full matching set. Catalog-dependent exports require a complete successful database load.

## Screen finder source

Imported from the user's existing `screen-finder` project: 56 packets, 192 model entries, 10 brands and 5 categories. The JSON catalog is bundled separately with the lazy-loaded admin component. All 56 source photographs are copied unchanged to `public/screen-finder-images/` and loaded when a packet is opened, not on storefront startup. Vercel rewrites exclude these static files.

The finder supports model/packet views, Arabic and English search, codes, brands, types, shelf locations, compatibility details, packet favourites, CSV export and optional browser speech recognition. Microphone access begins only after the user presses the voice button. Compatibility notes come from the source catalog and do not represent live stock quantities. Favourites and shelf overrides are saved in the current browser, not synchronized across staff devices.

## Validation

- `node --test tests/*.test.mjs`: 63 tests including pagination, model search, source completeness, margin math, order totals, safe exports/labels and account order matching.
- `npm run build`: TypeScript and production Vite build.
- Browser checks cover numbered catalog navigation and history, finder filtering, screen packet lookup and its original photograph, mobile admin layout, stocktake CSV and variance, reorder quantities, pricing and the embedded label preview.
- No real order, payment, role change, database stock adjustment or physical print job is submitted as a test.

The existing estimated specifications and illustrative image notices remain meaningful; this change does not make uncertain catalog information verified. Existing authentication/database architecture is retained and is not represented as a completed security migration or a full POS system.
