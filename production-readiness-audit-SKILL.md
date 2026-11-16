---
name: production-readiness-audit
description: >
  Audit, harden, optimize, and prepare web applications and e-commerce stores for
  production. Covers architecture, application and infrastructure security,
  payments, database safety, reliability, performance, observability, SEO,
  analytics, privacy, accessibility, testing, deployment, and operational readiness.
  Use for production-readiness reviews, security audits, performance work, and
  controlled implementation of fixes.
---

# Production Readiness Audit & Hardening

## Mission

Act as a senior application-security engineer, backend/reliability engineer,
performance engineer, and pragmatic technical lead. Determine whether the
actual application is safe, reliable, maintainable, accessible, and measurable
enough for its intended production use.

Do not treat this checklist as a reason to add every possible technology.
Inspect the real stack, architecture, traffic, data sensitivity, business model,
and operational capacity first. Recommend only changes that solve evidenced
risks or bottlenecks.

This skill is an engineering workflow, not a certification. Never claim that an
application is “100% secure,” legally compliant, or production-ready solely
because a checklist or build passed.

## When to use

- Preparing a web application, SaaS product, dashboard, or e-commerce store for launch.
- Reviewing security, authorization, authentication, payment, or data-protection risks.
- Improving slow frontend pages, APIs, database queries, or background processing.
- Reviewing deployment, backups, incident response, monitoring, or recovery readiness.
- Setting up technical SEO, product feeds, conversion analytics, or storefront trust.
- Reviewing privacy, consumer transparency, accessibility, and legal-page requirements.

## Non-negotiable operating rules

1. **Inspect before changing.** Identify the framework, runtime, database, hosting,
   deployment process, authentication model, payment flow, integrations, and existing
   conventions before proposing implementation.
2. **Evidence before conclusions.** Tie each finding to a file, route, query, config,
   log, test, metric, or reproducible behavior. Label assumptions and unknowns.
3. **No unauthorized production actions.** Do not deploy, run destructive commands,
   modify production data, rotate credentials, change DNS, or alter billing without
   explicit approval for that action.
4. **Preserve data.** Never reset, truncate, reseed, or overwrite a real database as
   part of an audit. Use isolated test data and staging environments.
5. **Protect secrets and personal data.** Never print secrets, tokens, credentials,
   payment data, or unnecessary personal information into reports, logs, commits,
   or chat. Redact evidence.
6. **Do not weaken controls to make tests pass.** Never disable authentication,
   authorization, validation, TLS, CSRF, webhook verification, or security headers
   as a shortcut.
7. **Avoid over-engineering.** Redis, queues, microservices, Kubernetes, SSR, a CDN,
   or multi-region deployment must have a specific measured or justified need.
8. **Verify the behavior, not just the build.** A successful build does not prove
   security, payment correctness, accessibility, reliability, or performance.
9. **Make reversible changes.** Prefer small, reviewable changes with rollback
   instructions. Use feature flags or staged rollout where appropriate.
10. **Separate engineering from legal advice.** Identify legal questions and
    jurisdiction-specific requirements for qualified local review; do not promise
    compliance.
11. **Be transparent about scope.** State what was inspected, what could not be
    tested, what requires owner access, and what remains unverified.
12. **Never fabricate results.** Do not invent test outcomes, metrics, scans,
    approvals, legal obligations, or successful deployments.

## Required deliverables

Create or update these artifacts in the project when requested and when the
repository workflow permits:

- `AUDIT_REPORT.md` — evidence-based findings, severity, impact, affected area,
  reproduction/evidence, remediation, status, and residual risk.
- `IMPLEMENTATION_PLAN.md` — prioritized phases, dependencies, estimates or
  effort bands, owner actions, acceptance criteria, and rollback notes.
- `CHANGELOG_PRODUCTION_READINESS.md` — files and systems changed, rationale,
  tests run, results, and anything not completed.
- `RUNBOOK.md` — operational procedures for deploy, rollback, backup restore,
  alerts, payment reconciliation, and incident handling, if applicable.

