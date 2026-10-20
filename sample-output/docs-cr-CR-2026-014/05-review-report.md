# CR-2026-014 - Code review report

**Conclusion: Recommend approval.** Findings: **0 Blocker / 0 Major / 0 Minor**.
Reviewed `main...f33fb57`, approved design and company standards; no production changes made.
Independent `security-review` found no introduced vulnerabilities.

## Findings
| Classification | Finding | Suggested fix |
|---|---|---|
| None | No confident, actionable change defects found. | None required. |

## Design, coding and compatibility checks
| Check | Assessment | Evidence |
|---|---|---|
| R1: tier/window | Inclusive 60/30 days; case/whitespace normalization; NULL/unknown stay standard. | `app/services/refund_policy.py:38` |
| R2: input | Strict string, trim/200-character limit; omitted/null/blank handled as designed. | `app/schemas.py:17` |
| R2: exception | Exact three clients, omission only, strict UTC cutoff; warning/audit without fabricated reason. | `app/services/refund_policy.py:45` |
| R3: approval | Above KRW 1,000,000 OR SHIPPED becomes REQUESTED; balance reservations retained. | `app/services/refund_service.py:58` |
| R3: effects | No approval notification while pending; existing authenticated decisions retained. | `app/services/refund_service.py:85` |
| R4: wording | Shared policy notices in both outcome e-mails; web/policy parity covered by QA. | `app/notifications.py:6` |
| Layering/constants/time | Router passes validated input; services own rules; constants and clock remain centralized. | `app/routers/orders.py:29` |
| Migration | New 002 adds nullable reason only; no 001 alteration, backfill or destructive contract. | `db/migrations/002_add_refund_reason.sql:2` |
| Old app/new DB | Pinned previous app reads/writes expanded schema; historical rows preserved. | `tests/test_migrations.py:101` |
| Response compatibility | Public refund fields/statuses unchanged; stored free text not exposed. | `tests/test_refunds.py:463` |
| Rendering adapter | Extra main.py adapter is justified: existing index paths share constants without new business API. | `app/main.py:75` |
| Rollback | Expanded schema retained; old code is not policy-safe after activation. Owner recovery rehearsal remains a checklist item. | `docs/cr/CR-2026-014/02-design.md:63` |

## Security checklist S1-S7
| Check | Assessment | Evidence |
|---|---|---|
| S1 | Admin list/approve/reject retain require_admin. | `app/routers/admin.py:21` |
| S2 | New reason insert uses bound SQL parameters. | `app/services/refund_service.py:67` |
| S3 | Changed audit/warning fields exclude raw reason and customer PII. | `app/services/refund_service.py:73` |
| S4 | Trim/type/length guards; errors use textContent; request bodies not access-logged. | `app/static/index.html:113` |
| S5 | Positive amount validation retained; reason validation added server-side. | `app/schemas.py:17` |
| S6 | No credentials introduced; existing marked demo-token setup unchanged. | `app/config.py:18` |
| S7 | High-value control is stricter; no admin-permission relaxation. | `app/services/refund_service.py:64` |

Delegated security result (scope: introduced vulnerabilities; not a whole-system security certification):
| # | Severity | File | Lines | Vulnerability | Confidence |
|---|----------|------|-------|---------------|------------|
| - | - | - | - | No introduced vulnerabilities found | - |

User-Agent spoofability is the explicitly accepted design risk, not a new review finding.
Shared-admin identity/customer-access behavior is unchanged and outside this CR.

## Independent validation
| Command | Result |
|---|---|
| `.venv/bin/ruff check .` | Passed. |
| `.venv/bin/ruff format --check .` | Passed; 55 files already formatted. |
| `.venv/bin/pytest -q --cov=app --cov-report=term-missing` | Passed: 100 cases, none failed/skipped; 99% application coverage. |
| `.venv/bin/python scripts/gate.py verify design CR-2026-014` | Passed; approved document unchanged. |
| Test sufficiency | Boundaries, cutoff, legacy payloads, audit/privacy, status persistence, notifications and migration compatibility covered. |
| Security agent | Read-only review plus memory-only type/length and 90 client/omission/cutoff checks passed. |

## Needs confirmation / pre-deployment checklist
| Item | Action | Evidence |
|---|---|---|
| Uninterrupted switch/recovery | Release owner confirms operational cutover; current script stops before starting. | `scripts/deploy.sh:107` |
| External payout | Confirm REQUESTED cannot trigger money movement outside this repository. | `docs/architecture.md:8` |
| Actual clients/browser | Confirm mobile agent strings, advance notice and browser/device UX; QA used a DOM stub. | `docs/cr/CR-2026-014/04-test-report.md:63` |
| Production data | Confirm production tier distribution and unresolved entitlement; tests used isolated data. | `docs/cr/CR-2026-014/01-impact-analysis.md:35` |
| CI prerequisites | Retain pinned Git object and Node for the complete compatibility/UI run. | `tests/test_migrations.py:14` |

These are existing design/release checklist items, not code-approval conditions or added CR scope.
Code approval is requested after saving this report; the gate record is authoritative for the human decision.
Next stage after code approval: **release-manager**; production approval remains separate.
