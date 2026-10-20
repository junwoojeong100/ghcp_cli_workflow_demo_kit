#!/usr/bin/env python3
"""Builds the video, clips, posters and stills from the final recording (cast).

Language: DEMO_LANG=en (default) | ko. Inputs come from runs/<lang>/, outputs go to video/<lang>/.

Usage:
  make_assets.py render      # render the main video (incl. the 'images' markers) + step clips/posters
  make_assets.py stills      # screenshots (PNG) used by the slides
  make_assets.py clips       # re-cut the step clips/posters from main.mp4 only
  make_assets.py guard       # render the guardrail-demo video (guard.mp4) + poster
  make_assets.py concat      # title card + main + guardrail demo + ending card -> one MP4 with chapters
  make_assets.py slideclips [--src DIR] [--out DIR]
                             # slide clips/posters: crop the header off the full-screen clips so the terminal text is larger (input of the deck build)
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

SESS = Path(__file__).resolve().parents[1]  # production-source/
TOOLS = SESS / "tools"
RENDER = TOOLS / "render"
LANG = os.environ.get("DEMO_LANG", "en").lower()
if LANG not in ("en", "ko"):
    sys.exit(f"Unsupported DEMO_LANG={LANG} (use en or ko)")
RUN = SESS / "runs" / LANG / "final"
GUARD_RUN = SESS / "runs" / LANG / ("guard2" if LANG == "ko" else "guard")
VIDEO = SESS / "video" / LANG
SHOTS = SESS / "shots" / LANG
# Published deliverables at the kit root: English at video/, Korean at ko/video/
KIT_VIDEO = SESS.parent / ("ko" if LANG == "ko" else "") / "video"
TEXT = {
    "en": {
        "stage7": "Operate",
        "before": "Before · v1.0.0", "after": "After · v1.1.0",
        "cap_customer": "Customer view — VIP Seoyun Han refunds a 45-day-old order: rejected before, accepted now (reason field added)",
        "cap_admin": "Admin console — refunds over ₩1,000,000 now show as 'Pending approval' and are not refunded until approved",
        "clip_names": {"stage1": "01_analysis", "stage2": "02_design", "stage3": "03_implementation", "stage4": "04_testing",
                       "stage5": "05_review", "stage6": "06_deployment", "stage7": "07_operations", "guard": "08_guardrail_demo"},
        "chapters": {1: "1 Analyze · change-analyst", 2: "2 Design · solution-architect (human decision · approval ①)", 3: "3 Build · app-developer",
                     4: "4 Test · qa-engineer", 5: "5 Review · code-reviewer (human approval ②)", 6: "6 Deploy · release-manager (human approval ③)",
                     7: "7 Operate · ops-analyst"},
        "ch_title": "Title", "ch_result": "Result screens · Before / After", "ch_guard": "Guardrail demo · an AI that does not know the rules", "ch_end": "Wrap-up",
        "meta_title": "GitHub Copilot CLI x Custom Agent - From requirement to operations demo",
    },
    "ko": {
        "stage7": "운영",
        "before": "Before · 변경 전 (v1.0.0)", "after": "After · 변경 후 (v1.1.0)",
        "cap_customer": "고객 화면 — VIP 한서윤님의 45일 경과 주문 환불: 이전에는 거절, 이제 접수됩니다 (사유 입력란 추가)",
        "cap_admin": "관리자 콘솔 — 100만원 초과 환불이 '승인 대기'로 표시되고, 승인 전에는 환불되지 않습니다",
        "clip_names": {"stage1": "01_분석", "stage2": "02_설계", "stage3": "03_구현", "stage4": "04_테스트",
                       "stage5": "05_리뷰", "stage6": "06_배포", "stage7": "07_운영", "guard": "08_안전장치_시연"},
        "chapters": {1: "1 분석 · change-analyst", 2: "2 설계 · solution-architect (사람 결정·승인 ①)", 3: "3 구현 · app-developer",
                     4: "4 테스트 · qa-engineer", 5: "5 리뷰 · code-reviewer (사람 승인 ②)", 6: "6 배포 · release-manager (사람 승인 ③)",
                     7: "7 운영 · ops-analyst"},
        "ch_title": "타이틀", "ch_result": "결과 화면 · Before / After", "ch_guard": "안전장치 시연 · 규칙을 모르는 AI", "ch_end": "정리",
        "meta_title": "GitHub Copilot CLI x Custom Agent - 요건에서 운영까지 데모",
    },
}[LANG]
CAST = RUN / "final.cast"
FFMPEG = shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"


def sh(cmd, **kw):
    print("$", cmd if isinstance(cmd, str) else " ".join(cmd))
    return subprocess.run(cmd, shell=isinstance(cmd, str), check=True, **kw)


def build_cast_with_images() -> Path:
    """Appends the 'result screens (before/after)' images markers to the end of the main cast."""
    out = RUN / "final_with_images.cast"
    lines = CAST.read_text(encoding="utf-8").splitlines()
    last_t = 0.0
    for ln in lines[1:]:
        try:
            ev = json.loads(ln)
            last_t = max(last_t, ev[0])
        except Exception:
            pass
    t = last_t + 0.2
    markers = [
        {"k": "stage", "id": 7, "label": TEXT["stage7"], "agent": "ops-analyst"},
        {"k": "images", "sec": 9, "items": [
            {"src": str(SHOTS / "crop-before-customer.png"), "label": TEXT["before"]},
            {"src": str(SHOTS / "crop-after-customer.png"), "label": TEXT["after"]}],
         "caption": TEXT["cap_customer"]},
        {"k": "images", "sec": 8, "fit": "content", "items": [
            {"src": str(SHOTS / "crop-before-admin.png"), "label": TEXT["before"]},
            {"src": str(SHOTS / "crop-after-admin.png"), "label": TEXT["after"]}],
         "caption": TEXT["cap_admin"]},
        {"k": "caption", "text": ""},
    ]
    with out.open("w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
        for m in markers:
            fh.write(json.dumps([round(t, 3), "m", json.dumps(m, ensure_ascii=False)], ensure_ascii=False) + "\n")
            t += 0.05
    return out


def render_main():
    cast = build_cast_with_images() if (SHOTS / "after-customer.png").exists() else CAST
    sh(f'cd "{RENDER}" && node render.js --cast "{cast}" --out "{VIDEO}/main.mp4"')
    return clips()


def clips():
    """Cuts the step clips/posters out of main.mp4 (merges spans of the same stage, excludes the result-screen overlay)."""
    tl = json.loads((VIDEO / "main.mp4.timeline.json").read_text(encoding="utf-8"))
    img_starts = [sg["videoStart"] for sg in tl["segments"] if sg.get("kind") == "images"]
    cap = min(img_starts) if img_starts else None
    spans = {}
    for st in tl["stages"]:
        a, b = spans.get(st["id"], (st["videoStart"], st["videoEnd"]))
        spans[st["id"]] = (min(a, st["videoStart"]), max(b, st["videoEnd"]))
    for n, (vs, ve) in sorted(spans.items()):
        if cap and vs < cap < ve:
            ve = cap
        sh([FFMPEG, "-v", "error", "-y", "-ss", f"{vs:.3f}", "-to", f"{ve:.3f}", "-i", str(VIDEO / "main.mp4"), "-an",
            "-c:v", "libx264", "-preset", "medium", "-crf", "24", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            str(VIDEO / f"clip-stage{n}.mp4")])
        poster_t = max(vs, ve - 2.5)
        sh([FFMPEG, "-v", "error", "-y", "-ss", f"{poster_t:.3f}", "-i", str(VIDEO / "main.mp4"), "-frames:v", "1",
            "-vf", "scale=1280:-1", str(VIDEO / f"poster-stage{n}.png")])
    return tl


def guard():
    """Renders the guardrail-demo video (guard.mp4) and the poster used by the slides."""
    sh(f'cd "{RENDER}" && node render.js --cast "{GUARD_RUN}/{GUARD_RUN.name}.cast" --out "{VIDEO}/guard.mp4"')
    sh([FFMPEG, "-v", "error", "-y", "-ss", "27", "-i", str(VIDEO / "guard.mp4"), "-frames:v", "1", "-vf", "scale=1280:-1",
        str(VIDEO / "poster-guard.png")])


def stills():
    marks = json.loads((RUN / "final.cast.marks.json").read_text(encoding="utf-8"))
    handler = {}
    for m in marks:
        if m.get("kind") == "auto_handler":
            handler.setdefault(m["name"], []).append(m["t"])
    spec = []
    for key, name in (("decision", "decision"), ("gate-design", "gate-design"), ("gate-code", "gate-code"), ("gate-prod", "gate-prod")):
        for i, t in enumerate(handler.get(key, [])[:3], 1):
            spec.append({"name": f"{name}-{i}", "real": round(t + 2.5, 2)})
    for n in range(1, 8):
        spec.append({"name": f"stage{n}-end", "end_of_stage": n})
    (RUN / "stills-spec.json").write_text(json.dumps(spec, ensure_ascii=False, indent=1), encoding="utf-8")
    sh(f'cd "{RENDER}" && node render.js --cast "{CAST}" --stills-json "{RUN}/stills-spec.json" --out-dir "{VIDEO}/stills" --terminal-only')


def concat():
    parts = []
    for name, dur in (("card-title", 4), ("main", None), ("guard", None), ("card-end", 5)):
        if dur:
            seg = VIDEO / f"seg-{name}.mp4"
            sh([FFMPEG, "-v", "error", "-y", "-loop", "1", "-t", str(dur), "-i", str(VIDEO / f"{name}.png"), "-vf",
                f"fade=t=in:st=0:d=0.6,fade=t=out:st={dur-0.6}:d=0.6,format=yuv420p,fps=30", "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p", str(seg)])
            parts.append(seg)
        else:
            parts.append(VIDEO / f"{name}.mp4")
    lst = VIDEO / "concat.txt"
    lst.write_text("\n".join(f"file '{p}'" for p in parts) + "\n", encoding="utf-8")
    out = VIDEO / f"GHCP_CLI_Workflow_Demo_{LANG.upper()}.mp4"
    raw = VIDEO / "concat-raw.mp4"
    sh([FFMPEG, "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c:v", "libx264", "-crf", "20", "-preset", "medium",
        "-pix_fmt", "yuv420p", "-r", "30", "-movflags", "+faststart", str(raw)])
    add_chapters(raw, out)
    raw.unlink()


# Slide crop: cut the header (title + step tracker) and the outer margin off the video, leaving the terminal window plus the bottom caption/banner (1920x1080 -> 1880x968).
# The slide already carries the header information, and the 10% lower frame lets the video be wider (= the terminal text larger) at the same slide height.
SLIDE_CROP = "crop=1880:968:20:92"
KIT_CLIP_NAMES = TEXT["clip_names"]


def slideclips():
    """Makes the slide clips and posters from the step clips (clip-stageN.mp4, guard.mp4 — or the published clips under the kit's video/clips).
    Output: slide-stageN.mp4 · slide-poster-stageN.png · slide-guard.mp4 · slide-poster-guard.png (default: production-source/video/<lang>)"""
    ap = argparse.ArgumentParser(prog="make_assets.py slideclips")
    ap.add_argument("--src", default=None, help="source clips folder (default: production-source/video/<lang>, else the published clips at the kit root)")
    ap.add_argument("--out", default=str(VIDEO), help="output folder")
    a = ap.parse_args(sys.argv[2:])
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    kit_clips = KIT_VIDEO / "clips"
    for key, kit_name in KIT_CLIP_NAMES.items():
        raw = "guard.mp4" if key == "guard" else f"clip-{key}.mp4"
        cands = [Path(a.src) / raw] if a.src else [VIDEO / raw, kit_clips / f"{kit_name}.mp4"]
        src = next((c for c in cands if c.exists()), None)
        if src is None:
            sys.exit(f"Source clip not found: {' or '.join(map(str, cands))}")
        dst = out / f"slide-{key}.mp4"
        sh([FFMPEG, "-v", "error", "-y", "-i", str(src), "-an", "-vf", SLIDE_CROP, "-c:v", "libx264", "-preset", "slow", "-crf", "23",
            "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.0", "-movflags", "+faststart", str(dst)])
        poster_t = 27.0 if key == "guard" else max(0.0, duration(dst) - 2.5)
        sh([FFMPEG, "-v", "error", "-y", "-ss", f"{poster_t:.3f}", "-i", str(dst), "-frames:v", "1", str(out / f"slide-poster-{key}.png")])


def duration(path):
    r = subprocess.run([FFMPEG.replace("ffmpeg", "ffprobe"), "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                       capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


def add_chapters(src, dst):
    """Adds chapters (title -> 7 stages -> result screens -> guardrail demo -> wrap-up) as MP4 metadata (jumpable in QuickTime/VLC)."""
    tl = json.loads((VIDEO / "main.mp4.timeline.json").read_text(encoding="utf-8"))
    first = {}
    for st in tl["stages"]:
        first.setdefault(st["id"], st["videoStart"])
    img = min(sg["videoStart"] for sg in tl["segments"] if sg.get("kind") == "images")
    title_len, main_len, guard_len, end_len = 4.0, duration(VIDEO / "main.mp4"), duration(VIDEO / "guard.mp4"), 5.0
    total = title_len + main_len + guard_len + end_len
    labels = TEXT["chapters"]
    ch = [(0.0, TEXT["ch_title"]), (title_len, labels[1])]
    ch += [(first[i] + title_len, labels[i]) for i in range(2, 8)]
    ch += [(img + title_len, TEXT["ch_result"]), (title_len + main_len, TEXT["ch_guard"]), (total - end_len, TEXT["ch_end"])]
    lines = [";FFMETADATA1", f"title={TEXT['meta_title']}", ""]
    for i, (t, name) in enumerate(ch):
        end = ch[i + 1][0] if i + 1 < len(ch) else total
        lines += ["[CHAPTER]", "TIMEBASE=1/1000", f"START={int(t * 1000)}", f"END={int(end * 1000)}", f"title={name}", ""]
    meta = VIDEO / "chapters.txt"
    meta.write_text("\n".join(lines), encoding="utf-8")
    sh([FFMPEG, "-v", "error", "-y", "-i", str(src), "-i", str(meta), "-map", "0", "-map_metadata", "1", "-map_chapters", "1",
        "-c", "copy", "-movflags", "+faststart", str(dst)])


if __name__ == "__main__":
    {"render": render_main, "clips": clips, "guard": guard, "stills": stills, "concat": concat, "slideclips": slideclips}[sys.argv[1]]()
