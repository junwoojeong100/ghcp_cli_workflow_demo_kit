#!/usr/bin/env python3
"""Collects the real outputs of the recorded session into the kit's sample-output/ folder.

Run it right after a recording and BEFORE the next `demo_reset.sh` (a reset deletes these files from the demo repo).
Language: DEMO_LANG=en (default) -> <kit>/sample-output, ko -> <kit>/ko/sample-output (existing folders need --force).
Diff base: BASELINE_REF (default baseline-recorded, or baseline-recorded-ko for ko). Run tools/collect_metrics.py first
so that run-metrics.json can be copied from deck/<lang>/metrics.json.
"""
import argparse
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

SESS = Path(__file__).resolve().parents[1]  # production-source/
KIT = SESS.parent
ROOT = Path(os.environ.get("SHOPFLOW_ROOT", KIT / "shopflow-orders"))
LANG = os.environ.get("DEMO_LANG", "en").lower()
BASELINE = os.environ.get("BASELINE_REF", "baseline-recorded-ko" if LANG == "ko" else "baseline-recorded")
CR = "CR-2026-014"


def sanitize(text):
    """Local absolute paths -> <DEMO_KIT> (kit root) / <HOME> (anything else under the user's home)."""
    text = text.replace(str(KIT), "<DEMO_KIT>")
    text = text.replace(str(KIT.resolve()), "<DEMO_KIT>")
    return re.sub(r"/Users/[^/\"\\\s]+", "<HOME>", text)


def git(*args):
    return subprocess.run(["git", "--no-pager", *args], cwd=ROOT, capture_output=True, text=True, check=True).stdout


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--force", action="store_true", help="overwrite an existing sample-output folder")
    ap.add_argument("--out", help="output folder (default: see above)")
    args = ap.parse_args()

    out = Path(args.out) if args.out else (KIT / "ko" / "sample-output" if LANG == "ko" else KIT / "sample-output")
    keep_readme = None
    if out.exists() and any(p.name != "README.md" for p in out.iterdir()):
        if not args.force:
            sys.exit(f"{out} already has content; use --force to overwrite")
    if out.exists():
        if (out / "README.md").exists():
            keep_readme = (out / "README.md").read_text(encoding="utf-8")
        shutil.rmtree(out)
    out.mkdir(parents=True)
    if keep_readme is not None:
        (out / "README.md").write_text(keep_readme, encoding="utf-8")

    docs_src = ROOT / "docs" / "cr" / CR
    docs_dst = out / f"docs-cr-{CR}"
    docs_dst.mkdir()
    for p in sorted(docs_src.glob("*.md")):
        (docs_dst / p.name).write_text(sanitize(p.read_text(encoding="utf-8")), encoding="utf-8")

    appr_dst = out / "approvals" / CR
    appr_dst.mkdir(parents=True)
    for p in sorted((ROOT / "approvals" / CR).glob("*.json")):
        (appr_dst / p.name).write_text(sanitize(p.read_text(encoding="utf-8")), encoding="utf-8")

    audit = (ROOT / ".copilot-audit" / "audit.jsonl").read_text(encoding="utf-8")
    (out / "audit.jsonl").write_text(sanitize(audit), encoding="utf-8")

    (out / "full-change.diff").write_text(sanitize(git("diff", f"{BASELINE}..main")), encoding="utf-8")
    (out / "git-log-stat.txt").write_text(sanitize(git("log", "--oneline", "--stat", f"{BASELINE}..main")), encoding="utf-8")

    prod_log = ROOT / ".deploy" / "production" / "logs" / "app.log"
    (out / "production-app.log").write_text(sanitize(prod_log.read_text(encoding="utf-8")), encoding="utf-8")

    metrics = SESS / "deck" / LANG / "metrics.json"
    if metrics.exists():
        (out / "run-metrics.json").write_text(sanitize(metrics.read_text(encoding="utf-8")), encoding="utf-8")
    else:
        print("note: deck/%s/metrics.json not found - run tools/collect_metrics.py and re-run this script" % LANG)

    leftovers = [p for p in out.rglob("*") if p.is_file() and re.search(r"/Users/|junwoojeong", p.read_text(encoding="utf-8", errors="ignore"))]
    for p in sorted(out.rglob("*")):
        if p.is_file():
            print(f"{p.relative_to(out)}  ({p.stat().st_size} bytes)")
    if leftovers:
        print("WARNING: local path / user name still present in:", ", ".join(str(p.relative_to(out)) for p in leftovers))


if __name__ == "__main__":
    main()
