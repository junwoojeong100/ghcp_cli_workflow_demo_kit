# CR-2026-014 운영 리포트 — 2026-10-16
- 보관 로그 312건 중 4xx 45건(14.42%), 기록된 5xx 0건, 응답시간 P95 2.1ms다.
- 시뮬레이션 환불 150건은 승인 80·승인 대기 25·기간 초과 거절 45건이다.
- 고액 승인 대기 25건은 4,500만원이며, 미결정 상태와 승인 전 알림 없음이 확인됐다.
- 구앱 3.1 무사유 접수 20건으로 시뮬레이션 접수 105건의 19.05%는 사유가 없다. 승인된 유예 동작이나 원인 분석에는 공백이다.
- VIP 구매 31~60일 접수 32건을 확인했다. 접근·감사 로그의 이메일/전화 패턴 검출은 0건이다.

## 1. 범위·해석 기준
운영 `.deploy/production/logs/app.log` 1~312행과 `.deploy/production/data/orders.db`를 읽기 전용 조회했다. 로그 관측 구간은 한국시간 15:34:06~16:02:43이며 배포 전 헬스·배포 스모크도 포함한다.
시뮬레이션 환불은 16:02:42~43의 ShopFlow UA 150건, DB 주문 id>1021·환불 id>3이다. 로그↔주문 150건 전부 연결됐으며 실고객·장기 운영 지표로 일반화하지 않는다.
거절 사유는 사용자 실행 결과의 WINDOW_EXPIRED 45건과 DB 기간 초과 45건을 교차 확인했다. 접근 로그 자체에는 거절 코드·응답 본문이 없어 로그만으로 사유를 알 수 없다.

## 2. 요청·오류·응답시간
| 대상 | 요청 | 2xx / 4xx / 5xx | 4xx율 | 평균 / P50 / P95 / 최대(ms) |
|---|---:|---|---:|---|
| 전체 보관 로그 | 312 | 267 / 45 / 0 | 14.42% | 1.59 / 1.4 / 2.1 / 17.5 |
| 환불 POST 전체(스모크 포함) | 151 | 106 / 45 / 0 | 29.80% | 1.58 / 1.6 / 2.0 / 3.3 |
| 시뮬레이션 환불만 | 150 | 105 / 45 / 0 | 30.00% | 1.57 / 1.6 / 1.9 / 2.7 |

P95는 정렬 후 ceil(건수×0.95)번째 값이다. ms는 서버 미들웨어 측정값으로 클라이언트 체감 시간과 다를 수 있다. 최대 17.5ms는 웹 주문 생성 POST 201이며, 기준 SLO·이전 표본이 없어 성능 변화는 단정하지 않는다.

## 3. 클라이언트별 환불 비교
| User-Agent | 요청 | 승인 / 대기 / 기간 초과 | 4xx율 | P95(ms) | 무사유 경고 |
|---|---:|---|---:|---:|---:|
| ShopFlowWeb/2.4 | 87 | 46 / 16 / 25 | 28.74% | 1.9 | 0 |
| ShopFlowMobile/3.3 | 29 | 18 / 5 / 6 | 20.69% | 1.8 | 0 |
| ShopFlowMobile/3.1 | 34 | 16 / 4 / 14 | 41.18% | 2.1 | 20 |

3.1의 높은 거절률도 14건 전부 기간 초과이며 사유 필수화 장애로 볼 근거는 없다. 3.1의 성공 접수 20건은 모두 사유 NULL·WARNING으로 감사 정보와 일치한다.
3.2는 표본 없음. 시뮬레이터의 3.3은 사유를 보내므로 실제 배포 앱 3.3의 계약까지 검증한 것은 아니다.

