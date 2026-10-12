# Storefront update — 12 October 2026

The storefront uses light surfaces and explicit readable text colors throughout customer pages, dialogs and the legacy administration UI. Stored dark-mode preferences are normalized to light. Accent selection remains an administrator setting.

The outer page uses horizontal clipping instead of creating an overflow scroll container. The header stays at the top when scrolling; product and checkout sticky panels use its measured height. Mobile navigation, product image captions, zoom controls and dialogs use the same palette.

Delivery addresses include separate governorate, city/village, district, street, building, floor, unit, landmark, postal code, optional map link and delivery instructions. All 27 governorates are individually selectable. Existing regional shipping fees remain; newly added destinations use the configured default shipping fee. No new shipping prices are invented.

Saved addresses retain their structured fields and additional details. Saving or deleting an address reports success after database confirmation. Checkout retains the cart when saving an order fails.

The existing orders table has no structured delivery column. `encodeDeliveryNotes` stores a versioned `__joeDelivery: 1` envelope in its existing notes column, alongside the original customer note. The address column receives a readable full address. `decodeDeliveryNotes` supports new envelopes and untouched old plain-text notes. Future backend/POS integrations must decode this envelope before presenting order notes and preserve its delivery fields. No production schema migration or old-order rewrite was performed.

The unconnected card-entry form and its unsupported payment assurances were removed. Cash on delivery and existing transfer options remain; uploading transfer evidence does not mark an order paid before merchant review.

Validation: production build and 37 tests, including address round-trips, legacy records, alternate contact numbers, map URL validation, and failed order/profile saves. Browser checks cover desktop/mobile layouts, sticky navigation, product details, checkout address entry and preview, and readable dialogs. No live order or payment was submitted for testing.

Order tracking no longer defaults to the first order in the database. It shows a current checkout-session order or waits for a search. Search accepts Arabic phone digits, Egyptian international prefixes and order numbers with a leading #.
