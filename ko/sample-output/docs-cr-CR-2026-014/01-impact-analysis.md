# CR-2026-014 변경 영향 분석서

분석일: 2026-10-16 · 희망 적용일: 2026-11-02 · 상태: 분석 완료, 설계·승인 전

## 1. 한눈에 보기
- VIP는 구매 후 60일, 일반은 30일이며, 신규 환불 접수에는 사유가 필요하다.
- 건별 요청액 1,000,000원 초과는 기존 관리자 승인 대기로 접수하고 승인 전 처리를 막는다.
- API·규칙·DB·웹·이메일·문서·테스트·운영 및 외부 모바일 앱에 영향이 있다.
- 가장 큰 위험은 사유 없는 구버전 앱의 접수 실패와 현행 배포 방식의 서비스 중단이다.
- 결정 필요: 구버전 접수 전환 방식, 등급 판정, 기존 주문에 대한 적용 기준.

## 2. 요구사항 해석
| ID | 의도 및 적용 범위 | 모호하거나 확인할 점 |
|---|---|---|
| R1 | VIP 60일 이내, 일반 30일 이내 접수. 기존 UTC 날짜 단위 계산을 유지한다. | 등급 표기 혼재·NULL 처리와 시행 전 주문 적용 기준 미정 |
| R2 | 실제 사유를 입력받아 저장하고, 누락 시 입력 안내를 표시한다. | 구버전 앱 전환 방식 미정. 자유문 1~200자·앞뒤 공백 제거를 설계안으로 제안 |
| R3 | 건별 요청액이 1,000,000원을 **초과**하면 관리자 승인 대기. 정확히 1,000,000원은 이 조건 제외. | 기존 배송 중 수동 승인 규칙은 유지. 누적 고액 통제는 이번 요구가 아님 |
| R4 | 고객 화면·승인/반려 이메일·정책 문서를 동일한 기간·사유·승인 안내로 맞춘다. | 외부 앱 내 문구·오류 안내 구현은 확인 필요 |

기준 요청서: `docs/requirements/CR-2026-014.md:15`

## 3. 영향 범위
| 영역 | 파일/위치 | 변경 내용 | 위험도 | 근거 |
|---|---|---|---|---|
| API | `app/schemas.py`, `app/routers/orders.py`, 환불 서비스 | 사유 입력·검증·전달·저장, 조회 응답 반영 검토. 현재 amount만 전달 | 상 | `app/routers/orders.py:22` |
| 업무 규칙 | `app/services/refund_policy.py`, `refund_service.py` | 기간·임계값을 정책 모듈에 집중, 등급별 기간과 고액 대기 분기 추가 | 상 | `app/services/refund_service.py:34` |
| DB/데이터 | `db/migrations/` 신규 `002_*.sql`, `refunds` | 사유 컬럼을 NULL 허용으로 확장; 과거 환불은 미수집 상태 유지, 새 접수는 API에서 필수화 | 상 | `db/migrations/001_init.sql:18` |
| 고객 화면 | `app/static/index.html` | 사유 입력·전송, 누락/검증 오류 안내, 30/60일 및 고액 대기 문구. 현재 사유 입력 없음 | 중 | `app/static/index.html:129` |
| 관리자 콘솔 | `app/static/index.html`, `app/routers/admin.py` | 기존 REQUESTED 목록·승인/반려 API 재사용; 새 상태·별도 승인 시스템 불필요, 인증 유지 | 중 | `app/static/index.html:140` |
| 알림 | `app/notifications.py`, 환불 서비스 `_notify` | 승인·반려 템플릿 모두 정책 반영; 고액 대기 중 승인 이메일 생성 금지 | 중 | `app/notifications.py:9` |
| 문서 | `docs/policy/refund-policy.md`, `docs/architecture.md` | 기간·사유 필수·고액 승인 및 API 계약 변경 설명 | 중 | `docs/policy/refund-policy.md:5` |
| 테스트 | `tests/test_refunds.py`, `test_ui.py`, `conftest.py` | 기존 amount-only 성공 사례 수정, 기간·금액·사유·승인·마이그레이션 회귀 추가 | 상 | `tests/test_refunds.py:4` |
| 배포/운영·감사 | 배포/스모크/트래픽 도구, 감사 로그·단계별 산출물 | 확장 선행·롤백 검증·승인 이력 유지. 현행 중지/기동 배포는 무중단 미충족; 보호된 scripts는 담당자 조치 | 상 | `scripts/deploy.sh:107` |
| 모바일 앱 | 외부 앱 3.1~3.3 | amount-only 요청에 필수 사유를 추가하면 계약 단절; 업데이트·대체 접수 경로 사전 안내 필요 | 상 | `docs/architecture.md:16` |

