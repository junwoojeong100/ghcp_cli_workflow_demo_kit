# CR-2026-014 - Test report

**Result: PASS.** 100 passed, 0 failed, 0 skipped; 74 added cases across 32 new test functions.
Application coverage: **99%** (278/282 statements); no implementation defects observed.
Tested implementation: `dde25f9`. Changes are limited to tests and this report; no production code/data changes.

## Execution
| Command / environment | Result |
|---|---|
| `.venv/bin/pytest -q --cov=app --cov-report=term-missing` | Passed: 100 cases; coverage 99%. |
| `.venv/bin/ruff check .` | Passed. |
| `.venv/bin/ruff format tests/test_refunds.py tests/test_ui.py tests/test_migrations.py` | Passed; final run required no changes. |
| `.venv/bin/pytest --collect-only -q` | 100 collected: refunds 77, UI 10, migrations 2, other existing tests 11. |
| `.venv/bin/python scripts/gate.py verify design CR-2026-014` | Passed before test authoring. |
| Runtime / isolation | macOS, Python 3.12.15, Node.js 22.16.0; temporary SQLite DBs, fixed clocks, local TestClient. |

## Requirements traceability
Names below are exact pytest function names; parameterization supplies the individual cases.

| Requirement | Test name | Verification |
|---|---|---|
| R1 | `test_refund_window_uses_normalized_customer_tier` | VIP days 31/45/60/61; case/space variants; standard day 45; NULL/unknown day 31. |
| R1 | `test_refund_on_day_30_is_allowed`, `test_refund_on_day_31_is_rejected` | Existing standard boundaries retained. |
| R2 | `test_invalid_reason_is_rejected_without_writes` | Missing/null/empty/blank, length 201 and invalid types; prompt and no writes. |
| R2 | `test_valid_reason_is_trimmed_and_persisted` | Lengths 1/200, padded 200 and SQL-like text stored safely. |
| R2/security | `test_reason_and_customer_details_are_not_logged` | Raw reason and customer PII absent from access/application/audit logs. |
| R2 exception | `test_legacy_reason_exception_expires_at_utc_cutoff` | All three allowed versions immediately before/at/after December 1 UTC. |
| R2 exception | `test_unrecognized_clients_cannot_omit_reason` | Unknown/case/prefix agents, empty and missing header denied. |
| R2 exception | `test_legacy_exception_does_not_accept_explicit_empty_reason` | Explicit null/blank is not an omission. |
| R2 exception | `test_legacy_app_can_supply_reason_after_cutoff` | Valid legacy request still works after expiry. |
| R2 trace | `test_accepted_legacy_omission_emits_one_safe_warning` | Exactly one WARNING; approved structured fields only. |
| R2 trace | `test_legacy_omission_is_stored_as_null_and_audited` | NULL reason; request actor, refund link and exception marker. |
| R2 trace | `test_legacy_warning_is_not_emitted_without_accepted_omission` | No warning for supplied reasons or rejected null. |
| R3 | `test_high_value_threshold_applies_to_requested_amount` | KRW 999,999/1,000,000/1,000,001 and pending decision time. |
| R3 | `test_high_value_refund_appears_in_pending_admin_list` | High-value request appears in existing REQUESTED queue. |
| R3 | `test_pending_high_value_refund_does_not_send_approval_email` | No premature approval notification. |
| R3 | `test_pending_high_value_refund_reserves_order_balance` | Pending amount prevents excess refunding. |
| R3 | `test_legacy_reason_exception_does_not_bypass_high_value_approval` | Legacy omission never bypasses approval. |
| R3 | `test_rejected_high_value_refund_releases_order_balance` | Rejection allows replacement request. |
| R3 | `test_admin_decision_updates_high_value_refund` | Approve/reject persist status and decision timestamp. |
| R3/audit | `test_high_value_admin_decision_is_audited` | Both admin outcomes retain actor and refund link. |
| R3/R4 | `test_high_value_decision_email_matches_policy` | One outcome e-mail; tier periods, reason, threshold and expiry. |
| R3/security | `test_high_value_rejection_requires_admin_authentication` | Unauthorized rejection leaves request pending. |
| R3 | `test_shipped_refund_at_threshold_remains_pending` | Existing logistics approval remains at exactly KRW 1,000,000. |
| Compatibility | `test_new_refund_preserves_public_response_shape` | Stored reason does not change public response fields. |
| R4 | `test_refund_form_requires_bounded_reason` | Required labeled textarea, rendered 200-character limit and prompt. |
| R4 | `test_customer_notice_explains_approval_and_legacy_expiry` | Both index URLs show actual policy and exception expiry. |
| R4 | `test_published_refund_policy_matches_approved_rules` | Published policy covers all approved business rules. |
| R2/R4 | `test_refund_form_sends_trimmed_reason` | Actual JavaScript handler sends trimmed input. |
| R2/R4 | `test_blank_reason_is_not_submitted` | Page blocks whitespace-only submission. |
| R3/R4 | `test_pending_refund_is_shown_as_pending_approval` | Customer receives pending label, not approval wording. |
| R2/R4/security | `test_refund_error_is_rendered_as_text` | Business/validation errors, including HTML-like text, rendered as text. |
| Data preservation | `test_refund_reason_migration_preserves_historical_data` | Five business tables preserved; historical reasons NULL; repeat migration safe. |
| Old app/new DB | `test_previous_release_can_read_and_write_expanded_schema` | Complete pinned previous app reads history and writes amount-only refunds. |

## Defects and coverage limits
| Item | Finding |
|---|---|
| Defect list | None observed; no implementation fix or production-code modification performed. |
| Coverage details | Policy, schema, notifications, main and routers: 100%; refund service: 98%. Uncovered: clock 7/11, config 29, refund service 27. |
| Previous release | Fixed commit `5d2b2035f2527ee950d91dbaf6fd342fc49aebef`, not `main`; isolated subprocess imports its complete app. |
| Compatibility boundary | Schema/old-payload compatibility verified; old code still does not enforce the new business policy and is not a policy-safe rollback. |
| UI boundary | Real page JavaScript executed in Node with a DOM stub, not a browser. Five cases explicitly skip if Node is unavailable; none skipped here. |

## Remaining risks / pre-deployment checklist
| Item | Status / evidence |
|---|---|
| Device/browser behavior and mobile advance notice | Needs confirmation; client versions are outside repository control (`docs/architecture.md:16`). |
| Payout before approval | DB status/notification hold verified; external payment/worker behavior needs confirmation (`docs/architecture.md:8`). |
| Uninterrupted cutover and safe recovery | Not deployed/tested; current stop/start requires operational confirmation (`scripts/deploy.sh:107`). |
| Production tiers/data distribution | Local isolated data only; production entitlement/distribution needs confirmation (`docs/cr/CR-2026-014/01-impact-analysis.md:35`). |
| CI history | Compatibility test requires the pinned Git object; shallow checkouts must include it (`tests/test_migrations.py:14`). |

Next stage: **code-reviewer**. Code approval and deployment approvals have not been requested.
