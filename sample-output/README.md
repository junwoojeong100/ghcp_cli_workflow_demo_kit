# sample-output — the real outputs of the recorded session

All numbers in the videos and the PPT come from the material in this folder (and from the recording). If you replay the demo yourself with `shopflow-orders`, the same kinds of files appear in `docs/cr/`, `approvals/` and `.copilot-audit/`.

| File | Contents |
|---|---|
| `docs-cr-CR-2026-014/01-impact-analysis.md` | Change Analyst: impact analysis (impact areas, data anomalies, decisions needed) |
| `docs-cr-CR-2026-014/02-design.md` | Solution Architect: design document (reflects the three human decisions) → subject of **approval ① (design)** |
| `docs-cr-CR-2026-014/03-implementation-notes.md` | Developer: implementation notes |
| `docs-cr-CR-2026-014/04-test-report.md` | Tester: requirements-to-tests traceability table, 100 tests passing · 99% coverage |
| `docs-cr-CR-2026-014/05-review-report.md` | Reviewer: 0 blocker · 0 major · 0 minor → requests **approval ② (code)** |
| `docs-cr-CR-2026-014/06-release-plan.md` | Release Manager: release plan · rollback method · staging/production verification → **approval ③ (production deploy)** |
| `docs-cr-CR-2026-014/07-ops-report.md` | Ops Analyst: read-only analysis of the operations logs and DB, and what the business team must decide |
| `approvals/CR-2026-014/*.json` | 4 approval records — design · code · production (human), staging (system). Each is bound to the SHA-256 of the design document or the code |
| `audit.jsonl` | Audit log of every tool call, 171 entries (166 allowed, 3 approval requests, 2 denied). Local paths are replaced with `<DEMO_KIT>` |
| `full-change.diff` | Full diff of the change against the recording's starting state (tag `baseline-recorded` of the demo repository): code, tests and documents |
| `git-log-stat.txt` | Summary of the 6 commits with the changes per file |
| `production-app.log` | Access log of the simulated production environment (what the Ops Analyst analyzed) |
| `run-metrics.json` | The measured metrics used on the slides (time and AI usage per step, size of the change, tests, review, audit) |

- Human interventions in this session: **6** = 3 approvals (design · code · production) + 3 decisions during the design stage.
  One of the decisions went against the AI's recommendation: a person let the legacy mobile apps (3.1–3.3) omit the refund reason until 2026-12-01. Details of the human decisions are recorded in `docs-cr-CR-2026-014/02-design.md`.
- The two denied entries in `audit.jsonl` are real guardrail hits in the main run: the Reviewer (read-only) tried to commit its report, and the Ops Analyst ran a database query that was not clearly read-only.
- The outputs of the Korean edition come from a separate Korean recording, so their numbers differ. They are in [`ko/sample-output/`](../ko/sample-output/).
- All names and data are fictional.
