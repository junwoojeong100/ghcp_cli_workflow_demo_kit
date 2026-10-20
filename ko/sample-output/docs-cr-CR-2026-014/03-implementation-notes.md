# CR-2026-014 구현 노트

| 항목 | 결과 |
|---|---|
| 상태 | 기능 구현·로컬 검증 완료, QA·코드 승인② 전 |
| 기준 | 승인된 `02-design.md` 유지, 구현 시작 전 설계 승인 유효성 확인 |
| 브랜치 | `feature/CR-2026-014-refund-policy` |
| 변경 파일 수 | 구현 13개(코드·SQL·정책·기존 테스트·본 노트), 선행 분석·설계 2개 별도 |

## 1. 변경 파일과 내용
| 영역·파일 | 구현 내용 | 근거 |
|---|---|---|
| `db/migrations/002_refund_reason.sql` | NULL 허용 reason 추가, 001·기존 행 수정 없음 | `db/migrations/002_refund_reason.sql:1` |
| `app/services/refund_policy.py` | 일반 30일·VIP 60일, 등급 정규화, 임계액·길이·유예 설정 집중 | `app/services/refund_policy.py:5` |
| `app/services/refund_service.py` | 사유 저장·고액 REQUESTED·기존 한도 검사, CR ID·누락/예외 감사 정보 | `app/services/refund_service.py:35` |
| `app/schemas.py`, `app/routers/orders.py` | 사유 공백 정리·1~200자, UA 완전일치 버전 전달, 기존 응답 필드 유지 | `app/schemas.py:19` |
| `app/main.py` | 구앱 무사유 예외 접수 성공 시 WARNING·환불/주문 ID·버전 기록 | `app/main.py:47` |
| `app/static/index.html` | 사유 필수 입력·전송·초기화, 400/422 안내, textContent로 오류 출력 | `app/static/index.html:114` |
| `app/notifications.py`, `docs/policy/refund-policy.md` | 기간·사유·고액 승인·구앱 예외 안내 동기화 | `app/notifications.py:12` |
| `tests/test_refunds.py`, `tests/test_seed.py`, `tests/test_ui.py` | 깨진 기존 호출 최소 수정 및 변경 정책·마이그레이션 회귀 검증 | `tests/test_seed.py:25` |

구앱 대상은 `ShopFlowMobile/3.1`, `ShopFlowMobile/3.2`, `ShopFlowMobile/3.3` 완전일치다.
UTC 2026-12-01까지 누락·null만 허용하고 12-02 00:00 UTC부터 거절한다. 빈 문자열·공백만·잘못된 타입·초과 길이는 유예 중에도 거절한다.
고액·배송 중 REQUESTED는 decided_at=NULL이며 승인 전 이메일이 없다. 관리자 인증·승인/반려·재결정 거절·대기액 포함 한도는 유지했다.
사유는 DB에만 저장하며 조회 응답·접근 로그·감사 로그에는 원문을 추가하지 않았다.

## 2. 설계 대비 차이
| 항목 | 차이와 처리 |
|---|---|
| 아키텍처 설명 | `docs/architecture.md`는 개발자 수정 가능 경로 밖이므로 미반영. 담당자에게 API·정책·모바일 예외 설명 동기화 인계 |
| 마이그레이션 테스트 위치 | 신규 `tests/test_migrations.py` 대신 기존 `tests/test_seed.py`에 구스키마 확장·데이터 보존·구버전 INSERT 검증 추가 |
| 포맷 실행 범위 | 보호된 scripts의 기존 포맷 차이를 확인해 `ruff format app tests`만 실행. 보호 경로·승인 산출물은 수정하지 않음 |

## 3. 검증 결과
| 검증 | 명령·방법 | 결과 |
|---|---|---|
| 전체 린트 | `.venv/bin/ruff check .` | 통과 |
| 전체 테스트 | `.venv/bin/pytest -q -o addopts='' --tb=short` | 82 passed |
| 수정 가능 코드 포맷 | `.venv/bin/ruff format --check app tests` | 24 files already formatted |
| 전체 포맷 사전 검사 | `.venv/bin/ruff format --check .` | 보호된 scripts의 기존 차이로 실패; 아래 4개 파일은 미수정 |
| 웹 동작 실행 | Node VM·DOM 스텁으로 원본 화면 스크립트 실행 | 누락 안내·공백 정리 전송·400/422 안내·안전한 출력·주문 전환 초기화 통과 |
| DB 호환성 | 임시 DB에서 001→002, 재적용, 과거 행 비교, 구버전 INSERT | 통과; 운영·로컬 데이터 DB에는 마이그레이션 미실행 |

기존 포맷 차이: `scripts/gate.py`, `scripts/hooks/guard.py`, `scripts/simulate_traffic.py`, `scripts/smoke_test.py`.
실제 브라우저·staging·운영 배포는 수행하지 않았다. Node 검증은 브라우저 E2E를 대체하지 않는다.

## 4. 남은 이슈·인계
| 담당 | 확인·후속 작업 |
|---|---|
| qa-engineer | 실제 브라우저·모바일 계약·정책 문구 일치·승인/반려 및 마이그레이션을 독립 검증하고 `04-test-report.md` 작성 |
| 문서 담당자 | `docs/architecture.md` 설명 동기화. 승인된 설계·분석서는 직접 수정하지 않음 |
| 운영·앱·알림 담당자 | 설계의 배포 전 체크리스트 확인: 실제 UA, 사전 공지, 무중단 전환·DDL 잠금, 외부 이메일 대기열·보호된 트래픽 도구 |
| 리뷰·배포 담당자 | 리뷰 보고→코드 승인②→릴리스 계획·staging 검증→운영 승인③ 순서 준수; 무통제 구버전·과거 DB 덮어쓰기 롤백 금지 |

UA 자가신고에 따른 위장 가능성은 승인 설계의 알려진 한계다. 인증 완화·새 승인 상태·누적 고액 통제·인프라 개편은 추가하지 않았다.
