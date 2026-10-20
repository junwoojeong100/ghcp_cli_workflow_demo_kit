# CR-2026-014 - Production operations report
- Post-release: 311 requests, 45 HTTP 4xx (14.47%), no HTTP 5xx; P95 response time 2.6 ms.
- Refund outcomes: 81 approved, 25 pending and 45 HTTP 400 attempts; includes one smoke refund.
- Pending refunds total KRW 45,000,000 and require authorized admin decisions.
- Legacy mobile 3.1 generated 20 missing-reason warnings; its exception expires December 1 UTC.
- No e-mail/phone patterns detected; VIP-window uptake and HTTP 400 causes need confirmation.

Scope: v1.1.0; filter from 2026-10-20 00:48:39 UTC, actual post-release logs 00:48:41.158654-00:49:45.828965 UTC. DB snapshot query: 00:51:49 UTC. All DB access used `sqlite3 -readonly`; no production changes.
The sample includes the user-run synthetic burst, not representative daily customer traffic. Simulation clients account for 150 refund attempts; the remaining attempt is smoke verification.

## Observations
| Area | Actual result / interpretation |
|---|---|
| Volume/errors | 312 access records overall; one predates the filter. Post-release: 9 HTTP 200, 257 HTTP 201, 45 HTTP 400; no 422/5xx observed. |
| Response time | All requests: mean 1.752, P50 1.5, P95 2.6, max 18.5 ms. Refund attempts: mean 1.856, P50 1.7, P95 2.3, max 18.5 ms. P95 uses nearest rank. |
| Refund denominator | 151 attempts -> 106 HTTP 201 and 45 HTTP 400 (29.80%). DB post-release rows: 81 APPROVED, 25 REQUESTED, no REJECTED; HTTP denials are not stored as rejected refunds. |
| Full DB | 12 customers, 171 orders, 108 refunds, 106 audit events, 81 queued notifications. Whole-history refunds: 82 approved, 25 pending, one historical rejected. Queue rows do not prove e-mail delivery. |
| R1: VIP adoption | Six normalized VIPs (four `VIP`, one `vip`, one `VIP `), five STANDARD, one NULL. Successful VIP 31-60-day uptake: **Needs confirmation**; correlated query was denied, not retried. Policy evidence: `app/services/refund_policy.py:38`. |
| R2: reason adoption | 86/106 new refund rows contain reasons; 20 NULL (16 approved, four pending). Counts agree with 20 compatibility warnings; exact client-to-row attribution was not independently joined. Two older rows are outside this denominator. |
| R3: approval control | Pending status holds KRW 45,000,000 across 25 rows. Per-request threshold/decision-time and external payout integrity: **Needs confirmation**; no unverified claim of money movement. Evidence: `docs/architecture.md:8`. |
| Warning anomaly | 20 structured warnings, all ShopFlowMobile/3.1, with 20 unique refund IDs; no intrinsic timestamps. Consistent with grace-path use, not evidence of a sustained surge. |
| Privacy | Zero e-mail and Korean phone-pattern matches in app.log, uvicorn.out and audit_log. Regex-only check: not proof that all possible PII is absent; no raw matches/customer data printed. |
| Diagnostic limitation | Access records lack business error codes, so HTTP 400 reasons cannot be independently classified. User terminal output reported WINDOW_EXPIRED; server-side attribution remains **Needs confirmation**. Evidence: `app/main.py:44`. |

## Client comparison (refund attempts only)
| User-Agent | Attempts | HTTP 201 | HTTP 400 | 4xx rate | P95 / max ms |
|---|---|---|---|---|---|
| ShopFlowMobile/3.1 | 34 | 20 | 14 | 41.18% | 3.0 / 18.5 |
| ShopFlowMobile/3.3 | 29 | 23 | 6 | 20.69% | 2.1 / 2.1 |
| ShopFlowWeb/2.4 | 87 | 62 | 25 | 28.74% | 2.2 / 3.4 |
| smoke-test/1.0 | 1 | 1 | 0 | 0% | 3.3 / 3.3 |

Mobile 3.2 was not observed. Higher 3.1 errors do not establish a reason-input regression; no 422 occurred. Client-specific approved/pending splits remain unverified because the correlated SQL batch was denied.

## Recorded refund reasons (post-release rows)
| Reason | Approved | Pending |
|---|---|---|
| Wrong size | 6 | 4 |
| Change of mind | 11 | 3 |
| Delivery delay | 16 | 4 |
| Defective product | 8 | 3 |
| Color differs from photo | 12 | 4 |
| Duplicate order | 11 | 3 |
| Not collected | 16 | 4 |
| Smoke test | 1 | 0 |