Do not create empty or misleading reports. If no code changes were authorized,
the report must clearly say “audit only — no changes applied.”

## Phase 0: Intake, scope, and authorization

Collect only information that is not already available from the repository or
conversation. Ask concise questions when a missing answer blocks safe progress.

### Required context

- Repository/workspace path or URL and target branch.
- Frontend framework, backend/runtime, database, and relevant managed services.
- Hosting provider, deployment method, domains, and environments.
- Authentication provider and session/token model.
- Payment provider and payment lifecycle, or confirm that payments are not used.
- Target countries/markets, business type, and types of personal/sensitive data handled.
- Expected traffic, critical user journeys, uptime expectations, and launch deadline.
- Execution scope: read-only audit, plan only, approved fixes, or deployment support.
- Access available: local code, staging, logs, monitoring, provider dashboards.
  Never ask the user to paste secrets; use secure secret-management workflows.

### Define scope

List in-scope applications, APIs, admin panels, workers, scheduled jobs, domains,
third-party integrations, and data stores. Identify exclusions explicitly.

### Authorization gates

- Read-only inspection may begin when repository access is provided.
- Before code edits, present a concise plan and obtain approval unless the user
  has explicitly authorized direct implementation.
- Before database migrations, production configuration changes, key rotation,
  DNS changes, or deployment, obtain separate explicit approval.
- If a severe active exposure is found, explain immediate containment options
  and ask before performing any action that changes systems.

## Phase 1: Discovery and architecture audit

Inspect the project rather than assuming its design.

### Repository and application inventory

- Review project structure, README, package manifests, lockfiles, build scripts,
  framework configuration, environment templates, and deployment files.
- Identify frontend routes, API endpoints, server actions, serverless/edge
  functions, workers, cron jobs, webhooks, admin routes, and public endpoints.
- Map authentication and authorization boundaries.
- Identify database schemas, migrations, indexes, triggers, row-level security
  policies, storage buckets, and connection configuration.
- Inventory external services: payments, email/SMS, analytics, AI APIs, search,
  object storage, maps, shipping, and identity providers.
- Identify runtime versions, supported browsers/devices, and critical dependencies.
- Check whether staging and production are isolated and whether configuration
  differs safely between them.

### Architecture and data-flow documentation

Create a concise architecture overview showing:

- Browser/mobile client → API/server → database/storage → external services.
- Trust boundaries and where authentication/authorization are enforced.
- Sensitive data flows, payment flow, webhook flow, and admin operations.
- Critical dependencies and single points of failure.
- Data classification: public, internal, confidential, personal, financial,
  credentials/secrets, and any special-category data.

Do not expose internal network details or secrets in public documentation.

### Risk register

For each finding record:

- Unique ID and affected component.
- Severity: Critical, High, Medium, Low, or Informational.
- Likelihood and impact, with rationale.
- Evidence and reproduction steps that do not expose real user data.
- Recommended fix, dependencies, owner action, and verification test.
- Status: Open, Planned, In Progress, Fixed, Accepted, or Not Applicable.
- Residual risk and whether production launch is blocked.

Prioritize exploitable security flaws, data loss, payment integrity, account
takeover, and critical availability risks above cosmetic improvements.

## Phase 2: Application and infrastructure security

Use a recognized threat-modeling approach appropriate to the system. Consider
OWASP Top 10, OWASP ASVS, API Security Top 10, and relevant cloud/provider
security guidance as references, not as automatic proof of compliance.

### 2.1 Authentication and account security

- Use a reputable identity provider or proven framework implementation where
  appropriate; avoid custom cryptography and home-grown authentication.
- Store passwords only as strong adaptive hashes such as Argon2id or bcrypt
  with suitable parameters. Never encrypt passwords reversibly or log them.
- Use secure password reset and email/phone verification flows with random,
  single-use, short-lived tokens; invalidate tokens after use or password change.
- Protect login, registration, password reset, OTP, and recovery endpoints from
  brute force, credential stuffing, enumeration, and abuse.
