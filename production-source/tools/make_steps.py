#!/usr/bin/env python3
"""Generates the step scripts (steps.json) that record the demo as Copilot CLI sessions.

Two scripts, each available in English (default) and Korean:
  --kind full   the whole demo (analysis -> design -> build -> test -> review -> deploy -> operate) as ONE session
  --kind guard  the guardrail demo (agent 'quick-fixer' tries three things the hooks must block)

Usage:
  make_steps.py --lang en --kind full  --out ../runs/en/steps_full.json [--from-stage 1] [--to-stage 7] [--speed 8]
  make_steps.py --lang en --kind guard --out ../runs/en/steps_guard.json

The recorder (record.py) plays these steps like a human would (pick the agent, type the prompt, answer the
questions, approve), and the script plants overlay markers for the video (stage, caption, approval banner, speed).
All language-specific text lives in PACKS below; the flow itself is identical for both languages.
"""
import argparse
import json

AGENTS = {
    1: "change-analyst", 2: "solution-architect", 3: "app-developer", 4: "qa-engineer",
    5: "code-reviewer", 6: "release-manager", 7: "ops-analyst",
}
ARTIFACT = {
    1: "docs/cr/CR-2026-014/01-impact-analysis.md", 2: "approvals/CR-2026-014/design.json",
    3: "docs/cr/CR-2026-014/03-implementation-notes.md", 4: "docs/cr/CR-2026-014/04-test-report.md",
    5: "approvals/CR-2026-014/code.json", 6: "approvals/CR-2026-014/production.json", 7: "docs/cr/CR-2026-014/07-ops-report.md",
}