## 4. 정책·감사·개인정보 점검
| 항목 | 실제 확인 결과 | 판단·한계 |
|---|---|---|
| VIP 60일 | VIP 70요청 중 67접수·3기간 초과, 일반/NULL 80요청 중 38접수·42기간 초과. VIP 31~60일 32접수, 일반 31~60일 0접수, 기간 초과 접수 0 | 관측 표본에서 기간 정책 일치 |
| 사유 | 시뮬레이션 접수 105건 중 입력 85(80.95%)·누락 20(19.05%), 입력 길이 5~10자·길이 위반 0. 기존 환불 2건의 NULL은 별도 | 누락 20은 구앱 예외. 경고는 16:02:42.269~43.042에 집중됐으나 시뮬레이션 부하이므로 실사용 급증 단정 불가 |
| 고액 | 정확히 100만원 16건 승인. 초과 25건 모두 REQUESTED·decided_at NULL, 승인 0·연결 알림 0. 135만원 10건·210만원 15건 | 대기액 합계 4,500만원. 자동 승인·조기 안내 징후 없음 |
| 감사·알림 | 감사 106건=시뮬레이션 105+스모크 1, 접수 감사 누락 0. 예외 true 20·false 86. 알림 대기열 81=신규 승인 80+스모크 1 | 관리자 승인/반려 감사 0, 대기 25건 미처리. 실제 메일 발송·환급 여부는 별도 확인 필요 |
| 개인정보 | 접근 로그 312건·감사 106건에서 이메일/전화 패턴 각 0. 접근 로그 reason 키 없음, 감사 detail 키에도 사유 원문·고객 이름/이메일/전화 없음 | 패턴 점검이지 이름·변형·인코딩된 개인정보의 완전 부재 보장은 아님 |

DB 전체: 고객 12·주문 171·환불 108(승인 82·대기 25·과거 반려 1), 무결성 ok. 요청 거절 45건은 REJECTED 45건이 아니며, 과거 반려 1건의 사유는 NULL로 확인 필요다.

## 5. 결론·권고
| 구분 | 권고 | 근거 |
|---|---|---|
| 즉시 조치 | 시뮬레이션 생성 건과 실거래를 분리해 대기 25건의 처리 방침을 사람이 판단한다. 자동 승인·DB 정리·재배포는 하지 않음 | 대기 표시액 4,500만원, 실제 환급 대상 여부 확인 필요 |
| 모니터링 | 클라이언트별 기간 초과율·무사유 경고·사유 수집률·고액 적체와 대기 시간을 추적하고 실제 사용자 표본과 분리 | 구앱 경고 20건, 짧은 합성 관측 구간 |
| 현업 결정 필요 | 합성 대기 건 처리 방침·검토 담당·시점, 구앱 업데이트·웹 유도/공지 일정 결정 | 시뮬레이션 접수 사유 누락 19.05%, 고액 25건 |

유예는 2026-12-01 UTC까지이며 12-02 00:00 UTC(한국시간 09:00)부터 사유 필수다. 승인된 기한을 임의로 바꾸지 않는다.
외부 체크리스트: 실제 앱 UA·공지·메일 발송 워커·입금 결과 확인. 현재 5xx 0은 접근 로그에 기록된 요청 기준으로 미기록 예외까지 배제하지 않는다.