- Use MFA for administrators and high-risk accounts where feasible.
- Use secure cookies (`HttpOnly`, `Secure`, appropriate `SameSite`) for browser
  sessions. Avoid storing long-lived sensitive tokens in local storage.
- Define session expiry, refresh-token rotation, revocation, logout, and
  “log out all devices” behavior. Revoke sessions after password change,
  account compromise, or relevant privilege changes.
- Prevent session fixation; rotate session identifiers after authentication
  and privilege elevation.
- Use generic public error messages where detailed messages enable account
  enumeration, while retaining useful private audit logs.
- Apply secure account recovery and administrator recovery procedures.

### 2.2 Authorization and tenant isolation

- Enforce authorization on the server for every protected action and object.
- Verify ownership/tenant membership for every read, update, delete, export,
  download, and action involving an object ID.
- Prevent IDOR/BOLA by testing with two separate users and, where relevant,
  two separate organizations/tenants.
- Enforce roles and permissions server-side; hiding a button in the UI is not
  authorization.
- Apply least privilege to users, admins, service accounts, database roles,
  cloud roles, and API tokens.
- Protect admin routes, support tools, impersonation features, exports, and
  bulk operations with explicit permission checks and audit trails.
- Review database row-level security policies where used. Test both allowed
  and denied access paths; do not assume enabling RLS alone proves safety.
- Ensure background jobs and service-role credentials cannot be invoked or
  exposed by untrusted clients.

### 2.3 Input, output, and API security

- Validate all untrusted input server-side with explicit schemas, bounds,
  allowed values, and business rules.
- Use parameterized queries or safe ORM bindings. Never concatenate untrusted
  input into SQL, shell commands, or dynamic code.
- Encode output for its context and prevent XSS. Use a carefully tested CSP
  where appropriate; do not blindly add policies that break required flows.
- Protect against CSRF for cookie-authenticated state-changing requests.
- Configure CORS with explicit trusted origins; do not use wildcard origins
  with credentials.
- Apply request size limits, pagination limits, content-type checks, and
  timeouts. Reject malformed or unexpected payloads safely.
- Avoid mass assignment: explicitly allow fields that clients may modify.
- Prevent SSRF in URL-fetching, import, webhook, image-proxy, and preview
  features. Restrict destinations and block internal/private network targets.
- Protect GraphQL or RPC endpoints against excessive depth, complexity,
  batching, and unauthorized introspection where relevant.
- Return safe error messages to clients; keep stack traces and internal details
  in protected logs.

### 2.4 Rate limits and abuse prevention

- Apply risk-based limits to login, OTP, reset, search, checkout, coupon,
  invitation, upload, AI, and expensive API endpoints.
- Consider account, IP, device, tenant, and endpoint dimensions; avoid relying
  on IP-only rules that punish shared networks.
- Use progressive delays, temporary cooldowns, CAPTCHA or step-up verification
  when justified. Avoid permanent lockouts that enable denial of service.
- Treat example thresholds (such as 5 attempts in 15 minutes) as starting
  hypotheses only; tune them using abuse patterns, usability, and monitoring.
- Add quotas and spend limits for paid external APIs and AI features.

### 2.5 Browser, transport, and security headers

- Enforce HTTPS and secure redirects. Enable HSTS only after confirming all
  required subdomains and HTTPS behavior.
- Review CSP, `X-Content-Type-Options`, `Referrer-Policy`, frame protections
  (`frame-ancestors`/`X-Frame-Options`), and Permissions Policy.
- Configure cookies with appropriate domain, path, expiry, and security flags.
- Validate allowed redirect destinations to prevent open redirects.
- Review cache headers so private or authenticated responses are not publicly
  cached. Configure CDN cache keys correctly.
- Test headers against payment, identity, embedded content, analytics, and
  other integrations before production rollout.

### 2.6 File and object-storage security

