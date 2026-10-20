# Clickable details across JOE Store

The shared details dialog supports read-only facts, related records, search, 30-row pagination, nested drill-downs and a back button. It closes with Escape or the backdrop and restores keyboard focus. Navigation, logout and changed access grants close the dialog. Record actions use the existing permission checks and editors.

Implemented interactions:

- Admin overview: delayed dispatch, unpaid prepaid orders, average order value, delivered totals, all orders, product counts, zero/negative stock, low stock, abandoned baskets, pending orders, WhatsApp logs and recent orders.
- Inventory: summary amounts and counts open their contributing products, section totals drill into that section, product names open saved details, and category badges filter the report.
- Admin tools: analytics metrics open the matching orders in the selected period; quality reasons filter the queue; stocktake and reorder names open product details; pricing opens its calculation breakdown.
- People and operations: user summary cards filter accounts, account names explain grants, customer basket cards filter sessions, delivery board references show orders, supplier names/prices explain quotes, and audit actions show recorded metadata.
- Screen and cover guide titles open their existing detail views.
- Storefront: service notices explain shipping, payment and warranty; the location note opens contact details; the catalog count opens the matching products. Product brands, prices, original prices, discounts, condition, battery, storage, colors, review counts, uncertainty notices, availability and warranty have contextual actions.
- Product page and quick view: specification values, prices, availability, condition and warranty expose the corresponding recorded information.
- Cart and checkout: product names and totals explain their source items, quantities and shipping calculation. The drawer labels its delivery fee as provisional until the destination is selected at checkout.
- Account and tracking: order references and totals open saved order snapshots; product references open saved product details; shipment milestones explain whether a stage is current, completed or still ahead. Warranty cards are derived from the user's delivered orders and recorded durations.

Headings and explanatory prose retain their reading semantics. Existing links, forms, filters, installation controls and editors continue to perform their original actions.

Validation:

- 102 automated checks including new cases for matching inventory/revenue contributors, recorded order totals, action binding and excluding private costs from public product details.
- Local browser fixtures for overview → order → product, inventory search/pagination/empty states, keyboard close/focus restoration, inventory and sales contributors, account filters, store product pricing, specification details, cart/checkout shipping, personal purchase history, warranty records and shipment stages.
- A local account limited to overview cannot open inventory/editor actions from the new dialogs.
- Mobile dialog width and scrolling checked at 390 × 844. Native dialogs trap focus and prevent interaction with background controls.

`node scripts/qa_interactions_server.mjs` serves a local production build on port 5188. Account and order records are explicitly synthetic, all production writes are refused, and only public product reads reach the live API. Set `JOE_QA_LIMITED=1` to test an overview-only account. The script is not imported by the application or production build.
