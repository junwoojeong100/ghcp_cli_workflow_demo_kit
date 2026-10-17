#!/usr/bin/env python3
"""최종 녹화(cast)에서 영상·클립·포스터·스틸을 만든다.

사용:
  make_assets.py render      # 메인 영상 렌더 (images 마커 포함) + 클립/포스터 생성
  make_assets.py stills      # 슬라이드용 스틸(PNG) 생성
  make_assets.py clips       # main.mp4에서 단계별 클립·포스터만 다시 자르기
  make_assets.py guard       # 안전장치 시연 영상(guard.mp4) + 포스터 렌더
  make_assets.py concat      # 타이틀 + 메인 + 안전장치 + 엔딩 이어붙이기
  make_assets.py slideclips [--src DIR] [--out DIR]
                             # 슬라이드용 클립·포스터: 전체 화면 클립에서 상단 헤더를 잘라내 터미널 글자를 크게 (PPT 빌드 입력)
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

SESS = Path(__file__).resolve().parents[1]  # production-source/
TOOLS = SESS / "tools"
RENDER = TOOLS / "render"
RUN = SESS / "runs" / "final"
VIDEO = SESS / "video"
SHOTS = SESS / "shots"
CAST = RUN / "final.cast"
FFMPEG = shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"


def sh(cmd, **kw):
    print("$", cmd if isinstance(cmd, str) else " ".join(cmd))
    return subprocess.run(cmd, shell=isinstance(cmd, str), check=True, **kw)


def build_cast_with_images() -> Path:
    """메인 cast 끝에 '결과 화면(before/after)' images 마커를 덧붙인다."""
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
        {"k": "stage", "id": 7, "label": "운영", "agent": "ops-analyst"},
        {"k": "images", "sec": 9, "items": [
            {"src": str(SHOTS / "crop-before-customer.png"), "label": "Before · 변경 전 (v1.0.0)"},
            {"src": str(SHOTS / "crop-after-customer.png"), "label": "After · 변경 후 (v1.1.0)"}],
         "caption": "고객 화면 — VIP 한서윤님의 45일 경과 주문 환불: 이전에는 거절, 이제 접수됩니다 (사유 입력란 추가)"},
        {"k": "images", "sec": 8, "fit": "content", "items": [
            {"src": str(SHOTS / "crop-before-admin.png"), "label": "Before · 변경 전 (v1.0.0)"},
            {"src": str(SHOTS / "crop-after-admin.png"), "label": "After · 변경 후 (v1.1.0)"}],
         "caption": "관리자 콘솔 — 100만원 초과 환불이 '승인 대기'로 표시되고, 승인 전에는 환불되지 않습니다"},
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
    """main.mp4에서 단계별 클립·포스터를 자른다 (같은 단계 구간은 합치고, 결과 화면 오버레이 구간은 제외)."""
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
    """안전장치 시연 영상(guard.mp4)과 슬라이드용 포스터를 만든다."""
    sh(f'cd "{RENDER}" && node render.js --cast "{SESS}/runs/guard2/guard2.cast" --out "{VIDEO}/guard.mp4"')
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
    out = VIDEO / "GHCP_CLI_Workflow_Demo_KO.mp4"
    raw = VIDEO / "concat-raw.mp4"
    sh([FFMPEG, "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c:v", "libx264", "-crf", "20", "-preset", "medium",
        "-pix_fmt", "yuv420p", "-r", "30", "-movflags", "+faststart", str(raw)])
    add_chapters(raw, out)
    raw.unlink()


# 슬라이드용 크롭: 영상 상단 헤더(제목·단계 트래커)와 바깥 여백을 잘라 터미널 창 + 하단 캡션/배너만 남긴다 (1920x1080 → 1880x968).
# 헤더는 슬라이드가 이미 갖고 있는 정보라 필요 없고, 높이가 10% 줄어 같은 슬라이드 높이에서 영상을 더 넓게(=글자를 더 크게) 놓을 수 있다.
SLIDE_CROP = "crop=1880:968:20:92"
KIT_CLIP_NAMES = {"stage1": "01_분석", "stage2": "02_설계", "stage3": "03_구현", "stage4": "04_테스트",
                  "stage5": "05_리뷰", "stage6": "06_배포", "stage7": "07_운영", "guard": "08_안전장치_시연"}


def slideclips():
    """단계별 클립(clip-stageN.mp4, guard.mp4 — 없으면 키트의 video/clips/*.mp4)에서 슬라이드용 클립과 포스터를 만든다.
    출력: slide-stageN.mp4 · slide-poster-stageN.png · slide-guard.mp4 · slide-poster-guard.png (기본 위치: production-source/video)"""
    ap = argparse.ArgumentParser(prog="make_assets.py slideclips")
    ap.add_argument("--src", default=None, help="원본 클립 폴더 (기본: production-source/video, 없으면 ../video/clips)")
    ap.add_argument("--out", default=str(VIDEO), help="출력 폴더")
    a = ap.parse_args(sys.argv[2:])
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    kit_clips = SESS.parent / "video" / "clips"
    for key, kit_name in KIT_CLIP_NAMES.items():
        raw = "guard.mp4" if key == "guard" else f"clip-{key}.mp4"
        cands = [Path(a.src) / raw] if a.src else [VIDEO / raw, kit_clips / f"{kit_name}.mp4"]
        src = next((c for c in cands if c.exists()), None)
        if src is None:
            sys.exit(f"원본 클립을 찾을 수 없습니다: {' 또는 '.join(map(str, cands))}")
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
    """타이틀 → 7단계 → 결과 화면 → 안전장치 시연 → 정리 챕터를 MP4 메타데이터로 넣는다 (QuickTime/VLC에서 점프 가능)."""
    tl = json.loads((VIDEO / "main.mp4.timeline.json").read_text(encoding="utf-8"))
    first = {}
    for st in tl["stages"]:
        first.setdefault(st["id"], st["videoStart"])
    img = min(sg["videoStart"] for sg in tl["segments"] if sg.get("kind") == "images")
    title_len, main_len, guard_len, end_len = 4.0, duration(VIDEO / "main.mp4"), duration(VIDEO / "guard.mp4"), 5.0
    total = title_len + main_len + guard_len + end_len
    labels = {1: "1 분석 · change-analyst", 2: "2 설계 · solution-architect (사람 결정·승인 ①)", 3: "3 구현 · app-developer",
              4: "4 테스트 · qa-engineer", 5: "5 리뷰 · code-reviewer (사람 승인 ②)", 6: "6 배포 · release-manager (사람 승인 ③)",
              7: "7 운영 · ops-analyst"}
    ch = [(0.0, "타이틀"), (title_len, labels[1])]
    ch += [(first[i] + title_len, labels[i]) for i in range(2, 8)]
    ch += [(img + title_len, "결과 화면 · Before / After"), (title_len + main_len, "안전장치 시연 · 규칙을 모르는 AI"), (total - end_len, "정리")]
    lines = [";FFMETADATA1", "title=GitHub Copilot CLI x Custom Agent - 요건에서 운영까지 데모", ""]
    for i, (t, name) in enumerate(ch):
        end = ch[i + 1][0] if i + 1 < len(ch) else total
        lines += ["[CHAPTER]", "TIMEBASE=1/1000", f"START={int(t * 1000)}", f"END={int(end * 1000)}", f"title={name}", ""]
    meta = VIDEO / "chapters.txt"
    meta.write_text("\n".join(lines), encoding="utf-8")
    sh([FFMPEG, "-v", "error", "-y", "-i", str(src), "-i", str(meta), "-map", "0", "-map_metadata", "1", "-map_chapters", "1",
        "-c", "copy", "-movflags", "+faststart", str(dst)])


if __name__ == "__main__":
    {"render": render_main, "clips": clips, "guard": guard, "stills": stills, "concat": concat, "slideclips": slideclips}[sys.argv[1]]()