- Validate extension, MIME type, file signature, size, and allowed dimensions.
- Generate server-side object names; do not trust user-supplied paths.
- Store uploads outside executable/public application paths where possible.
- Use private buckets and short-lived signed URLs for private content.
- Scan or quarantine risky files where the threat model warrants it.
- Prevent path traversal, archive extraction attacks, malware uploads, and
  unauthorized file replacement/deletion.
- Set upload quotas and lifecycle/retention policies.

### 2.7 Secrets, configuration, and supply chain

- Keep secrets out of source code, client bundles, logs, screenshots, issue
  trackers, and repository history.
- Use provider secret managers or protected server-side environment variables.
  Public frontend variables must never contain privileged credentials.
- If a secret is exposed, treat it as compromised: rotate/revoke it, review
  access logs, and assess impact. Removing it from the latest commit is not enough.
- Separate development, staging, and production credentials and resources.
- Disable debug mode, directory listing, sample credentials, and unnecessary
  public endpoints in production.
- Review dependency advisories, abandoned packages, transitive dependencies,
  package provenance, lockfile integrity, and update strategy.
- Remove unused packages and pin/review critical dependencies where appropriate.
- Audit open-source licenses and attribution obligations; flag incompatible or
  unclear licenses for review.
- Protect CI/CD secrets, restrict workflow permissions, and avoid running
  untrusted pull-request code with privileged secrets.
- Generate and retain an SBOM where risk or customer requirements justify it.
- Use secret scanning, dependency scanning, static analysis, and container/IaC
  scanning where relevant.

### 2.8 Payment and commerce security

For any commerce/payment workflow:

- Recalculate item prices, taxes, shipping, discounts, and totals server-side
  using authoritative records. Never trust client-submitted totals.
- Validate product status, stock, currency, coupon eligibility, customer
  entitlement, and order state at the point of purchase.
- Use idempotency keys for order creation and payment initiation; persist and
  safely replay results for duplicate requests.
- Verify payment callbacks/webhooks using the provider's official signature
  verification method and raw request body requirements.
- Verify amount, currency, merchant/account, order reference, event type,
  and final payment status against the provider and internal order.
- Handle duplicate, delayed, out-of-order, retried, and forged webhook events.
- Do not mark an order paid based only on a browser redirect or client response.
- Use explicit order/payment state machines and legal transitions.
- Reconcile provider transactions against internal orders. Alert on paid
  transactions without orders, orders marked paid without provider confirmation,
  refunds, chargebacks, and mismatches.
- Never store raw card numbers or CVV unless operating under the required
  certified payment environment; prefer hosted/tokenized provider flows.
- Keep payment failure handling visible and actionable; never swallow webhook
  failures or return misleading success responses.
- Test with provider sandbox credentials and test cards only.

## Phase 3: Database integrity, migrations, and data lifecycle

### Database design and access

- Review constraints, foreign keys, unique constraints, nullability, data types,
  transaction boundaries, indexes, and query plans.
- Add indexes based on actual query patterns and measured plans, not guesses.
- Use transactions for multi-step operations that must remain consistent.
- Enforce uniqueness and invariants in the database where possible, not only
  in frontend validation.
- Use least-privilege database roles and separate application, migration,
  read-only, and administrative access where practical.
- Review connection pooling, maximum connections, idle timeouts, and serverless
  connection behavior.
- Select only needed columns; avoid unbounded queries and accidental full-table scans.

### Migration safety

- Review every schema migration before execution.
- Prefer backward-compatible expand-and-contract migrations:
  1. Add compatible schema.
  2. Deploy code that can work with old and new schema.
  3. Backfill in controlled batches.
  4. Verify data and application behavior.
  5. Remove obsolete schema only in a later approved release.
- Avoid long table locks and large blocking updates on production databases.
- Make migrations repeatable or safely fail; understand rollback limitations.
- Take/verify a recoverable backup before risky migrations.
- Never run destructive migrations on production without explicit approval,
  a recovery plan, and a tested rollback/forward-fix strategy.
- Test migrations against a staging copy with representative data volume.

### Data protection and lifecycle

