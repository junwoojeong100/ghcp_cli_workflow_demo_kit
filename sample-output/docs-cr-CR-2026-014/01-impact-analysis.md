# CR-2026-014 - Impact analysis

## 1. At a glance
- Extend VIP eligibility to 60 days, require a reason, and hold refunds above KRW 1,000,000 for approval.
- Cross-cutting impact: API, rules, additive DB migration, web, notifications, policy, tests and operations.
- Biggest risk: mobile 3.1-3.3 cannot supply reasons; mandatory validation breaks their refund requests.
- Local snapshot: 5 delivered orders enter the VIP 31-60-day window after tier normalization.
- Decisions: legacy-client reason collection and interpretation of irregular/missing customer tiers.

## 2. Requirement interpretation
| ID | Intended outcome | Ambiguity / boundary |
|---|---|---|
| R1 | VIP: purchase age up to 60 days; standard: up to 30 days. | Preserve inclusive UTC-date boundaries; decide tier interpretation, not a data rewrite. |
| R2 | Collect and persist a nonblank reason for every new refund request; show a useful prompt when missing. | Legacy-client handling requires agreement with IT; historical refunds have no reason to recover. |
| R3 | Each requested amount strictly above KRW 1,000,000 enters existing `REQUESTED` approval handling. | Exactly KRW 1,000,000 stays eligible for auto-approval; preserve SHIPPED manual approval and total-refund limits. No cumulative high-value rule is requested. |
| R4 | Align customer wording, both outcome e-mails and policy with R1-R3. | Do not promise approval or payout while a request is pending. |

Constraints: preserve all existing records, avoid interruption, notify mobile impact in advance, and retain CR/approval traceability. Evidence: `docs/requirements/CR-2026-014.md:22`.

## 3. Impact table
| Area | File/location | Change | Risk | Evidence |
|---|---|---|---|---|
| API | RefundCreate, orders router, refund service | Add bounded, trimmed reason validation and pass/store it; keep status contract and provide a readable missing-reason error. | High | `app/routers/orders.py:22` |
| Business rules | refund_policy / refund_service | Centralize tier-dependent windows and threshold; pending when SHIPPED OR amount > threshold; retain pending reservations against order total. | High | `app/services/refund_service.py:29` |
| DB/data | refunds; new numbered migration | Add nullable reason for old rows/old writers; validate new requests in application; leave customers/orders/history intact. | High | `db/migrations/001_init.sql:18` |
| Customer/admin web | Refund form, policy notice, pending list | Add reason and prompt; align wording; reuse REQUESTED list and approve/reject controls rather than a new status/workflow. | Medium | `app/static/index.html:129` |
| Notifications | Approved/rejected templates and queue | Update both 30-day notices and approval wording; preserve no approval notification before decision. | Medium | `app/notifications.py:5` |
| Documents | Customer policy and CR deliverables | Publish tier periods, required reason and high-value approval; retain numbered deliverables and human approval records. | Medium | `docs/policy/refund-policy.md:5` |
| Tests/tools | Refund/UI tests, fixtures and API callers | Add boundary/compatibility cases; update reason-bearing successful requests and obsolete wording assertions; coordinate protected tooling if needed. | Medium | `tests/test_refunds.py:4` |
| Deployment/operations | Migration, service swap, rollback | Expand before switch; rehearse previous-version compatibility and preserve post-release data; current stop/start cannot demonstrate uninterrupted service. | High | `scripts/deploy.sh:107` |
| Mobile/external clients | Mobile 3.1-3.3; external e-mail worker | Amount-only requests break on mandatory reasons; announce agreed alternative before activation; worker/payment effects need confirmation. | High | `docs/architecture.md:16` |
| Audit/security | Existing request/decision events; reason input | Preserve event links and timestamps; persist reason without raw-text logging; enforce trimming/length limit and existing admin authentication. | Medium | `docs/standards/security-checklist.md:8` |

## 4. Data check results
Read-only local `data/orders.db`, snapshot 2026-10-20 00:20:52 UTC; **not production evidence**. Each statement below ran through `sqlite3 -readonly -header -column data/orders.db "<SQL>"`; no data was changed.

| Check | Observed result |
|---|---|
| Raw customer tiers | 12 customers: `STANDARD` 5; `VIP` 4; `vip` 1; `VIP ` 1; NULL 1. Trimming/uppercasing identifies 6 VIPs; NULL remains unidentified. |
| Orders / threshold | 20 orders, KRW 35,000-2,300,000; purchases 2026-08-11 through 2026-10-18. Above threshold: 3 DELIVERED; exactly threshold: 1 DELIVERED. Below: 13 DELIVERED, 1 PAID, 1 SHIPPED, 1 CANCELLED. |
| Purchase ages | Normalized VIP: 5 DELIVERED orders aged 31-60 days (3 `VIP`, 1 `vip`, 1 `VIP `); standard: 3 DELIVERED in that band; NULL: 1 DELIVERED. These are age candidates, not guaranteed refundable balances. |
| Refunds / history | 1 APPROVED (KRW 55,000), 1 REJECTED (KRW 99,000); neither above threshold; no pending refunds, queued notifications or audit events. |
| Schema | Only `001_init` applied; refunds has id/order_id/amount/status/requested_at/decided_at, no reason. Preserve both historical rows without fabricated reasons. |