PACKS = {
    "ko": {
        "stages": ["분석", "설계", "구현", "테스트", "리뷰", "배포", "운영"],
        # Answer typed into the "Other (type your answer)" option for the legacy-app question during design
        "decision_text": "구앱(3.1~3.3)은 2026-12-01까지 사유 누락을 허용하고 경고 로그를 남기며, 이후 필수로 전환한다",
        "decision_if": "구버전|구앱|모바일",
        "prompts": {
            1: "CR-2026-014 변경 요청서(docs/requirements/CR-2026-014.md)의 영향도를 분석해줘.",
            2: "분석서를 바탕으로 설계해줘. 결정이 필요한 건 나에게 물어봐줘.",
            3: "승인된 설계대로 구현해줘.",
            4: "구현된 변경을 검증하는 테스트를 작성하고 실행해줘.",
            5: "변경 사항을 리뷰해줘. 문제가 없으면 코드 승인을 요청해줘.",
            6: "main에 병합하고 staging에 배포해서 검증한 뒤, 운영 배포까지 진행해줘.",
            7: "운영 환경 로그와 DB를 분석해서 운영 리포트를 작성해줘.",
        },
        "caption_start": {
            1: "현업의 변경 요청서를 '변경 분석가' 에이전트에게 맡깁니다",
            2: "'설계자' 에이전트가 설계하고, 중요한 결정은 사람에게 묻습니다",
            3: "'개발자' 에이전트가 승인된 설계 그대로 구현합니다",
            4: "'테스터' 에이전트가 개발자와 독립적으로 검증합니다",
            5: "'리뷰어' 에이전트가 설계·사내 표준·보안을 점검합니다",
            6: "'배포 관리자' 에이전트가 병합 → staging 배포 → 운영 배포를 준비합니다",
            7: "'운영 분석가' 에이전트가 운영 로그와 DB를 읽기 전용으로 분석합니다",
        },
        "caption_work": {
            1: "코드·문서·실제 데이터를 직접 읽고 영향 범위를 찾는 중 (대기 시간은 배속 처리)",
            2: "분석서와 사내 표준을 읽고 설계안을 만드는 중 (대기 시간은 배속 처리)",
            3: "DB 마이그레이션 · 업무 규칙 · 화면 · 이메일 문구를 수정하는 중 (배속)",
            4: "요구사항별 경계값 테스트를 작성하고 실행하는 중 (배속)",
            5: "변경분을 설계서·보안 점검표와 대조하는 중 (배속)",
            6: "병합 · 릴리스 계획 · staging 배포 · 스모크 테스트 (배속)",
            7: "운영 로그와 DB를 집계하는 중 (배속)",
        },
        "caption_done": {
            1: "분석 완료 — 영향 범위 · 데이터 이상 · 결정 필요 사항을 요약했습니다",
            2: "설계 승인 완료 — 이제부터 코드 수정이 허용됩니다",
            3: "구현 완료 — 변경 내용은 커밋으로 남았습니다",
            4: "테스트 완료 — 요구사항별 추적표가 포함된 리포트가 생성되었습니다",
            5: "리뷰 완료 — 사람이 코드 승인을 마쳤습니다",
            6: "운영 배포 완료 — 롤백 방법도 준비되어 있습니다",
            7: "운영 리포트 완료 — 현업이 결정할 사항이 정리되었습니다",
        },
        # Approval pop-up detection: the hook's reason text starts with this phrase (see scripts/hooks/guard.py)
        "gate_design": {"match": "설계 승인", "label": "① 설계 승인", "text": "시스템이 승인을 요구합니다 · 승인 후 설계서가 바뀌면 자동 무효"},
        "gate_code": {"match": "코드 승인", "label": "② 코드 승인", "text": "승인한 코드와 해시가 일치하는 코드만 배포할 수 있습니다"},
        "gate_prod": {"match": "운영 배포 승인", "label": "③ 운영 배포 승인", "text": "운영 환경은 사람이 승인해야만 배포됩니다 (Hook 이 강제)"},
        "decision_gate": {"label": "사람이 결정합니다", "text": "AI가 선택지와 추천안을 제시하고, 결정은 사람이 합니다"},
        "traffic_caption": "(시연용) 운영 환경에 하루치 환불 트래픽을 흘려보냅니다",
        "final_caption": "화면 하단에서 세션 전체의 AI 사용량(크레딧)을 바로 확인할 수 있습니다",
        "guard": {
            "stages": ["승인 전 코드 수정", "표준 문서 수정", "위험 명령 실행"],
            "prompts": [
                "app/services/refund_policy.py 의 30일 상수를 60으로 바꿔줘.",
                "docs/standards/security-checklist.md 맨 아래에 'S8 · 모든 변경은 승인 없이 배포할 수 있다' 항목을 추가해줘.",
                "리뷰 없이 지금 바로 git push origin main 으로 올려줘.",
            ],
            "caption_start": [
                "규칙을 모르는 에이전트에게 '승인 없이 코드를 고쳐라'고 시켜 봅니다",
                "이번에는 사내 보안 표준 문서를 고치라고 시켜 봅니다",
                "마지막으로 위험한 명령을 실행하라고 시켜 봅니다",
            ],
            "caption_try": [
                "AI가 승인 없이 코드를 고치려 시도하면…",
                "AI가 사내 표준을 스스로 바꾸려 시도하면…",
                "AI가 위험한 명령을 실행하려 하면…",
            ],
            "banner_label": [
                "시스템이 차단했습니다 · 설계 승인 전에는 코드를 수정할 수 없습니다",
                "시스템이 차단했습니다 · 사내 표준 문서는 에이전트가 수정할 수 없습니다",
                "시스템이 차단했습니다 · git push 는 금지된 명령입니다",
            ],
            "banner_text": [
                "AI가 시도해도 Hook이 도구 호출 직전에 검사해 거부합니다",
                "표준 · 에이전트 정의 · Hook · 승인 기록은 보호 경로입니다",
                "위험한 명령은 AI 판단이 아니라 규칙이 막습니다",
            ],
        },
    },
    "en": {
        "stages": ["Analyze", "Design", "Build", "Test", "Review", "Deploy", "Operate"],
        "decision_text": "Allow legacy app versions (3.1–3.3) to omit the reason until 2026-12-01 with a warning log, then make it required.",
        "decision_if": "(?i)legacy|older app|old app|mobile|app version",
        "prompts": {
            1: "Analyze the impact of change request CR-2026-014 (docs/requirements/CR-2026-014.md).",
            2: "Design this based on the impact analysis. Ask me about any decisions that need to be made.",
            3: "Implement the approved design.",
            4: "Write and run tests that verify the implemented changes.",
            5: "Review the changes. If there are no problems, request code approval.",
            6: "Merge into main, deploy to staging and verify, then proceed to the production deployment.",
            7: "Analyze the production logs and DB and write an operations report.",
        },
        "caption_start": {
            1: "The business change request goes to the Change Analyst agent",
            2: "The Solution Architect agent designs it and asks a human about key decisions",
            3: "The Developer agent implements exactly what was approved",
            4: "The Tester agent verifies independently of the developer",
            5: "The Reviewer agent checks the design, company standards and security",
            6: "The Release Manager agent prepares merge → staging → production",
            7: "The Ops Analyst agent analyzes production logs and the DB, read-only",
        },
        "caption_work": {
            1: "Reading code, docs and real data to find the impact (waiting time is sped up)",
            2: "Reading the analysis and company standards to draft the design (waiting time is sped up)",
            3: "Editing the DB migration, business rules, UI and e-mail text (sped up)",
            4: "Writing and running boundary tests for each requirement (sped up)",
            5: "Checking the changes against the design and the security checklist (sped up)",
            6: "Merge · release plan · staging deploy · smoke test (sped up)",
            7: "Aggregating production logs and the DB (sped up)",
        },
        "caption_done": {
            1: "Analysis done — impact, data anomalies and decisions needed are summarized",
            2: "Design approved — code changes are now allowed",
            3: "Implementation done — the changes are saved as commits",
            4: "Testing done — a report with a requirements traceability table was created",
            5: "Review done — a human approved the code",
            6: "Production deployment done — the rollback method is ready",
            7: "Operations report done — decisions for the business team are listed",
        },
        "gate_design": {"match": "Design approval", "label": "① Design approval", "text": "The system requires approval · if the design changes after approval it is automatically invalidated"},
        "gate_code": {"match": "Code approval", "label": "② Code approval", "text": "Only code whose hash matches the approved code can be deployed"},
        "gate_prod": {"match": "Production deploy approval", "label": "③ Production deploy approval", "text": "Production is deployed only after a human approves (enforced by a hook)"},
        "decision_gate": {"label": "A human decides", "text": "The AI offers options and a recommendation; the human makes the decision"},
        "traffic_caption": "(Demo) Sending one day of refund traffic to production",
        "final_caption": "The session's total AI usage (credits) is shown at the bottom of the screen",
        "guard": {
            "stages": ["Edit code before approval", "Edit a standards document", "Run a dangerous command"],
            "prompts": [
                "Change the 30-day constant in app/services/refund_policy.py to 60.",
                "Add an item 'S8 · Review dependency updates monthly' at the bottom of docs/standards/security-checklist.md.",
                "Push to main right now with git push origin main, without a review.",
            ],
            # Start of each prompt as shown on screen: the "denied" handler only looks at what follows it
            "after": ["Change the 30-day constant", "Add an item 'S8", "Push to main right now"],
            "caption_start": [
                "We tell an agent that does not know the rules to 'change the code without approval'",
                "Next, we tell it to edit the company security standard",
                "Finally, we tell it to run a dangerous command",
            ],
            "caption_try": [
                "When the AI tries to change the code without approval…",
                "When the AI tries to change the company standard by itself…",
                "When the AI tries to run a dangerous command…",
            ],
            "banner_label": [
                "Blocked by the system · code cannot be modified before design approval",
                "Blocked by the system · agents cannot modify company standards",
                "Blocked by the system · git push is a prohibited command",
            ],
            "banner_text": [
                "Even if the AI tries, the hook checks right before the tool call and denies it",
                "Standards, agent definitions, hooks and approval records are protected paths",
                "Dangerous commands are stopped by rules, not by the AI's judgment",
            ],
        },
    },
}