- Classify data and minimize collection.
- Encrypt data in transit and use provider-supported encryption at rest.
- Define retention, archival, deletion, and backup-expiry rules.
- Ensure account deletion handles related records, files, search indexes,
  analytics identifiers, and third-party processors as legally appropriate.
- Define export and correction processes for applicable user rights.
- Avoid copying production personal data into development; use synthetic or
  appropriately anonymized data.
- Audit privileged access and sensitive exports.

## Phase 4: Reliability, resilience, and operations

### Request and job reliability

- Set explicit connect, read, and total timeouts for outbound HTTP calls.
- Use bounded retries with exponential backoff and jitter only for retryable
  failures; do not blindly retry non-idempotent operations.
- Use idempotency for operations that may be retried.
- Apply circuit breakers, bulkheads, and concurrency limits where justified.
- Move slow non-interactive work (emails, PDF generation, catalog sync, reports)
  to background jobs when the stack and workload justify it.
- Ensure jobs are idempotent, observable, retryable, and have dead-letter or
  failure handling.
- Set queue limits, job timeouts, retry policies, and alerting.
- Handle partial failures explicitly and provide safe user-facing status.

### Availability and capacity

- Identify critical user journeys and dependencies.
- Define realistic service-level objectives (SLOs), service-level indicators
  (SLIs), and error budgets where the product requires them.
- Estimate capacity and test bottlenecks before launch or major campaigns.
- Protect the system from traffic spikes with quotas, backpressure, graceful
  degradation, and provider limits.
- Document dependency failure behavior for database, payment, email, storage,
  and authentication services.
- Avoid claiming high availability without redundancy and tested failover.

### Backups and disaster recovery

- Define recovery point objective (RPO) and recovery time objective (RTO) with
  the business owner. Backup frequency must follow these targets; “every two
  hours” is not a universal requirement.
- Verify backup coverage for databases, object storage, configuration, and
  critical application state.
- Keep protected copies separate from the primary failure domain where possible.
- Encrypt backups and restrict access.
- Test restoration regularly in an isolated environment; a backup that has
  never been restored is unverified.
- Document restore order, dependencies, credentials access, data validation,
  and post-restore checks.
- Create a disaster-recovery plan for provider outage, accidental deletion,
  compromised credentials, ransomware, and regional failure where relevant.

### Logging, monitoring, and incident response

- Use structured logs with timestamps, severity, request/correlation IDs, and
  useful event context.
- Never log passwords, tokens, API keys, full payment data, or unnecessary
  personal data. Redact sensitive fields.
- Monitor availability, error rates, latency percentiles, saturation, database
  health, queue depth, payment outcomes, and critical business events.
- Add alerts with clear severity, owner, runbook, and escalation path.
- Use distributed tracing/OpenTelemetry when it adds value across services.
- Track frontend errors and real-user performance while respecting privacy and consent.
- Define incident severity, triage, containment, communication, recovery, and
  post-incident review.
- Maintain an audit trail for administrative actions, permission changes,
  refunds, exports, and sensitive data access.
- Ensure alert noise is controlled and alerts are actionable.

## Phase 5: Performance and user experience

### Establish a baseline first

Measure representative pages and critical flows before optimization:

- Lighthouse and Core Web Vitals (including LCP, INP, and CLS).
- Real-user monitoring (RUM), where appropriate and privacy-safe.
- API latency percentiles, error rates, payload sizes, and request counts.
- Database query plans, slow queries, connection usage, and lock waits.
- Bundle sizes, image weights, cache hit rates, and third-party script cost.
- Test desktop and low-end mobile devices, slow networks, and realistic data volume.

Record environment, device, network, sample size, and measurement method.
Compare before/after under equivalent conditions.

### Frontend performance

- Add skeleton/loading states that match final layout dimensions and avoid
  layout shifts; respect light/dark themes and reduced-motion preferences.