## 4. 데이터 확인 결과
저장소의 `data/orders.db`를 읽기 전용 조회했다. 운영 DB와 동일한 분포인지는 확인 필요하며 운영 수치로 일반화하지 않는다.
실행한 핵심 조회(한 줄 명령, 고객 이름·이메일 등 개인정보 조회 없음):
```sh
sqlite3 -readonly -header -column data/orders.db "SELECT quote(tier) AS tier, COUNT(*) AS n FROM customers GROUP BY tier; SELECT status, COUNT(*) AS n, MIN(amount) AS min_amount, MAX(amount) AS max_amount FROM refunds GROUP BY status; SELECT total_amount, status, COUNT(*) AS n FROM orders WHERE total_amount>=1000000 GROUP BY total_amount,status; SELECT UPPER(TRIM(COALESCE(c.tier,''))) AS tier, COUNT(*) AS orders_31_60 FROM orders o JOIN customers c ON c.id=o.customer_id WHERE julianday('2026-10-16')-julianday(substr(o.ordered_at,1,10)) BETWEEN 31 AND 60 GROUP BY 1; PRAGMA table_info(refunds);"
```
| 확인 항목 | 실제 결과 | 영향 |
|---|---|---|
| 고객 등급 12명 | `'STANDARD'` 5, `'VIP'` 4, `'vip'` 1, `'VIP '` 1, NULL 1 | 단순 VIP 완전일치 시 2명 누락; 정규화 시 VIP 6명. NULL은 판정 결정 필요 |
| 기존 환불 | APPROVED 1건 55,000원, REJECTED 1건 99,000원; REQUESTED 0건 | 과거 사유 컬럼 자체가 없으며 복원 불가. 상태·금액·일시는 보존 |
| 고액 경계 주문 | DELIVERED에 1,000,000 / 1,000,001 / 1,350,000 / 2,300,000원 각 1건 | 주문 전액을 요청한다면 3건이 금액 기준 대기 대상; 실제 접수 자격·요청액은 별도 판단 |
| 31~60일 주문 | 2026-10-16 기준 정규화 VIP 5건, STANDARD 3건, NULL 등급 1건 | VIP 기간 연장 영향을 직접 확인할 표본; 잔여 환불 가능액까지 보장하는 집계는 아님 |
| 환불 스키마 | id, order_id, amount, status, requested_at, decided_at의 6컬럼 | 사유 저장용 확장 필요; 기존 행에 가짜 사유를 채우지 않음 |

