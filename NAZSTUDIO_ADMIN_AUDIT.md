# NazStudio admin audit — baseline and remediation plan

**Scope inspected:** Laravel backend and Next.js admin pages in `D:\AI-SASS`.
This report records verified code findings; it is not a client handover or a claim that every A–Z requirement is complete.

## Current admin surface

- Admin pages present: overview, stories/content, users, subscriptions, AI credits/pricing, transactions, plans, add-ons, products, packages, payment gateways, email, backups, activity log, and system health.
- Corresponding Laravel admin APIs exist for those areas, guarded by the `super_admin` middleware alias.
- Existing domain models include users, plans, subscriptions, transactions, invoices, AI credit wallets/reservations/ledger/pricing, stories/assets/outputs, payment/storage/mail settings, activity logs, and legal acceptances.
- Existing credit ledger and reservation services are present; plans and credit packages have admin CRUD endpoints.

## Verified high-risk gaps

1. **Admin authorization is not granular.** `SuperAdminMiddleware` accepts both `admin` and `super_admin`, and the entire admin API group shares this gate. No permission model or backend permission checks exist.
2. **Privilege escalation is possible.** The user-management endpoints accept `role=super_admin` for create/update, although a regular `admin` can call the endpoints. The same controller also lets an admin modify or delete another super-admin.
3. **Account deletion is destructive.** Deleting a user cascades into dependent data according to current schema relationships. There is no reviewable deletion-request/retention workflow.
4. **System health contains fabricated/incorrect state.** Provider latency is generated with `rand()`, payment reachability is reported without checking configuration, a readable `jobs` table is presented as proof that a worker is running, and `recent_errors` is always an empty list.
5. **Dashboard revenue can be wrong.** Revenue sums all transaction currencies into one amount while the UI labels it `$`. Growth reports `100%` when the comparison period is zero, even when there is no meaningful percentage baseline.
6. **Admin control-center features not present in the inspected routes/pages:** staff roles and permissions, customer support/tickets, moderation queue, privacy request lifecycle, prompt versioning, provider usage/cost ledger, generation-stage retry console, webhook event monitoring/retry, coupons/referrals, and configurable SEO/CMS fields beyond the current landing/blog settings.
7. **Auditing is incomplete.** `activity_logs` captures actor/action/resource/value snapshots and request IP/UA, but no reason, request correlation ID, or success/result field. There is no admin management UI or MFA/step-up flow in the inspected admin surface.

## Immediate remediation implemented in this pass

- Restrict staff creation and role changes to the super-admin; regular admins cannot target super-admin accounts.
- Make user deletion unavailable through the unsafe hard-delete endpoint until a reviewed privacy/deletion workflow exists.
- Add auditable reason and request-correlation fields without changing existing log rows.
- Replace fabricated system-health readings with observed/configuration-aware status and failed-job summaries.
- Correct dashboard metrics so percentages and currency totals do not imply unsupported precision.
- Add database-backed admin roles and permission keys, migrate existing admin accounts to a compatibility Administrator role, and enforce permissions per admin API resource/action. The platform super-admin remains the only role that can create/edit roles or assign them, preventing role-based privilege escalation.
- Add an owner-only Roles & Permissions page with permission selection and administrator role assignment. Unknown admin API resources fail closed for non-owner admins.
- Add admin account provisioning in the user page. New administrator accounts receive the compatibility role unless reassigned and must rotate their temporary password before admin APIs are available. Password rotation requires the current temporary password and a strong replacement; other stored sessions are revoked where the token guard supports it.
- Expand audit search with actor/email/reason text, user ID, entity type, request ID, result, action, and date range filters. Bound page size to 100 and validate filters server-side.

## Remaining implementation order

1. ~~Build roles/permissions and permission-aware admin navigation/API middleware; migrate existing staff deliberately.~~ Implemented locally; production migration and live role assignment are not run.
2. ~~Implement admin account provisioning, forced credential rotation, and audit search.~~ Implemented locally. MFA setup/enforcement remains outstanding.
3. ~~Complete user profile/credit/subscription/payment/generation detail and safe suspend/reactivate flows.~~ Implemented locally: user details now show account verification/last sign-in, subscription and payment summaries, AI-credit balance and ledger, recent generation metadata, and audit events. The endpoint uses an explicit response allow-list and excludes OAuth identifiers, payment gateway payloads, child story content, names, and image references. User audit snapshots are also allow-listed. Suspend/reactivate remains available through the existing audited actions.
4. Add financial reconciliation, refunds/webhook monitoring, and multi-currency reports using verified provider events. **Partial local progress:** the transaction admin endpoints now exclude raw gateway payloads, validate filters, and guard CSV exports against spreadsheet formulas. The transactions page now formats the recorded currency and shows exact local-ledger totals grouped by currency and status, plus pending entries older than 30 minutes. This is not provider settlement reconciliation; verified webhook/event monitoring and refund lifecycle controls are still outstanding.
5. Add provider/model usage and cost records, generation pipeline monitoring/retry controls, and prompt versioning.
6. Add privacy/consent/deletion and content moderation workflows appropriate to child media.
7. Add support tickets, notifications/templates, CMS/SEO controls, and exports.
8. Verify each feature with backend authorization/integration tests and actual admin pages; document all external setup and remaining limitations.

## Not verified in this pass

- Production database schema/data and live provider credentials.
- Actual external payment, AI, SMTP, storage, or queue-worker connectivity.
- Client handover readiness, MFA enforcement, or organization/legal compliance.
- End-to-end behavior through a logged-in browser session.

## Latest local verification

- Backend suite: 48 tests, 217 assertions, all passing. Regression coverage verifies user-detail privacy, transaction-response privacy, per-currency totals, stale pending counts, validated filters, date-scoped exports, and spreadsheet formula neutralization.
- Frontend TypeScript check: `npx tsc --noEmit` passed.
- `git diff --check` passed; Git reports only expected LF-to-CRLF normalization warnings on the Windows checkout.
- No deployment, production migration, live service checks, or browser walkthrough has been performed.