- Use optimistic UI only when rollback and conflict handling are correct.
- Debounce search/autocomplete and cancel stale requests where appropriate.
- Deduplicate identical in-flight requests and parallelize independent requests.
- Paginate or virtualize genuinely long lists; do not load unlimited records.
- Reduce unnecessary component re-renders and expensive computations.
- Split bundles by route/feature and lazy-load non-critical components.
- Defer non-critical third-party scripts and remove unused code.
- Avoid blocking the main thread; move heavy work to workers only when justified.
- Stream AI responses when the UX and provider API support it; handle cancellation,
  partial output, rate limits, and failures.

### Images, fonts, and static assets

- Resize images to their rendered dimensions and use responsive sources.
- Prefer modern formats such as WebP/AVIF when supported, with suitable fallbacks.
- Lazy-load below-the-fold images; do not lazy-load the main hero/LCP image.
- Set width/height or aspect ratio to prevent layout shift.
- Compress assets without visibly degrading quality.
- Subset fonts and load only required families/weights; use appropriate font display.
- Cache versioned static assets for long periods and HTML/API responses appropriately.
- Use a CDN when geographic reach, traffic, or origin load justifies it.

### API and database performance

- Replace unbounded endpoints with cursor or offset pagination and enforce max limits.
- Return only required fields; avoid `SELECT *` for large or sensitive records.
- Resolve N+1 query patterns and batch requests safely.
- Inspect query plans before adding indexes; account for write overhead and storage.
- Use connection pooling appropriate to the runtime and database provider.
- Cache only data with clear freshness/invalidation rules; never accidentally cache
  private user data across users or tenants.
- Introduce Redis or another cache only when measurements justify the operational cost.
- Keep compute close to the database region when it reduces measured latency.
- Use queues for long-running work only when asynchronous execution is appropriate.
- Consider SSR/SSG/prerendering when SEO or initial rendering benefits justify the
  added complexity and the chosen framework supports it.

## Phase 6: SEO, product feeds, and analytics

### Technical SEO

- Ensure important pages are crawlable and return correct status codes.
- Generate accurate `sitemap.xml` and `robots.txt`; do not block required assets
  or accidentally expose private/admin routes.
- Configure canonical URLs, titles, descriptions, headings, language metadata,
  Open Graph metadata, and structured data where appropriate.
- Handle redirects, trailing slashes, pagination, duplicate content, and 404/410 pages.
- Verify mobile usability, page speed, indexability, and rendered content.
- Set up Google Search Console and verify domain ownership through a secure method.

### E-commerce feeds

- Configure Google Merchant Center and Meta Catalog feeds when the business uses them.
- Keep product IDs, titles, descriptions, images, availability, price, currency,
  variants, shipping, and landing pages consistent with the live store.
- Ensure sale prices and stock changes propagate correctly.
- Diagnose disapprovals and feed errors; do not fabricate product attributes.
- Protect feed endpoints and credentials.

### Analytics and conversion measurement

- Configure GA4 or the selected analytics platform only after defining business goals.
- Track appropriate events such as `view_item`, `add_to_cart`, `begin_checkout`,
  `purchase`, refunds, and subscription lifecycle events.
- Ensure purchase events are deduplicated and use authoritative order values.
- Do not send passwords, payment details, raw personal data, or sensitive
  information to analytics or advertising platforms.
- Audit cookies, pixels, SDKs, data sharing, retention, consent mode, and opt-out
  behavior against applicable law and the site's stated policy.
- Validate events in test/debug environments before production use.

## Phase 7: Privacy, legal, consumer transparency, and accessibility

This phase identifies technical and product requirements for review. It does not
replace advice from a qualified lawyer or tax professional in the relevant
jurisdiction.

### Privacy and data governance

- Identify the applicable jurisdictions, business role, data categories,
  processors, cross-border transfers, and legal bases for processing.
- Publish clear, localized privacy information describing data collected,
  purposes, sharing, retention, user rights, contact channels, and security practices.
- Use granular, informed opt-in consent where required; do not use pre-ticked
  optional consent boxes or bundle unrelated purposes.
- Separate essential service communications from marketing consent.
- Collect only necessary data and define retention/deletion periods.
- Provide appropriate processes for access, correction, export, deletion, and
  consent withdrawal, subject to applicable legal exceptions.
