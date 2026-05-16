---
name: gmail-to-kakao-routine
description: Gmail 메일 내용을 읽고 요약하여 카카오톡 나에게 보내기로 전송하는 루틴. Use when the user wants to check Gmail emails and send a summary to themselves via KakaoTalk (나에게 보내기).
license: MIT
---

# Gmail → 카카오톡 나에게 보내기 루틴

Gmail 받은편지함의 읽지 않은 이메일을 읽고 요약한 뒤, 카카오톡 나에게 보내기 API로 전송합니다.

---

## 제약 조건 (반드시 준수)

- **카카오톡 `text` 타입 메시지는 200자 이내** — 초과 시 API 400 오류 발생
- **빈 응답 금지** — 이메일이 없어도 결과 메시지를 카카오톡으로 반드시 전송
- **JSON 특수문자 처리** — 이메일 내용의 `"`, `\`, 개행 등은 python3로 안전하게 처리
- **KAKAO_ACCESS_TOKEN 필수** — 없으면 즉시 오류 안내 후 종료
- **토큰 만료 주기 6시간** — 매일 아침 루틴 실행 전 갱신 필요 (refresh_token 사용)

---

## 실행 순서

### 1단계 — Gmail 이메일 검색

`search_threads` 도구로 최근 24시간 이내 읽지 않은 이메일을 가져옵니다.

```
쿼리: is:unread newer_than:1d
최대: 10건
```

### 2단계 — 이메일 내용 파악

상위 5건에 대해 `get_thread`로 아래 정보를 추출합니다.

- 발신자 이름 (표시명, 10자 이내로 축약)
- 제목 (20자 이내로 축약)
- 수신 시각

이메일이 0건이면 `new_count = 0`으로 처리하고 3단계로 넘어갑니다.

### 3단계 — 카카오톡 메시지 생성 (200자 이내)

아래 형식을 **정확히** 따르세요.

**새 메일이 있을 때:**
```
📬 Gmail 브리핑 | M월 D일(요일)

새 메일 N건

① 발신자 | 제목
② 발신자 | 제목
③ 발신자 | 제목
외 N건 더
```

**새 메일이 없을 때:**
```
📭 Gmail 브리핑 | M월 D일(요일)

새 메일이 없습니다.
좋은 하루 되세요 ☀️
```

규칙:
- 최대 5건 표시. 초과분은 "외 N건 더" 한 줄로 처리
- 발신자 + 제목 한 줄이 30자 초과 시 `…`으로 잘라내기
- 완성된 메시지가 200자 초과 시 하단부터 잘라내고 마지막에 `…` 추가

### 4단계 — 카카오톡 전송

python3로 JSON을 안전하게 생성한 뒤 curl로 전송합니다.

```python
# /tmp/build_kakao.py 로 저장 후 실행
import json

summary = """여기에_3단계_메시지_전체_붙여넣기"""

summary = summary[:200]  # 200자 제한 강제 적용

template = {
    "object_type": "text",
    "text": summary,
    "link": {
        "web_url": "https://mail.google.com",
        "mobile_web_url": "https://mail.google.com"
    }
}

with open('/tmp/kakao_template.json', 'w', encoding='utf-8') as f:
    json.dump(template, f, ensure_ascii=False)

print("JSON 파일 생성 완료")
```

```bash
python3 /tmp/build_kakao.py

HTTP_CODE=$(curl -s -o /tmp/kakao_result.json -w "%{http_code}" \
  -X POST https://kapi.kakao.com/v2/api/talk/memo/default/send \
  -H "Authorization: Bearer ${KAKAO_ACCESS_TOKEN}" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "template_object@/tmp/kakao_template.json")

echo "HTTP: $HTTP_CODE"
cat /tmp/kakao_result.json
```

### 5단계 — 결과 보고 (빈 응답 금지)

HTTP 200이면:
```
✅ 카카오톡 브리핑 전송 완료
처리 이메일: N건 | 전송: HH:MM
```

실패 시:
```
❌ 전송 실패 (HTTP N)
오류: {result.json 내용}
조치: KAKAO_ACCESS_TOKEN 만료 여부 확인 후 갱신
```

---

## 토큰 갱신 (매일 실행 필수)

카카오 액세스 토큰은 **6시간** 후 만료됩니다. 루틴 실행 전 아래로 갱신하세요.

### refresh_token으로 자동 갱신

```bash
NEW_TOKEN=$(curl -s -X POST https://kauth.kakao.com/oauth/token \
  -d "grant_type=refresh_token" \
  -d "client_id=a87a29bc9bf8c78bce528303b2a9a6dd" \
  -d "client_secret=5DbkilT6L1jiSa7z979YpT4MePQdWLga" \
  -d "refresh_token=${KAKAO_REFRESH_TOKEN}" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

echo "갱신된 토큰: $NEW_TOKEN"
```

> **설정:** `.claude/settings.json`의 `env`에 `KAKAO_REFRESH_TOKEN`도 함께 저장하세요.

---

## 환경 설정

`.claude/settings.json`:

```json
{
  "env": {
    "KAKAO_ACCESS_TOKEN": "<액세스_토큰>",
    "KAKAO_REFRESH_TOKEN": "<리프레시_토큰>"
  }
}
```

---

## 트러블슈팅

| 오류 | 원인 | 해결 |
|------|------|------|
| `401` | 액세스 토큰 만료 | refresh_token으로 갱신 |
| `400 KOE101` | JSON 형식 오류 또는 200자 초과 | python3 빌드 스크립트 출력 확인 |
| `403 KOE004` | `talk_message` 권한 없음 | 카카오 콘솔 동의항목 활성화 |
| `API Error: 400 messages: text content blocks must be non-empty` | 5단계 결과 미출력 | 성공/실패 문구 반드시 출력 |
