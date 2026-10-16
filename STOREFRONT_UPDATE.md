# Storefront update — 12 October 2026

The storefront uses light surfaces and explicit readable text colors throughout customer pages, dialogs and the legacy administration UI. Stored dark-mode preferences are normalized to light. Accent selection remains an administrator setting.

The outer page uses horizontal clipping instead of creating an overflow scroll container. The header stays at the top when scrolling; product and checkout sticky panels use its measured height. Mobile navigation, product image captions, zoom controls and dialogs use the same palette.

Delivery addresses include separate governorate, city/village, district, street, building, floor, unit, landmark, postal code, optional map link and delivery instructions. All 27 governorates are individually selectable. Existing regional shipping fees remain; newly added destinations use the configured default shipping fee. No new shipping prices are invented.

Saved addresses retain their structured fields and additional details. Saving or deleting an address reports success after database confirmation. Checkout retains the cart when saving an order fails.

The existing orders table has no structured delivery column. `encodeDeliveryNotes` stores a versioned `__joeDelivery: 1` envelope in its existing notes column, alongside the original customer note. The address column receives a readable full address. `decodeDeliveryNotes` supports new envelopes and untouched old plain-text notes. Future backend/POS integrations must decode this envelope before presenting order notes and preserve its delivery fields. No production schema migration or old-order rewrite was performed.

The unconnected card-entry form and its unsupported payment assurances were removed. Cash on delivery and existing transfer options remain; uploading transfer evidence does not mark an order paid before merchant review.

Validation: production build and 37 tests, including address round-trips, legacy records, alternate contact numbers, map URL validation, and failed order/profile saves. Browser checks cover desktop/mobile layouts, sticky navigation, product details, checkout address entry and preview, and readable dialogs. No live order or payment was submitted for testing.

Order tracking no longer defaults to the first order in the database. It shows a current checkout-session order or waits for a search. Search accepts Arabic phone digits, Egyptian international prefixes and order numbers with a leading #.

## Inventory reports — 16 October 2026

The administrator's Inventory and Reports tab combines stock comparisons (including exact zero, negative balances and inclusive ranges), category, brand, visibility, condition, price bounds, price/cost completeness, catalog verification and image classification. Search includes original imported names/codes, model, SKU and current names. Numeric inputs accept Arabic and Persian digits. Invalid bounds prevent export.

Statistics and per-category totals use every matching product, independently of the table's 50-row display limit. Recorded negative balances remain visible/exported; available units and valuations use positive quantities only. Unknown or non-positive cost/selling prices are excluded from the relevant valuation with excluded-unit counts. Selling-price valuation is explicitly not realized revenue/profit. Unmarked metadata/images remain unknown; missing image links are not an image URL availability check.

Excel exports selected columns for all matches plus a summary with Cairo export time, active filters, valuation methodology, coverage and category totals. CSV exports only selected detail columns with UTF-8 BOM, escaping and protection against text being interpreted as spreadsheet formulas. XLSX retains textual SKUs and literal string cells. Up to 20 named filter/column templates are saved locally through storage-safe helpers; reusing a name replaces that template. Products are not copied into report-template storage.

Report downloads wait for a complete database catalog. Catalog loading completion now follows the catalog request instead of unrelated cart synchronization. A failed catalog fetch keeps the local fallback visible with a warning and disables report downloads. Existing admin access checks remain in effect. No schema migration or inventory mutation is part of generating reports.

Reports use separate `recorded_stock` and `recorded_images` fields from the database mapper so storefront quantity clamping and fallback pictures cannot turn negative balances into zero-stock results or hide missing image links. Local product edits and order stock changes keep these report fields synchronized.

Validation: 48 passing tests and production build. New coverage includes boundaries, combined filters, missing/estimated metadata, valuation reconciliation, Arabic numeric input, workbook round-trip with 125 rows, CSV escaping, template validation, catalog readiness and raw database values behind storefront fallbacks. Browser checks exercised combined filters, zero-stock reports, invalid bounds, template save/reapply and a downloaded XLSX whose rows and totals were independently checked against the selected test data.
