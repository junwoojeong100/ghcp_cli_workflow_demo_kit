#!/usr/bin/env python3
"""데모 전체(분석→설계→구현→테스트→리뷰→배포→운영)를 한 세션으로 녹화하는 steps.json 생성기.

사용: make_steps.py --out steps_full.json [--from-stage 1] [--to-stage 7] [--speed 8]
사람이 하는 행동(에이전트 선택, 프롬프트 입력, 결정 선택, 승인)을 사람처럼 수행하고,
각 지점에 영상용 마커(단계·자막·승인 배너·배속)를 심는다.
"""
import argparse
import json

SPEED = 8
STAGES = [
    {"id": 1, "label": "분석"}, {"id": 2, "label": "설계"}, {"id": 3, "label": "구현"},
    {"id": 4, "label": "테스트"}, {"id": 5, "label": "리뷰"}, {"id": 6, "label": "배포"}, {"id": 7, "label": "운영"},
]
D1_TEXT = "구앱(3.1~3.3)은 2026-12-01까지 사유 누락을 허용하고 경고 로그를 남기며, 이후 필수로 전환한다"

PROMPTS = {
    1: "CR-2026-014 변경 요청서(docs/requirements/CR-2026-014.md)의 영향도를 분석해줘.",
    2: "분석서를 바탕으로 설계해줘. 결정이 필요한 건 나에게 물어봐줘.",
    3: "승인된 설계대로 구현해줘.",
    4: "구현된 변경을 검증하는 테스트를 작성하고 실행해줘.",
    5: "변경 사항을 리뷰해줘. 문제가 없으면 코드 승인을 요청해줘.",
    6: "main에 병합하고 staging에 배포해서 검증한 뒤, 운영 배포까지 진행해줘.",
    7: "운영 환경 로그와 DB를 분석해서 운영 리포트를 작성해줘.",
}
AGENTS = {
    1: "change-analyst", 2: "solution-architect", 3: "app-developer", 4: "qa-engineer",
    5: "code-reviewer", 6: "release-manager", 7: "ops-analyst",
}
CAPTION_START = {
    1: "현업의 변경 요청서를 '변경 분석가' 에이전트에게 맡깁니다",
    2: "'설계자' 에이전트가 설계하고, 중요한 결정은 사람에게 묻습니다",
    3: "'개발자' 에이전트가 승인된 설계 그대로 구현합니다",
    4: "'테스터' 에이전트가 개발자와 독립적으로 검증합니다",
    5: "'리뷰어' 에이전트가 설계·사내 표준·보안을 점검합니다",
    6: "'배포 관리자' 에이전트가 병합 → staging 배포 → 운영 배포를 준비합니다",
    7: "'운영 분석가' 에이전트가 운영 로그와 DB를 읽기 전용으로 분석합니다",
}
CAPTION_WORK = {
    1: "코드·문서·실제 데이터를 직접 읽고 영향 범위를 찾는 중 (대기 시간은 배속 처리)",
    2: "분석서와 사내 표준을 읽고 설계안을 만드는 중 (대기 시간은 배속 처리)",
    3: "DB 마이그레이션 · 업무 규칙 · 화면 · 이메일 문구를 수정하는 중 (배속)",
    4: "요구사항별 경계값 테스트를 작성하고 실행하는 중 (배속)",
    5: "변경분을 설계서·보안 점검표와 대조하는 중 (배속)",
    6: "병합 · 릴리스 계획 · staging 배포 · 스모크 테스트 (배속)",
    7: "운영 로그와 DB를 집계하는 중 (배속)",
}
CAPTION_DONE = {
    1: "분석 완료 — 영향 범위 · 데이터 이상 · 결정 필요 사항을 요약했습니다",
    2: "설계 승인 완료 — 이제부터 코드 수정이 허용됩니다",
    3: "구현 완료 — 변경 내용은 커밋으로 남았습니다",
    4: "테스트 완료 — 요구사항별 추적표가 포함된 리포트가 생성되었습니다",
    5: "리뷰 완료 — 사람이 코드 승인을 마쳤습니다",
    6: "운영 배포 완료 — 롤백 방법도 준비되어 있습니다",
    7: "운영 리포트 완료 — 현업이 결정할 사항이 정리되었습니다",
}

ARTIFACT = {
    1: "docs/cr/CR-2026-014/01-impact-analysis.md", 2: "approvals/CR-2026-014/design.json",
    3: "docs/cr/CR-2026-014/03-implementation-notes.md", 4: "docs/cr/CR-2026-014/04-test-report.md",
    5: "approvals/CR-2026-014/code.json", 6: "approvals/CR-2026-014/production.json", 7: "docs/cr/CR-2026-014/07-ops-report.md",
}

GENERIC_PERMISSION = {
    "name": "unexpected-permission", "pattern": "(?s)^(?!.*Hook permission request).*Do you want to allow",
    "snapshot": "unexpected-permission", "settle": 0.6, "hold": 2.0, "keys": ["Enter"], "max": 6,
}


def mk(data):
    return {"op": "mark", "data": data}


def gate_handler(name, pattern, label, text, caption_after):
    return {
        "name": name, "pattern": pattern, "snapshot": name, "settle": 0.8, "hold": 7.0, "keys": ["Enter"], "max": 1,
        "pre_marks": [{"k": "speed", "x": 1}, {"k": "gate", "label": label, "text": text}],
        "post_marks": [{"k": "gate_end"}, {"k": "caption", "text": caption_after}, {"k": "speed", "x": SPEED}],
    }