Executed SQL (the detailed cohort query also returned all tier/age/status groups):
```sql
SELECT 'local_snapshot_utc' AS item, datetime('now') AS value;
SELECT quote(tier) AS raw_tier, COUNT(*) AS customers FROM customers GROUP BY tier ORDER BY raw_tier;
SELECT COUNT(*) AS orders, MIN(total_amount) AS min_krw, MAX(total_amount) AS max_krw, MIN(ordered_at) AS earliest_purchase, MAX(ordered_at) AS latest_purchase FROM orders;
SELECT CASE WHEN total_amount < 1000000 THEN 'below' WHEN total_amount = 1000000 THEN 'exactly' ELSE 'above' END AS threshold_band, status, COUNT(*) AS orders FROM orders GROUP BY threshold_band, status;
SELECT status, COUNT(*) AS refunds, SUM(amount) AS total_krw, SUM(amount > 1000000) AS above_threshold FROM refunds GROUP BY status;
SELECT COUNT(*) AS notifications FROM notifications;
SELECT action, COUNT(*) AS events FROM audit_log GROUP BY action;
PRAGMA table_info(refunds);
SELECT CASE WHEN UPPER(TRIM(tier)) = 'VIP' THEN 'VIP' WHEN tier IS NULL THEN 'NULL' ELSE 'STANDARD' END AS normalized_tier, COUNT(*) AS customers FROM customers GROUP BY normalized_tier;
SELECT quote(c.tier) AS raw_tier, CASE WHEN CAST(julianday('2026-10-20') - julianday(o.ordered_at) AS INTEGER) <= 30 THEN '0-30' WHEN CAST(julianday('2026-10-20') - julianday(o.ordered_at) AS INTEGER) <= 60 THEN '31-60' ELSE '61+' END AS age_days, o.status, COUNT(*) AS orders FROM orders o JOIN customers c ON c.id=o.customer_id GROUP BY raw_tier, age_days, o.status ORDER BY raw_tier, age_days;
SELECT COUNT(*) AS vip_orders_new_window, SUM(o.status != 'CANCELLED') AS noncancelled FROM orders o JOIN customers c ON c.id=o.customer_id WHERE UPPER(TRIM(c.tier))='VIP' AND julianday('2026-10-20')-julianday(o.ordered_at) BETWEEN 31 AND 60;
SELECT COUNT(*) AS audit_events FROM audit_log;
SELECT version FROM schema_migrations ORDER BY version;
```

## 5. Risks and backward-compatibility scenarios
| Scenario | Consequence / required treatment | Evidence |
|---|---|---|
| Legacy mobile submits only amount | Mandatory reason rejects requests; do not invent a reason or silently exempt old apps. Agree collection route and advance customer communication. | `docs/architecture.md:16` |
| Missing reason produces schema validation detail | Web currently reads `err.message`; a validation-detail array would not show the required prompt. Align validation response/rendering and test it. | `app/static/index.html:134` |
| Literal VIP comparison | Two customers displayed as VIP could wrongly remain on 30 days; normalize at rule evaluation without rewriting source tiers. | `app/static/index.html:103` |
| Delivered refund of KRW 1,000,001 | Currently auto-approved; reuse REQUESTED with no decided_at/approval e-mail until admin decision; retain shipped approvals and partial-refund reservations. | `app/services/refund_service.py:42` |
| Old and new application versions overlap or rollback | Nullable reason preserves old SQL, but old code still omits reasons and auto-approves high amounts; schema compatibility alone does not preserve new policy. Control switch/rollback explicitly. | `docs/standards/db-migration-guide.md:5` |
| Service swap / recovery | Current stop-before-start interrupts availability; restoring a stale backup could lose new records. Prefer code rollback on expanded schema with an explicit policy-containment plan. | `scripts/deploy.sh:107` |
| Audit and actual payout | Request/decision logging exists but local audit history is empty. Needs confirmation: actual worker/payment side effects are outside inspected implementation; verify no pre-approval payout. | `docs/architecture.md:8` |

## 6. Decisions needed
| Priority / owner | Options (pro / con) | Recommendation | Evidence |
|---|---|---|---|
| 1 - CX + IT: legacy reason collection | A: enforce at activation and direct old-app users to updated web/support collection (meets R2 / disrupts in-app flow). B: stage client changes before enforcement (less disruption / delays R2 and possibly go-live). | A, with advance notice and confirmed usable collection route; never substitute a placeholder reason. Legacy error-display capability: Needs confirmation. | `docs/requirements/CR-2026-014.md:29` |
| 2 - CX: tier interpretation | A: trimmed, case-insensitive VIP; all other values use 30 days (matches current badge / NULL may conceal an entitlement). B: validate unresolved tiers individually (explicit classification / adds operational work). | A without rewriting data; confirm the one NULL customer's entitlement as a checklist item. | `app/static/index.html:103` |

Follow-up item: individual admin identity is not captured by the shared-token actor; identity redesign is outside this CR. Evidence: `app/routers/admin.py:17`.

## 7. Suggested next steps
| Stage | Required next action |
|---|---|
| Design | Record the two decisions; specify simple centralized rules, reason validation/storage/error contract, additive migration and rollback; obtain human design approval before implementation. |
| Verification | Cover standard days 30/31 and VIP 45/60/61; raw tier variants/NULL; absent/null/blank/oversized reasons; KRW 999,999/1,000,000/1,000,001; SHIPPED and partial refunds; pending list, approve/reject, no early notification, audit links, UI/e-mail/policy parity, legacy payload and old-version/new-schema behavior. |
| Pre-deployment checklist | Needs confirmation: production tier/amount/age distribution, legacy-client collection/error UX, external payout behavior and uninterrupted cutover mechanism. Current deployment evidence is stop/start, not zero downtime; obtain owner-coordinated resolution without expanding this CR into infrastructure redesign. |
| Release | Retain numbered CR evidence; obtain code approval before staging and production approval after staging smoke verification. Prepare rollback preserving new records; target 2026-11-02 only with acceptance criteria demonstrated. |