## Conclusions and human decisions
| Category | Recommendation |
|---|---|
| Act now | Assign authorized admins to triage the 25 pending refunds/KRW 45 million via the console; do not bulk-auto-approve. Ask the owner to review the denied query before treating missing adoption/attribution metrics as verified. |
| Monitor | Track 4xx by client, pending age and legacy warning volume through the cutoff. Short synthetic traffic and timestamp-free warnings cannot establish a baseline trend. |
| Business decision needed | Name backlog owner/turnaround; choose the legacy-upgrade communication date before 2026-12-01; confirm the NULL-tier customer's entitlement. No extension/change to the approved exception is proposed. |

## Evidence commands / queries
Metadata: `readlink .deploy/production/current`; `stat -f '%N | %z bytes | modified %Sm' -t '%Y-%m-%dT%H:%M:%S%z' .deploy/production/logs/app.log .deploy/production/logs/uvicorn.out .deploy/production/data/orders.db`.
DB statements executed with `sqlite3 -readonly -header -column .deploy/production/data/orders.db "<SQL>"`:
```sql
SELECT datetime('now') AS snapshot_utc;
SELECT version, applied_at FROM schema_migrations ORDER BY version;
SELECT (SELECT COUNT(*) FROM customers) AS customers, (SELECT COUNT(*) FROM orders) AS orders, (SELECT COUNT(*) FROM refunds) AS refunds, (SELECT COUNT(*) FROM audit_log) AS audit_events, (SELECT COUNT(*) FROM notifications) AS queued_notifications;
SELECT status, COUNT(*) AS refunds, SUM(amount) AS total_krw FROM refunds GROUP BY status;
SELECT status, COUNT(*) AS refunds, SUM(amount) AS total_krw, SUM(reason IS NULL) AS missing_reason FROM refunds WHERE requested_at >= '2026-10-20T00:48:39+00:00' GROUP BY status;
SELECT CASE WHEN reason IS NULL THEN '[not collected]' WHEN reason IN ('Wrong size','Change of mind','Delivery delay','Defective product','Color differs from photo','Duplicate order','Smoke test') THEN reason ELSE '[other text withheld]' END AS reason_category, status, COUNT(*) AS refunds FROM refunds WHERE requested_at >= '2026-10-20T00:48:39+00:00' GROUP BY reason_category,status ORDER BY reason_category,status;
SELECT quote(tier) AS raw_tier, COUNT(*) AS customers FROM customers GROUP BY tier;
```
Log/warning/privacy evidence was produced by `.venv/bin/python - <<'PY'` with the following body (close with `PY`):
```python
import json, math, re, statistics, subprocess
from collections import Counter
from pathlib import Path
sources={n:Path('.deploy/production/logs/'+n).read_text() for n in ['app.log','uvicorn.out']}
all_rows=[json.loads(s) for s in sources['app.log'].splitlines()]
post=[r for r in all_rows if r['ts']>='2026-10-20T00:48:39+00:00']
refunds=[r for r in post if r['method']=='POST' and re.fullmatch(r'/orders/\d+/refund',r['path'])]
print('scope',len(all_rows),min(r['ts'] for r in all_rows),max(r['ts'] for r in all_rows),'post',min(r['ts'] for r in post),max(r['ts'] for r in post))
for name,items in [('post',post),('refunds',refunds)]+[(c,[r for r in refunds if r['client']==c]) for c in sorted({r['client'] for r in refunds})]:
    ms=sorted(r['ms'] for r in items); n=len(items); errors=sum(400<=r['status']<500 for r in items)
    print(name,json.dumps({'n':n,'statuses':dict(Counter(r['status'] for r in items)),'4xx_pct':round(100*errors/n,2),'5xx':sum(r['status']>=500 for r in items),'mean_ms':round(statistics.mean(ms),3),'p50_ms':statistics.median(ms),'p95_ms':ms[math.ceil(.95*n)-1],'max_ms':max(ms)}))
warnings=[json.loads(s[s.find('{'):]) for s in sources['uvicorn.out'].splitlines() if '"event": "legacy_reason_omitted"' in s]
print('warnings',len(warnings),dict(Counter(w['client_version'] for w in warnings)), 'unique_refunds',len({w['refund_id'] for w in warnings}),'timestamped',sum('ts' in w for w in warnings))
sources['audit_log']=subprocess.run(['sqlite3','-readonly','-json','.deploy/production/data/orders.db','SELECT id,at,actor,action,detail FROM audit_log'],capture_output=True,text=True,check=True).stdout
patterns={'email':r'(?<![\w.+-])[\w.+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b','phone':r'(?<!\d)(?:\+82[- .]?(?:10|2|[3-6]\d)|0(?:1[016789]|2|[3-6]\d))[- .]?\d{3,4}[- .]?\d{4}(?!\d)'}
for name,text in sources.items(): print('privacy',name,{k:len(re.findall(p,text)) for k,p in patterns.items()})
```
