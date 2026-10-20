# CR-2026-014 - Implementation notes

VIP eligibility, reason collection and high-value approval are implemented.
The approved legacy omission exception expires at 2026-12-01 00:00 UTC.
No deployment or live-data migration was performed.

## Changed files
| File(s) | Implementation |
|---|---|
| `db/migrations/002_add_refund_reason.sql` | Nullable reason; historical data/old writers preserved. |
| `app/services/refund_policy.py` | Central windows, threshold, reason limit, allowlist/cutoff and notices. |
| `app/services/refund_service.py` | Tier eligibility, pending high-value refunds, stored reason, safe warning/audit marker. |
| `app/schemas.py`, `app/routers/orders.py` | Trim/validate input; distinguish omitted/null; exact legacy identity. |
| `app/main.py` | Render shared policy notices and reason limit into both index URLs. |
| `app/static/index.html` | Required reason field, text-only errors and pending label. |
| `app/notifications.py` | Both outcome templates use shared policy/exception notices. |
| `docs/policy/refund-policy.md` | Customer policy and temporary exception. |
| `tests/test_refunds.py`, `tests/test_ui.py` | Minimal request-helper/wording fixes to existing tests. |
| `docs/cr/CR-2026-014/03-implementation-notes.md` | This handoff; 12 implementation files total. |

## Differences from design
| Item | Detail |
|---|---|
| Business rules/API | No differences; public refund response fields remain unchanged. |
| Rendering adapter | `app/main.py` was not in the expected-file list. Rendering existing index paths avoids duplicating policy numbers in HTML; no new business endpoint. |
| Test ownership | Only existing tests were adjusted. Additional boundary checks ran ad hoc; persistent new regression tests belong to qa-engineer. |
| Approved artifacts | Impact/design documents and approval records were not edited. |

## Verification
| Command / check | Result |
|---|---|
| `.venv/bin/python scripts/gate.py verify design CR-2026-014` | Passed before implementation. |
| `.venv/bin/ruff check . && .venv/bin/ruff format . && .venv/bin/pytest -q` | Passed; 26 existing tests passed. |
| `.venv/bin/python -` (temporary DB, inline validation) | 136 assertions passed: boundaries, exact clients/cutoff, safe warning/audit fields, reasons, reservations, admin flow and wording. |
| Same inline validation | Previous release `5d2b203` (then `HEAD`) read/wrote expanded schema; migration preserved all five business tables and was idempotent. |
| `node` (inline DOM stub, actual page script) | Passed: trimmed payload, pending label, 400/422 text-only errors. Not a browser end-to-end test. |

Initial ad hoc wording check included old queued e-mails; corrected it to check only new notifications, explicitly preserving historical bodies. No application change was needed.

## Remaining items / next stage
| Owner/stage | Item |
|---|---|
| qa-engineer | Add persistent boundary/compatibility tests and write `04-test-report.md`; perform browser validation. |
| Review/release | Code approval, staging verification and human production approval remain outstanding. |
| Pre-deployment checklist | Needs confirmation: uninterrupted cutover/recovery (`scripts/deploy.sh:107`). |
| Pre-deployment checklist | Needs confirmation: actual mobile agents, advance notice and reason UX (`docs/architecture.md:16`). |
| Pre-deployment checklist | Needs confirmation: external payout respects pending (`docs/architecture.md:8`). |
| Pre-deployment checklist | Needs confirmation: production distributions and NULL entitlement (`docs/cr/CR-2026-014/01-impact-analysis.md:35`). |

Rollback must preserve the expanded schema and new data; do not send refund writes to old code after activation because it does not enforce the new policy.