## 6. 실행한 주요 조회·근거 명령
아래 L/D/C/P는 본문 수치의 재현용 조회다. 고객·사유 원문·토큰은 출력하지 않으며 DB는 전부 `sqlite3 -readonly`로만 읽는다.
```sh
DB=.deploy/production/data/orders.db; LOG=.deploy/production/logs/app.log
# L: 요청·지연·경고(전체, 환불, UA별); ms는 nearest-rank
jq -s 'def m:length as $n|([.[].ms]|sort) as $t|{n:$n,status:(group_by(.status)|map([.[0].status,length])),warning:([.[]|select(.code=="LEGACY_REASON_MISSING")]|length),avg:($t|add/$n),p50:$t[($n*0.5|ceil)-1],p95:$t[($n*0.95|ceil)-1],max:$t[-1]}; def f:.method=="POST" and (.path|test("^/orders/[0-9]+/refund$")); {time:({first:(map(.ts)|min),last:(map(.ts)|max)}),all:m,refund:(map(select(f))|m),simulation:(map(select(f and (.client|test("^ShopFlow(Web|Mobile)/"))))|m),clients:(map(select(f))|group_by(.client)|map({client:.[0].client,metrics:m}))}' "$LOG"
# D: 신규/전체 환불·감사·고액·보존·무결성
sqlite3 -readonly -header -column "$DB" <<'SQL'
SELECT (SELECT COUNT(*) FROM customers) AS customers,(SELECT COUNT(*) FROM orders) AS orders,(SELECT COUNT(*) FROM refunds) AS refunds,(SELECT COUNT(*) FROM audit_log) AS audit,(SELECT COUNT(*) FROM notifications) AS notifications;
SELECT status,COUNT(*),SUM(amount),SUM(reason IS NULL),SUM(amount>1000000) FROM refunds GROUP BY status;
SELECT status,COUNT(*),SUM(amount),SUM(reason IS NULL) FROM refunds WHERE id>3 GROUP BY status;
SELECT amount,status,COUNT(*) FROM refunds WHERE id>3 AND amount>=1000000 GROUP BY amount,status;
SELECT json_extract(detail,'$.legacy_exception'),json_extract(detail,'$.reason_missing'),COUNT(*) FROM audit_log WHERE action='refund.requested' GROUP BY 1,2;
SELECT COUNT(*) FROM refunds r JOIN notifications n ON n.body LIKE ('%주문 #'||r.order_id||'의 환불%') WHERE r.status='REQUESTED';
SELECT COUNT(*) FROM refunds r WHERE r.id>3 AND NOT EXISTS(SELECT 1 FROM audit_log a WHERE a.action='refund.requested' AND json_extract(a.detail,'$.refund_id')=r.id);
SELECT COUNT(*),MIN(LENGTH(reason)),MAX(LENGTH(reason)) FROM refunds WHERE id>3 AND reason IS NOT NULL;
SELECT COUNT(*) FROM refunds WHERE id>3 AND reason IS NOT NULL AND (LENGTH(TRIM(reason))<1 OR LENGTH(reason)>200);
SELECT COUNT(*) FROM refunds WHERE id>3 AND amount>1000000 AND status='REQUESTED' AND decided_at IS NULL;
PRAGMA integrity_check;
SQL
# C: UA와 DB를 주문 ID로 연결. 경과일은 관측일 UTC 2026-10-16 기준
jq -n --slurpfile l "$LOG" --slurpfile d <(sqlite3 -readonly -json "$DB" "SELECT o.id AS id,CASE WHEN UPPER(TRIM(COALESCE(c.tier,'')))='VIP' THEN 'VIP' ELSE 'STANDARD' END AS tier,CAST(julianday('2026-10-16')-julianday(substr(o.ordered_at,1,10)) AS INTEGER) AS days,r.status AS state,r.reason IS NULL AS missing FROM orders o JOIN customers c ON c.id=o.customer_id LEFT JOIN refunds r ON r.order_id=o.id WHERE o.id>1021;") '($d[0]|map({key:(.id|tostring),value:.})|from_entries) as $o|[$l[]|select(.method=="POST" and (.path|test("^/orders/[0-9]+/refund$")) and (.client|test("^ShopFlow(Web|Mobile)/")))|. as $e|$o[($e.path|split("/")[2])]+{client:$e.client,http:$e.status}] as $r|{matched:($r|length),unmatched:([$r[]|select(.id==null)]|length),clients:($r|group_by(.client)|map({client:.[0].client,states:(group_by(.state)|map([.[0].state,length]))})),tiers:($r|group_by(.tier)|map({tier:.[0].tier,n:length,accepted:([.[]|select(.http==201)]|length),days31_60:([.[]|select(.http==201 and .days>=31 and .days<=60)]|length),expired:([.[]|select(.http==400 and .days>(if .tier=="VIP" then 60 else 30 end))]|length)}))}'
# P: 이메일·국내/국제 전화 형태 검사, 매치된 원문은 출력 금지
E='[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'; P='(^|[^0-9])(\+82[- .]?[1-8][0-9]?|0[1-8][0-9]?)[- .]?[0-9]{3,4}[- .]?[0-9]{4}([^0-9]|$)'
jq -s --arg e "$E" --arg p "$P" '{rows:length,email:([.[]|select(tostring|test($e))]|length),phone:([.[]|select(tostring|test($p))]|length),reason_key:([.[]|select(has("reason"))]|length)}' "$LOG"
sqlite3 -readonly -json "$DB" "SELECT at,actor,action,detail FROM audit_log;" | jq --arg e "$E" --arg p "$P" '{rows:length,email:([.[]|select(tostring|test($e))]|length),phone:([.[]|select(tostring|test($p))]|length),fields:([.[].detail|fromjson|keys]|flatten|unique)}'
```