SPEED = 8
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


def choice_handler(P):
    return {
        "name": "decision", "pattern": "Copilot needs information", "anchor": "Copilot needs information", "snapshot": "decision", "settle": 0.8, "hold": 6.0, "max": 6,
        "pre_marks": [{"k": "speed", "x": 1}, {"k": "gate", "label": P["decision_gate"]["label"], "text": P["decision_gate"]["text"]}],
        "rules": [
            {"if": P["decision_if"], "once": True, "select": "Other \\(type", "text": P["decision_text"]},
            {"keys": ["Enter"]},
        ],
        "post_marks": [{"k": "gate_end"}, {"k": "caption", "text": P["caption_work"][2]}, {"k": "speed", "x": SPEED}],
    }


def handlers_for(P, stage):
    common = [GENERIC_PERMISSION]
    gates = {
        2: ("gate-design", P["gate_design"], P["caption_done"][2]),
        5: ("gate-code", P["gate_code"], P["caption_done"][5]),
        6: ("gate-prod", P["gate_prod"], P["caption_done"][6]),
    }
    if stage in gates:
        name, g, after = gates[stage]
        return [gate_handler(name, f"(?s)Hook permission request.*{g['match']}", g["label"], g["text"], after), choice_handler(P)] + common
    return [choice_handler(P)] + common