def choice_handler():
    return {
        "name": "decision", "pattern": "Copilot needs information", "anchor": "Copilot needs information", "snapshot": "decision", "settle": 0.8, "hold": 6.0, "max": 6,
        "pre_marks": [{"k": "speed", "x": 1}, {"k": "gate", "label": "사람이 결정합니다", "text": "AI가 선택지와 추천안을 제시하고, 결정은 사람이 합니다"}],
        "rules": [
            {"if": "구버전|구앱|모바일", "once": True, "select": "Other \\(type", "text": D1_TEXT},
            {"keys": ["Enter"]},
        ],
        "post_marks": [{"k": "gate_end"}, {"k": "caption", "text": CAPTION_WORK[2]}, {"k": "speed", "x": SPEED}],
    }


def handlers_for(stage):
    common = [GENERIC_PERMISSION]
    if stage == 2:
        return [
            gate_handler("gate-design", "(?s)Hook permission request.*설계 승인", "① 설계 승인",
                         "시스템이 승인을 요구합니다 · 승인 후 설계서가 바뀌면 자동 무효", CAPTION_DONE[2]),
            choice_handler(),
        ] + common
    if stage == 5:
        return [
            gate_handler("gate-code", "(?s)Hook permission request.*코드 승인", "② 코드 승인",
                         "승인한 코드와 해시가 일치하는 코드만 배포할 수 있습니다", CAPTION_DONE[5]),
            choice_handler(),
        ] + common
    if stage == 6:
        return [
            gate_handler("gate-prod", "(?s)Hook permission request.*운영 배포 승인", "③ 운영 배포 승인",
                         "운영 환경은 사람이 승인해야만 배포됩니다 (Hook 이 강제)", CAPTION_DONE[6]),
            choice_handler(),
        ] + common
    return [choice_handler()] + common


def stage_steps(stage, first):
    steps = [
        mk({"k": "speed", "x": 1}),
        mk({"k": "stage", "id": stage, "label": STAGES[stage - 1]["label"], "agent": AGENTS[stage]}),
        mk({"k": "caption", "text": CAPTION_START[stage]}),
    ]
    if first:
        steps += [
            {"op": "type", "text": "/agent", "cps": 12, "enter": True},
            {"op": "sleep", "seconds": 2.5},
            {"op": "key", "keys": ["Down", "Down"], "delay": 0.8},
            {"op": "sleep", "seconds": 1.5},
            {"op": "key", "keys": ["Enter"]},
            {"op": "sleep", "seconds": 1.5},
        ]
    else:
        steps += [
            {"op": "type", "text": f"/agent {AGENTS[stage]}", "cps": 12, "enter": True},
            {"op": "sleep", "seconds": 2.0},
        ]
    steps += [
        {"op": "type", "text": PROMPTS[stage], "cps": 11, "jitter": 0.25, "enter": True},
        mk({"k": "caption", "text": CAPTION_WORK[stage]}),
        mk({"k": "speed", "x": SPEED}),
        {"op": "auto", "timeout": 1500, "quiet": 9, "handlers": handlers_for(stage)},
        {"op": "expect_file", "path": ARTIFACT[stage], "timeout": 180},
        {"op": "snapshot", "name": f"stage{stage}-done"},
        mk({"k": "speed", "x": 1}),
        mk({"k": "caption", "text": CAPTION_DONE[stage]}),
        mk({"k": "hold", "sec": 6}),
    ]
    return steps


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--from-stage", type=int, default=1)
    ap.add_argument("--to-stage", type=int, default=7)
    ap.add_argument("--speed", type=int, default=8)
    args = ap.parse_args()
    global SPEED
    SPEED = args.speed
    steps = [
        mk({"k": "stages_def", "stages": STAGES}),
        {"op": "wait_for", "pattern": "(?m)^❯", "timeout": 60},
        {"op": "sleep", "seconds": 1.5},
    ]
    for stage in range(args.from_stage, args.to_stage + 1):
        if stage == 7:
            steps += [
                mk({"k": "speed", "x": 1}),
                mk({"k": "stage", "id": 7, "label": "운영", "agent": "ops-analyst"}),
                mk({"k": "caption", "text": "(시연용) 운영 환경에 하루치 환불 트래픽을 흘려보냅니다"}),
                {"op": "type", "text": "!.venv/bin/python scripts/simulate_traffic.py http://127.0.0.1:8100 --count 150", "cps": 14, "enter": True},
                {"op": "sleep", "seconds": 12},
            ]
        steps += stage_steps(stage, first=(stage == args.from_stage and stage == 1))
    steps += [
        {"op": "snapshot", "name": "final"},
        mk({"k": "caption", "text": "화면 하단에서 세션 전체의 AI 사용량(크레딧)을 바로 확인할 수 있습니다"}),
        mk({"k": "hold", "sec": 6}),
        mk({"k": "caption", "text": ""}),
    ]
    json.dump(steps, open(args.out, "w"), ensure_ascii=False, indent=1)
    print(f"steps: {len(steps)} -> {args.out}")


if __name__ == "__main__":
    main()