## 5. 위험 및 하위호환 시나리오
| 시나리오 | 영향과 대응 방향 | 근거 |
|---|---|---|
| 구버전이 amount만 전송 | 필수 필드 추가 시 기본 검증은 422. 웹도 현재 검증 오류 배열을 `err.message`로 읽어 안내가 깨질 수 있어 입력 안내 처리가 필요 | `app/static/index.html:134` |
| 문서와 트래픽 도구의 모바일 가정 불일치 | 문서는 3.1~3.3 모두 사유 미전송, 도구는 3.3을 전송으로 가정. 실제 버전별 계약 확인 필요; 도구 비율을 실사용 비율로 보고하지 않음 | `scripts/simulate_traffic.py:17` |
| VIP 변형값·기간 경계 | 화면은 이미 trim/대문자화한다. 서버가 다른 기준이면 VIP 표시 고객의 45일 주문이 거절됨; 일반 30/31일, VIP 45/60/61일 및 NULL 검증 | `app/static/index.html:103` |
| 고액·배송 중·부분 환불 | 고액에도 기존 대기 흐름(REQUESTED·decided_at=NULL·승인 전 알림 없음)을 적용. 대기액도 기존 총액 한도에 포함; 1,000,000/1,000,001원, 승인/반려·재결정 방지 검증 | `app/services/refund_service.py:35` |
| 구·신 서버가 같은 DB 사용 및 롤백 | NULL 허용 컬럼 확장으로 구버전 INSERT를 보존하되 구서버는 사유·고액 통제를 적용하지 못함. 정책 전환 뒤 구서버로 요청이 가지 않게 설계; 단순 코드 롤백은 통제 후퇴 | `app/services/refund_service.py:42` |
| 무중단·데이터 보존 | 현재 서비스 중지 후 기동하며 롤백도 동일. 담당자와 중단 없는 전환 절차를 설계하고 동시 요청·DDL 잠금 검증; 추가 컬럼은 유지하고 신규 접수 유실을 부르는 과거 백업 덮어쓰기 금지 | `scripts/deploy.sh:107` |
| 사유·감사 추적 | 사유 길이 제한·공백 정리, SQL 바인딩, 화면 출력 이스케이프 적용. 사유/개인정보 원문은 접근·감사 로그에 남기지 않고 환불 ID로 저장 이력과 연결; 기존 접수·결정 감사 이벤트 보존 | `docs/standards/security-checklist.md:8` |

## 6. 결정 필요 사항 및 배포 전 체크리스트
| 우선 | 사람이 정할 사항 | 선택지·장단점 | 추천안 |
|---|---|---|---|
| 1 | 구버전 앱의 사유 필수 전환 | A: 누락 거절+웹 사유 입력 접수 안내(요건 충족, 앱 내 접수 제한) / B: 앱 업데이트까지 적용 시점 조정(전환 혼란 감소, 일정 영향) | A. 사전 공지·웹 대체 경로 마련; 사유 자동 채움이나 무사유 허용은 R2 충족으로 간주하지 않음 |
| 2 | 등급 판정 기준 | A: 공백 제거·대소문자 통일 후 VIP, NULL은 일반(화면과 일치, NULL VIP 가능성 확인 필요) / B: 원본 완전일치(단순하나 변형 VIP 누락) | A. 원본 데이터 수정 없이 판정만 정규화 |
| 3 | 시행 전 구매 주문의 신규 접수 | A: 시행 후 모든 신규 접수에 적용(기존 VIP도 혜택, 처리량 증가 가능) / B: 시행 후 구매분만 적용(영향 축소, 기존 45일 VIP 기대와 충돌 가능) | A. 기존 환불 상태·사유 미수집 이력은 소급 변경하지 않음 |

배포 전 체크리스트(외부 확인 항목이지 별도 기능 요구나 추가 승인 게이트가 아님):
- 모바일 담당자: 버전별 reason 전송·오류 안내·웹 대체 경로 확인 및 사전 공지. 근거: `docs/architecture.md:16`
- 운영 담당자: 실제 DB 등급 분포·현재 배포 전환 방식 확인, 무중단/롤백 검증 절차 구체화. 근거: `scripts/deploy.sh:107`
- 알림 담당자: 외부 발송 워커와 기존 대기 이메일의 정책 문구 처리 확인. 근거: `docs/architecture.md:8`
- 도구 담당자: 보호된 트래픽 도구는 기본 422 응답의 detail 배열 처리 시 실패 가능하므로 검증 시나리오 정합성 확인. 근거: `scripts/simulate_traffic.py:66`

## 7. 다음 단계 제안
위 3개 결정을 반영해 `02-design.md`에 API·데이터 확장·정책 전환·검증·롤백을 구체화한다. 설계 승인① 전 구현하지 않는다.
이후 구현 기록→테스트→리뷰→코드 승인②→릴리스 계획·staging 검증→운영 배포 승인③→운영 보고 순으로 추적한다. 근거: `docs/standards/release-policy.md:9`
이번 작업은 본 분석서만 생성했으며 코드·DB·설정·보호 경로는 변경하지 않았다.