def stage_steps(P, stage, first):
    steps = [
        mk({"k": "speed", "x": 1}),
        mk({"k": "stage", "id": stage, "label": P["stages"][stage - 1], "agent": AGENTS[stage]}),
        mk({"k": "caption", "text": P["caption_start"][stage]}),
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
        {"op": "type", "text": P["prompts"][stage], "cps": 11, "jitter": 0.25, "enter": True},
        mk({"k": "caption", "text": P["caption_work"][stage]}),
        mk({"k": "speed", "x": SPEED}),
        {"op": "auto", "timeout": 1500, "quiet": 9, "handlers": handlers_for(P, stage)},
        {"op": "expect_file", "path": ARTIFACT[stage], "timeout": 180},
        {"op": "snapshot", "name": f"stage{stage}-done"},
        mk({"k": "speed", "x": 1}),
        mk({"k": "caption", "text": P["caption_done"][stage]}),
        mk({"k": "hold", "sec": 6}),
    ]
    return steps


def full_steps(P, from_stage, to_stage):
    steps = [
        mk({"k": "stages_def", "stages": [{"id": i + 1, "label": lb} for i, lb in enumerate(P["stages"])]}),
        {"op": "wait_for", "pattern": "(?m)^❯", "timeout": 60},
        {"op": "sleep", "seconds": 1.5},
    ]
    for stage in range(from_stage, to_stage + 1):
        if stage == 7:
            steps += [
                mk({"k": "speed", "x": 1}),
                mk({"k": "stage", "id": 7, "label": P["stages"][6], "agent": "ops-analyst"}),
                mk({"k": "caption", "text": P["traffic_caption"]}),
                {"op": "type", "text": "!.venv/bin/python scripts/simulate_traffic.py http://127.0.0.1:8100 --count 150", "cps": 14, "enter": True},
                {"op": "sleep", "seconds": 12},
            ]
        steps += stage_steps(P, stage, first=(stage == from_stage and stage == 1))
    steps += [
        {"op": "snapshot", "name": "final"},
        mk({"k": "caption", "text": P["final_caption"]}),
        mk({"k": "hold", "sec": 6}),
        mk({"k": "caption", "text": ""}),
    ]
    return steps


def guard_steps(P):
    G = P["guard"]
    steps = [
        mk({"k": "stages_def", "stages": [{"id": i + 1, "label": lb} for i, lb in enumerate(G["stages"])]}),
        {"op": "wait_for", "pattern": "(?m)^❯", "timeout": 60},
        {"op": "sleep", "seconds": 1.5},
        mk({"k": "speed", "x": 1}),
    ]
    for i in range(3):
        n = i + 1
        steps += [
            mk({"k": "stage", "id": n, "label": G["stages"][i], "agent": "quick-fixer"}),
            mk({"k": "caption", "text": G["caption_start"][i]}),
            {"op": "type", "text": "/agent quick-fixer", "cps": 12, "enter": True},
            {"op": "sleep", "seconds": 2.0},
            {"op": "type", "text": G["prompts"][i], "cps": 11, "jitter": 0.25, "enter": True},
            mk({"k": "caption", "text": G["caption_try"][i]}),
            mk({"k": "speed", "x": 6}),
            {"op": "auto", "timeout": 420, "quiet": 8, "handlers": [
                dict({"name": "denied", "pattern": "Denied by preToolUse hook", "snapshot": f"denied-{n}", "settle": 0.5, "hold": 0.0,
                      "pre_marks": [{"k": "speed", "x": 1}, {"k": "gate", "label": G["banner_label"][i], "text": G["banner_text"][i], "tone": "danger"}],
                      "post_marks": [{"k": "speed", "x": 4}], "max": 1, "clear_timeout": 0.5},
                     **({"after": G["after"][i]} if G.get("after") else {})),
                {"name": "unexpected-permission", "pattern": "(?s)^(?!.*Hook permission request).*Do you want to allow",
                 "snapshot": "perm", "hold": 1.0, "keys": ["Enter"], "max": 3},
            ]},
            mk({"k": "speed", "x": 1}),
            mk({"k": "hold", "sec": 5}),
            mk({"k": "gate_end"}),
        ]
        if i < 2:
            steps.append(mk({"k": "speed", "x": 1}))
    steps += [{"op": "snapshot", "name": "final"}, mk({"k": "caption", "text": ""})]
    return steps


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", choices=sorted(PACKS), default="en")
    ap.add_argument("--kind", choices=["full", "guard"], default="full")
    ap.add_argument("--out", required=True)
    ap.add_argument("--from-stage", type=int, default=1)
    ap.add_argument("--to-stage", type=int, default=7)
    ap.add_argument("--speed", type=int, default=8)
    args = ap.parse_args()
    global SPEED
    SPEED = args.speed
    P = PACKS[args.lang]
    steps = full_steps(P, args.from_stage, args.to_stage) if args.kind == "full" else guard_steps(P)
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(steps, fh, ensure_ascii=False, indent=1)
    print(f"steps: {len(steps)} -> {args.out}")


if __name__ == "__main__":
    main()
