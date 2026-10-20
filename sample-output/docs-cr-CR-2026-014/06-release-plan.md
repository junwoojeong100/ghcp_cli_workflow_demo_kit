# CR-2026-014 - Release plan

**Release: v1.1.0.** Approved feature merged into local main; tag v1.1.0 at `7bcae49`; no push.
Deployment order: staging verification, then human-approved production deployment.

## Business release notes
| Change | Customer impact |
|---|---|
| VIP refunds | VIP customers have 60 days; standard customers retain 30 days, inclusive UTC dates. |
| Required reason | Trimmed 1-200-character reason supports audit/root-cause analysis. |
| Temporary compatibility | Exact mobile 3.1-3.3 clients may omit reason before 2026-12-01 00:00 UTC; warnings/audit record omissions. User-Agent spoofability was accepted in design. |
| High-value approval | Requested amount above KRW 1,000,000 waits for admin approval; exactly that amount does not trigger this rule. Existing delivery approval remains. |
| Clear policy | Customer web, approved/rejected e-mails and policy reflect the same rules. Legacy clients need updated reason collection by expiry. |

## Deployment order and database handling
| Step | Action |
|---|---|
| 1 | Verify code approval; run `.venv/bin/ruff check .` and `.venv/bin/pytest -q`. |
| 2 | Merge feature into main with --no-ff; bump VERSION 1.0.0 -> 1.1.0, commit and create local tag v1.1.0. |
| 3 | Run `scripts/deploy.sh staging`; require health v1.1.0 and successful smoke tests. |
| 4 | Present staging results; run `scripts/deploy.sh production` through the human production-approval prompt. No bypass or direct approval-record edits. |
| 5 | Verify production health/version, smoke results and deployment record; record results below. |
| Backup | Script copies each environment DB to `.deploy/<env>/backups/orders-<timestamp>.db` before migration; record actual backup paths after deployment. |
| Expand | Script applies new `002_add_refund_reason` before switching code; nullable reason preserves old rows/writers. Existing migration 001 is unchanged. |
| Switch/contract | Deploy new code; retain nullable column permanently for history. No backfill, deletion, destructive contract or manual production-data edit. |
| Verification basis | Full suite passed: 100 cases. QA coverage: 99%; migration and pinned previous-app compatibility passed. |

## Rollback method
| Environment | Command / limitation |
|---|---|
| Staging | `scripts/deploy.sh staging --rollback` |
| Production | `scripts/deploy.sh production --rollback` |
| Data safety | Script rollback changes the release symlink, not the DB; retain expanded schema and all new records. Do not restore a stale backup over later writes. |
| Policy safety | Previous v1.0.0 code omits reasons and can auto-approve high amounts. Owner must confirm containment/recovery before using it for refund writes; schema compatibility is not policy-safe rollback. |
| Recovery | Keep DB backup for owner-managed recovery/reconciliation if required; no direct restore/data change performed by this release. |

## Monitoring points
| Signal | Watch |
|---|---|
| Availability/version | `/health`, correct environment/version, response failures during switch; current script uses stop/start, not verified zero downtime. |
| Refund errors | 400/422 rates, required-reason prompts and legacy client impact. |
| Compatibility | Structured legacy warnings/audit marker; exception stops at 2026-12-01 00:00 UTC. |
| Approval control | High-value pending queue and age, admin decisions, no approval e-mail before decision; external payout confirmation below. |
| Audit/data | Request/decision trace links, reason persistence, unchanged historical records; never log raw reasons or customer PII. |

## Approval history
| Gate | Record / status |
|---|---|
| Design ① | Gildong Hong (Ops Lead), 2026-10-20 09:25:50 +09:00; integrity verified. |
| Code ② | Gildong Hong (Ops Lead), 2026-10-20 09:45:05 +09:00; integrity verified after merge. |
| Staging | System verification recorded 2026-10-20 09:47:37 +09:00; smoke 6/6; integrity verified. |
| Production ③ | Human-approved deployment; Gildong Hong (Ops Lead), record 2026-10-20 09:48:41 +09:00; smoke 6/6. |

## Pre-deployment checklist (copied from approved design)
Pre-deployment checklist: Needs confirmation - uninterrupted cutover/recovery; current script stops first (`scripts/deploy.sh:107`).
Pre-deployment checklist: Needs confirmation - actual mobile agents, advance notice and missing-reason UX (`docs/architecture.md:16`).
Pre-deployment checklist: Needs confirmation - external payout respects pending; worker is external (`docs/architecture.md:8`).
Pre-deployment checklist: Needs confirmation - production distributions/NULL entitlement; local-only evidence (`docs/cr/CR-2026-014/01-impact-analysis.md:35`).

Human confirmation requested in release conversation; no confirmation inferred. These remain checklist items, not additional deployment gates.

## Deployment result
| Environment | Version / URL | Result | Backup / migration |
|---|---|---|---|
| Staging | v1.1.0 / http://127.0.0.1:8101 | Success; smoke 6/6; independent health/UI checks; process listening. | `.deploy/staging/backups/orders-20261020-094735.db`; 002 applied. |
| Production | v1.1.0 / http://127.0.0.1:8100 | Success after human approval; smoke 6/6; independent health/UI checks; process listening. | `.deploy/production/backups/orders-20261020-094840.db`; 002 applied. |

Deployed folders: staging `20261020-094735-v1.1.0`; production `20261020-094839-v1.1.0`.
Both previous-release links retain v1.0.0. No rollback, database restoration or git push performed.
Checklist confirmations remain unverified; deployment success does not establish zero downtime or external payment behavior.
