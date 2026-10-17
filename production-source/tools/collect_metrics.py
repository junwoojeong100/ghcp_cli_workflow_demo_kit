#!/usr/bin/env python3
"""최종 녹화 결과에서 슬라이드에 넣을 실측 수치를 모아 metrics.json 으로 저장한다."""
import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

SESS = Path(__file__).resolve().parents[1]  # production-source/
ROOT = Path(os.environ.get("SHOPFLOW_ROOT", SESS.parent / "shopflow-orders"))
RUN = SESS / "runs" / "final"
CAST = RUN / "final.cast"
OUT = SESS / "deck" / "metrics.json"


def sh(cmd, cwd=ROOT):
    return subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True).stdout


def aic_from_snapshot(name):
    path = RUN / "final.cast.snapshots" / f"{name}.txt"
    if not path.exists():
        return None
    found = re.findall(r"Session:\s*([\d.]+)\s*AIC used", path.read_text(encoding="utf-8"))
    return float(found[-1]) if found else None


marks = json.loads((RUN / "final.cast.marks.json").read_text(encoding="utf-8"))
stage_start = {}
for m in marks:
    if m.get("kind") == "marker" and m.get("data", {}).get("k") == "stage":
        stage_start.setdefault(m["data"]["id"], {"t": m["t"], "wall": m["wall"], "agent": m["data"].get("agent"), "label": m["data"].get("label")})
end_t = max(m["t"] for m in marks)
end_wall = max(m["wall"] for m in marks)

ids = sorted(stage_start)
stages = []
prev_aic = 0.0
for i, sid in enumerate(ids):
    s = stage_start[sid]
    nxt = stage_start[ids[i + 1]] if i + 1 < len(ids) else {"t": end_t, "wall": end_wall}
    aic = aic_from_snapshot(f"stage{sid}-done")
    stages.append({
        "id": sid, "label": s["label"], "agent": s["agent"],
        "real_s": round(nxt["t"] - s["t"], 1),
        "wall_start": s["wall"], "wall_end": nxt["wall"],
        "aic_cum": aic, "aic": round(aic - prev_aic, 2) if aic is not None else None,
    })
    if aic is not None:
        prev_aic = aic

# 감사 로그: 단계별 도구 호출 수 / 전체 집계
audit = []
for line in (ROOT / ".copilot-audit" / "audit.jsonl").read_text(encoding="utf-8").splitlines():
    try:
        audit.append(json.loads(line))
    except json.JSONDecodeError:
        pass
glob = [a for a in audit if a["role"] == "global"]
for a in glob:
    a["epoch"] = datetime.fromisoformat(a["ts"]).timestamp()
for st in stages:
    st["tool_calls"] = sum(1 for a in glob if st["wall_start"] <= a["epoch"] < st["wall_end"])
audit_summary = {
    "calls": len(glob),
    "allow": sum(1 for a in glob if a["decision"] == "allow"),
    "ask": sum(1 for a in glob if a["decision"] == "ask"),
    "deny": sum(1 for a in audit if a["decision"] == "deny"),
    "denials": [{"role": a["role"], "tool": a["tool"], "target": a["target"][:90], "reason": a.get("reason", "")[:90]} for a in audit if a["decision"] == "deny"],
}

# git
stat = sh("git diff --shortstat baseline..main").strip()
nums = [int(x) for x in re.findall(r"(\d+) (?:file|insertion|deletion)", stat)]
files = re.search(r"(\d+) file", stat)
ins = re.search(r"(\d+) insertion", stat)
dele = re.search(r"(\d+) deletion", stat)
code_stat = sh("git diff --shortstat baseline..main -- app db tests").strip()
cfiles = re.search(r"(\d+) file", code_stat)
cins = re.search(r"(\d+) insertion", code_stat)
cdel = re.search(r"(\d+) deletion", code_stat)
commits = sh("git log --oneline baseline..main").strip().splitlines()
git = {
    "files": int(files.group(1)) if files else 0, "insertions": int(ins.group(1)) if ins else 0, "deletions": int(dele.group(1)) if dele else 0,
    "code_files": int(cfiles.group(1)) if cfiles else 0, "code_insertions": int(cins.group(1)) if cins else 0, "code_deletions": int(cdel.group(1)) if cdel else 0,
    "commits": len(commits), "log": commits[:8],
    "app_files": sh("git diff --name-only baseline..main -- app db").strip().splitlines(),
}

# 테스트
out = sh("./.venv/bin/pytest --cov=app 2>&1 | tail -30")
passed = re.search(r"(\d+) passed", out)
cov = re.search(r"TOTAL\s+\d+\s+\d+\s+(\d+)%", out)
tests = {"baseline": 26, "total": int(passed.group(1)) if passed else None, "coverage": int(cov.group(1)) if cov else None}
tests["added"] = (tests["total"] - 26) if tests["total"] else None

# 승인 기록
approvals = {}
for p in sorted((ROOT / "approvals" / "CR-2026-014").glob("*.json")):
    d = json.loads(p.read_text(encoding="utf-8"))
    approvals[d["gate"]] = {"approver": d.get("approver"), "at": d.get("at"), "hash": (d.get("sha256") or d.get("code_sha256") or "")[:12]}

# 산출물 줄 수
docs = {}
for p in sorted((ROOT / "docs" / "cr" / "CR-2026-014").glob("0*.md")):
    docs[p.name] = len(p.read_text(encoding="utf-8").splitlines())

# 리뷰 지적 수
review = {}
rv = (ROOT / "docs" / "cr" / "CR-2026-014" / "05-review-report.md")
if rv.exists():
    m = re.search(r"Blocker\s*(\d+)\s*/\s*Major\s*(\d+)\s*/\s*Minor\s*(\d+)", rv.read_text(encoding="utf-8"))
    if m:
        review = {"blocker": int(m.group(1)), "major": int(m.group(2)), "minor": int(m.group(3))}

total_aic = stages[-1]["aic_cum"] if stages and stages[-1]["aic_cum"] else None
metrics = {
    "stages": stages,
    "total": {"real_s": round(end_t, 1), "aic": total_aic, "usd": round(total_aic * 0.01, 2) if total_aic else None},
    "git": git, "tests": tests, "approvals": approvals, "audit": audit_summary, "docs": docs, "review": review,
    "version": (ROOT / "VERSION").read_text().strip(),
}
OUT.write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({k: metrics[k] for k in ("total", "git", "tests", "approvals", "audit", "docs", "review", "version")}, ensure_ascii=False, indent=1)[:3500])
for st in stages:
    print(st["id"], st["label"], st["real_s"], "s", st["aic"], "AIC", st["tool_calls"], "calls")