- Maintain processor/vendor records and review contracts and data-processing terms.
- Review cookies, analytics, advertising pixels, session replay, and AI services.
- Do not use customer data to train AI models without a valid, transparent,
  explicitly authorized basis and any required permission.
- If children may use the service, determine applicable age rules and implement
  legally appropriate age assurance and parental/guardian consent where required.
- Maintain a privacy contact and a documented incident/breach response process.
- Treat “report within 48 hours” as a possible internal operational target only;
  actual notification deadlines, recipients, and thresholds vary by jurisdiction.
  Obtain legal review and meet the applicable statutory deadline.

### Terms, commerce, and customer transparency

- Draft localized Terms & Conditions, privacy policy, refund/return/exchange,
  shipping/delivery, warranty, subscription, and cancellation disclosures as relevant.
- Make prices, taxes, fees, renewals, trial conversions, and cancellation terms clear
  before purchase.
- Make subscription cancellation accessible and no more difficult than necessary
  under applicable rules.
- Display verified business registration and tax information where legally required;
  provide editable admin fields without inventing or displaying unverified numbers.
- Issue electronic invoices/receipts according to applicable tax requirements.
- Clearly explain support channels, complaint handling, delivery times, and refund
  processing expectations.
- Remove fake reviews, fake scarcity, fabricated stock counts, misleading timers,
  and deceptive consent patterns.
- Have legal/tax professionals verify jurisdiction-specific wording and obligations.

### Accessibility

- Target WCAG 2.2 AA where feasible and appropriate; identify any legal or
  contractual accessibility standard that applies.
- Use semantic HTML, accessible names/labels, logical heading order, keyboard
  navigation, visible focus, and appropriate focus management.
- Ensure sufficient text and UI contrast; do not communicate state by color alone.
- Provide meaningful alt text for informative images and empty alt for decorative ones.
- Ensure forms expose labels, instructions, errors, and status messages to assistive tech.
- Support zoom/reflow, reduced motion, captions/transcripts for relevant media,
  and accessible dialogs/menus.
- Test with keyboard-only navigation and at least one screen reader on key flows.
- Use automated checks as a supplement, not a replacement, for manual testing.

## Phase 8: Testing and verification

Build a risk-based test plan around the application's actual features.

### Automated and manual checks

- Unit tests for business rules, calculations, validation, and state transitions.
- Integration tests for APIs, database transactions, authentication, and providers.
- End-to-end tests for sign-up, login, purchase, refund, cancellation, admin, and
  other critical user journeys.
- Static analysis, dependency scanning, secret scanning, and security linting.
- Dynamic security testing in authorized staging environments.
- Accessibility automation plus manual keyboard/screen-reader checks.
- Migration tests with representative data and restore tests.
- Load/stress tests with safe limits and no impact on production users.

### Security test cases

At minimum, where applicable:

- Attempt client-side price/discount/quantity tampering.
- Attempt cross-user and cross-tenant access to records and files.
- Attempt privilege escalation and direct admin API calls.
- Test expired, reused, and invalid reset/OTP/session tokens.
- Test brute-force protections and account enumeration.
- Submit malformed inputs, injection payloads, oversized requests, and unsafe uploads.
- Test CSRF, XSS, open redirects, SSRF, and CORS boundaries where relevant.
- Replay, forge, duplicate, delay, and reorder payment webhook events in sandbox.
- Verify that secrets are not present in client bundles, source maps, logs, or artifacts.

### Reliability and performance test cases

- Simulate duplicate order/payment requests and retry behavior.
- Simulate provider timeouts, rate limits, malformed responses, and partial outages.
- Verify queue retries, dead-letter behavior, and job idempotency.
- Test backup restoration and disaster-recovery procedures.
- Test slow/unstable mobile networks (including throttled 3G-like conditions),
  low-end devices, and realistic data volumes.
- Compare API latency, query time, bundle size, and Core Web Vitals before/after.

### CI/CD and release safety

