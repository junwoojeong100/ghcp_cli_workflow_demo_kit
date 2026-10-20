- CR: CR-2026-014 / - Status: Pending approval / - Author: change-analyst -> solution-architect
## 1. Decisions
| Question | Human choice | Reason / consequence |
|---|---|---|
| Legacy reason collection? | Allow omission in mobile 3.1-3.3 until 2026-12-01; warn. | Human-authorized temporary R2 exception, not full R2 compliance. |
| Tier interpretation? | Trim/uppercase; VIP gets 60 days, all others 30. | Matches the badge; no customer-data rewrite. |
| Exception identification/expiry? | Exact User-Agent allowlist; cutoff 2026-12-01 00:00 UTC. | Simple boundary; human accepts self-declared, spoofable identity. |
## 2. Change overview
VIP customers receive 60 days; standard customers retain 30 days.
New requests collect a reason, except the explicitly time-limited legacy omission.
Refunds above KRW 1,000,000 wait for existing admin approval before approval/payout.
Web, outcome e-mails and policy explain the same rules and temporary exception.
## 3. Detailed design
| Expected file(s) | Responsibility |
|---|---|
| `app/services/refund_policy.py` | Central constants: 30/60 days, KRW 1,000,000, 200 chars, cutoff/allowlist. |
| `app/services/refund_service.py` | Apply rules; persist reason; record exception warning/audit metadata. |
| `app/schemas.py`, `app/routers/orders.py` | Validate reason; pass omission state and allowlisted client identity. |
| `db/migrations/002_add_refund_reason.sql` | Add nullable reason; do not modify migration 001. |
| `app/static/index.html` | Required reason field, readable errors, policy/pending wording. |
| `app/notifications.py`, `docs/policy/refund-policy.md` | Align approved/rejected notices and customer policy. |
| `tests/test_refunds.py`, `tests/test_ui.py` | Extend existing tests; cover migration/legacy compatibility here too. |

| Condition | Result |
|---|---|
| `(tier or "").strip().upper() == "VIP"` | Inclusive 60-day window; every other value uses 30 days. |
| Age exceeds applicable window, or CANCELLED | Existing denial; UTC dates/time come only from `app.clock`. |
| Reason supplied | Trim; require 1-200 characters; reject null, blank or invalid type. |
| Reason omitted + allowlisted client + now before cutoff | Accept other rules permitting; store NULL; warning and audit marker. |
| Reason omitted in every other case | Reject with a message requesting the reason; no refund row. |
| SHIPPED OR requested amount > KRW 1,000,000 | `REQUESTED`, decided_at NULL; no approval e-mail or payout yet. |
| Otherwise eligible, including exactly KRW 1,000,000 | Existing auto-approval; keep positive amount/order-balance checks. |
| Pending refund | Reserve amount alongside APPROVED; existing admin approve/reject only. |
API: retain paths/status names and successful response fields; POST still returns 201.
Example request: `POST /orders/1015/refund`, `{"amount":1350000,"reason":"Wrong size"}`.
Example response: `{"id":3,"order_id":1015,"amount":1350000,"status":"REQUESTED","requested_at":"2026-10-20T00:00:00+00:00","decided_at":null}`.
Legacy example: `User-Agent: ShopFlowMobile/3.1` and `{"amount":1000}` works only before cutoff.
Allowlist: exactly `ShopFlowMobile/3.1`, `ShopFlowMobile/3.2`, `ShopFlowMobile/3.3`; no prefix matching.
Missing/null/blank reason: 400 `{"detail":{"code":"REASON_REQUIRED","message":"Please enter a refund reason."}}`.
Schema type/length errors: 422; web renders validation messages as text, not raw input or HTML.
Keep omission distinct from explicit null; schema trims before enforcing its 200-character limit.
DB expand draft: `ALTER TABLE refunds ADD COLUMN reason TEXT;`. Switch: migrate first, then new readers/writers; old SQL remains valid, old reasons stay NULL.
Contract: none in this CR; retain nullable storage for history after cutoff; no backfill/deletion.
Use parameter binding and existing request transaction for refund, audit and notification writes.
Screens: labeled reason field, required/max-length feedback; show REQUESTED as "Pending approval".
Wording: "VIP: 60 days; standard: 30 days. A reason is required. Above KRW 1,000,000 requires admin approval."
Policy also states the legacy omission exception and exact expiry; no new pending e-mail.
Retain request/decision events and refund links; mark accepted omissions as `legacy_reason_omitted`.
Emit structured WARNING with refund/order IDs, allowlisted version and cutoff, never reason/PII/raw headers.
Keep `/admin/**` authentication unchanged; do not return stored free text in new public fields.
## 4. Test strategy
| Requirement | Scenarios / expected outcome |
|---|---|
| R1 | Standard 30/31, VIP 45/60/61; `VIP`, `vip`, `VIP `, NULL/unknown. |
| R2 | Omitted/null/blank, trim, lengths 1/200/201, invalid type; readable prompt. |
| R2 exception | All 3 exact agents before/at/after cutoff; unknown/missing/suffix agents denied. Verify NULL storage and one safe warning/audit marker. |
| R3 | KRW 999,999/1,000,000/1,000,001; SHIPPED; reservations; cancellation; admin authorization, decisions, audit and no early approval notification. |
| R4 | Web and both outcome e-mails/policy agree; safe text rendering and pending label. |
| Compatibility | Old app on expanded schema; existing rows unchanged; reason persists; failed requests leave no writes. |
## 5. Deployment and rollback plan
Order: design approval -> implementation -> tests/review -> code approval -> staging/smoke -> production approval -> release.
Back up consistently; expand before switch; retain new rows/column on code rollback, never restore a stale DB over live writes.
Old code violates new policy: do not route refund writes to it after activation; owner must rehearse policy-safe recovery.
Monitor refund errors/client version, legacy warnings, pending approvals and notification/audit consistency through cutoff.
## 6. Risks and mitigations
Pre-deployment checklist: Needs confirmation - uninterrupted cutover/recovery; current script stops first (`scripts/deploy.sh:107`).
Pre-deployment checklist: Needs confirmation - actual mobile agents, advance notice and missing-reason UX (`docs/architecture.md:16`).
Pre-deployment checklist: Needs confirmation - external payout respects pending; worker is external (`docs/architecture.md:8`).
Pre-deployment checklist: Needs confirmation - production distributions/NULL entitlement; local-only evidence (`docs/cr/CR-2026-014/01-impact-analysis.md:35`).
Follow-up: shared admin identity remains unchanged; individual identity redesign is out of scope.