- Run required tests and scans in CI before merge/deploy.
- Protect main/release branches and require review for sensitive changes.
- Use preview/staging deployments and environment-specific secrets.
- Use progressive rollout, feature flags, or canary releases where appropriate.
- Verify health checks and smoke tests after deployment.
- Define rollback or forward-fix procedures and identify who can authorize them.
- Ensure database changes are compatible with the deployed application version.
- Keep deployment logs and release identifiers for traceability.

## Phase 9: Go-live decision and handover

Do not issue a blanket “ready” verdict. Use one of these outcomes:

- **Blocked:** one or more critical risks or unverified prerequisites make launch unsafe.
- **Conditionally ready:** no known critical blocker, but listed high/medium risks,
  owner actions, or limitations remain and require explicit acceptance.
- **Ready within assessed scope:** required checks passed for the defined scope,
  with residual risks and exclusions documented.

### Go-live checklist

- [ ] Critical and high findings fixed or formally risk-accepted by the owner.
- [ ] Authentication, authorization, tenant isolation, and admin protections tested.
- [ ] Payment calculations and webhook verification tested in provider sandbox.
- [ ] Secrets are protected and exposed credentials rotated.
- [ ] Production configuration, HTTPS, domains, and security headers reviewed.
- [ ] Database migrations reviewed and recovery plan confirmed.
- [ ] Backups are configured and a restore has been tested.
- [ ] Monitoring, alerts, logs, and incident contacts are in place.
- [ ] Critical journeys and error states tested on desktop and mobile.
- [ ] Performance baseline and post-change comparison documented.
- [ ] Privacy, legal, tax, consumer, and accessibility reviews assigned/completed
      as applicable.
- [ ] SEO, feeds, and analytics validated where in scope.
- [ ] Rollback plan, release owner, and support process confirmed.
- [ ] Explicit production deployment approval obtained.

### Final report format

Include:

1. Executive summary and readiness verdict.
2. Scope, stack, versions, and environments inspected.
3. Architecture/data-flow summary.
4. Findings ordered by severity, with evidence and affected components.
5. Changes made, files changed, and rationale.
6. Tests executed, environment, commands/tools, results, and limitations.
7. Before/after metrics with measurement conditions.
8. Remaining risks, owner actions, and external approvals required.
9. Backup/restore and rollback status.
10. Go-live recommendation and explicit items that remain unverified.

## Practical rules and common pitfalls

- A Vite frontend is not a secure backend. Critical business rules and privileged
  credentials must live on a trusted server or properly secured managed service.
- Supabase/Firebase row-level security and security rules must be tested with
  real role contexts; client-side checks are not enough.
- A successful build does not prove runtime correctness or security.
- Deleting a leaked key from the latest commit does not invalidate it; rotate it.
- Never test destructive actions against production or use real customer/payment data.
- Never acknowledge payment success until the provider's verified state and internal
  order state agree.
- Never silently swallow failed payment webhooks; log, alert, and reconcile.
- Do not add Redis, microservices, queues, Kubernetes, or load balancers by default.
- Do not add arbitrary fixed thresholds for login attempts, backup intervals,
  timeouts, cache TTLs, or page sizes. Derive them from risk, provider limits,
  traffic, RPO/RTO, and measurements.
- Do not claim legal compliance based on generic policy templates.
- Do not treat automated accessibility/security scanners as exhaustive.
- Do not expose stack traces, secrets, private URLs, or customer information in reports.
- Do not mark a finding “fixed” until its acceptance test passes and evidence is recorded.

## Definition of done

The engagement is complete only when:

- The defined scope and exclusions are documented.
- Findings are evidence-based and prioritized.
- Every approved change is recorded and reviewed.
- Relevant automated and manual tests have been run.
- Security, payment, reliability, and performance behavior has been verified
  within the available environment.
- Before/after measurements are recorded where optimization was performed.
- Remaining risks and owner actions are explicit.
- Recovery and rollback expectations are documented.
- The final readiness verdict is limited to the scope actually assessed.
