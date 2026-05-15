---
name: gmail-to-kakao-routine
description: Gmail 메일 내용을 읽고 요약하여 카카오톡 나에게 보내기로 전송하는 루틴. Use when the user wants to check Gmail emails and send a summary to themselves via KakaoTalk (나에게 보내기).
license: MIT
---

# Gmail → 카카오톡 나에게 보내기 루틴

Gmail 받은편지함의 최신 이메일을 읽고 요약한 뒤, 카카오톡 나에게 보내기 API로 전송합니다.

## 실행 순서

다음 단계를 순서대로 실행하세요. 각 단계 결과를 다음 단계에 활용하세요.

### 1단계 — Gmail 이메일 검색

Gmail MCP 도구(`search_threads`)로 최근 읽지 않은 이메일을 가져옵니다.

```
검색 조건: is:unread newer_than:1d
최대 결과: 10건
```

이메일이 없으면 "오늘 새로운 이메일이 없습니다."라고 출력하고 종료합니다.

### 2단계 — 이메일 내용 파악

가져온 스레드에서 `get_thread`로 각 이메일의 상세 내용을 읽습니다.

각 이메일에서 추출할 정보:
- 발신자 (From)
- 제목 (Subject)
- 핵심 내용 (본문 200자 이내 요약)
- 수신 시각

### 3단계 — 요약 생성

아래 형식으로 카카오톡 전송용 요약문을 만드세요. **반드시 이 형식을 따르세요.**

```
📬 Gmail 요약 - {오늘 날짜}

총 {N}개의 새 이메일

1. [{발신자}] {제목}
   → {핵심 내용 1~2줄}

2. [{발신자}] {제목}
   → {핵심 내용 1~2줄}

(이하 동일 형식)
```

이메일이 5개를 초과하면 상위 5개만 포함하고 "외 {N-5}건 더 있습니다."를 마지막에 추가합니다.

### 4단계 — 카카오톡 나에게 보내기

아래 curl 명령으로 카카오톡 나에게 보내기 API를 호출합니다.

**필수 환경변수:** `KAKAO_ACCESS_TOKEN`

```bash
SUMMARY="<3단계에서 생성한 요약문>"

curl -s -o /tmp/kakao_response.json -w "%{http_code}" \
  -X POST https://kapi.kakao.com/v2/api/talk/memo/default/send \
  -H "Authorization: Bearer ${KAKAO_ACCESS_TOKEN}" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "template_object=$(cat <<'JSON'
{
  "object_type": "text",
  "text": "'${SUMMARY}'",
  "link": {
    "web_url": "https://mail.google.com",
    "mobile_web_url": "https://mail.google.com"
  }
}
JSON
)"
```

HTTP 상태코드와 응답 본문으로 성공 여부를 확인합니다.

### 5단계 — 결과 보고

항상 아래 형식으로 최종 결과를 출력합니다 (빈 응답 금지):

```
✅ 카카오톡 전송 완료
- 처리한 이메일: {N}건
- 전송 시각: {시각}
- 요약 미리보기: {요약문 첫 줄}
```

또는 실패 시:

```
❌ 전송 실패: {오류 메시지}
- HTTP 상태: {코드}
- 응답: {응답 본문}
- 확인 사항: KAKAO_ACCESS_TOKEN 환경변수가 설정되었는지 확인하세요.
```

---

## 환경 설정 (최초 1회)

### KAKAO_ACCESS_TOKEN 발급

카카오 나에게 보내기는 사용자 OAuth 토큰(Authorization Code Flow)이 필요합니다.

**1. 카카오 개발자 콘솔 설정**
1. [https://developers.kakao.com](https://developers.kakao.com) → 내 앱 선택
2. 앱 키 탭에서 **REST API 키** 복사
3. 카카오 로그인 → 동의항목 → `talk_message` 활성화
4. 카카오 로그인 → Redirect URI 등록 (예: `https://localhost`)

**2. 인가 코드 받기**

브라우저에서 아래 URL 열기 (CLIENT_ID와 REDIRECT_URI 교체):

```
https://kauth.kakao.com/oauth/authorize?client_id=<CLIENT_ID>&redirect_uri=<REDIRECT_URI>&response_type=code&scope=talk_message
```

로그인 후 리다이렉트된 URL에서 `code=` 파라미터 값을 복사합니다.

**3. 액세스 토큰 발급**

```bash
curl -X POST https://kauth.kakao.com/oauth/token \
  -d "grant_type=authorization_code" \
  -d "client_id=<CLIENT_ID>" \
  -d "redirect_uri=<REDIRECT_URI>" \
  -d "code=<인가코드>"
```

응답의 `access_token` 값을 환경변수로 설정:

```bash
# Claude Code 프로젝트 설정에 추가
# .claude/settings.json 또는 ~/.claude/settings.json
{
  "env": {
    "KAKAO_ACCESS_TOKEN": "<your_access_token>"
  }
}
```

> **주의:** 카카오 액세스 토큰은 기본 6시간 후 만료됩니다. 만료 시 `refresh_token`으로 갱신하거나 재발급하세요.

---

## 트러블슈팅

| 오류 | 원인 | 해결 |
|------|------|------|
| `401 Unauthorized` | 토큰 만료 또는 잘못된 토큰 | 토큰 재발급 |
| `400 KOE101` | 필수 파라미터 누락 | `template_object` 형식 확인 |
| `403 KOE004` | `talk_message` 권한 없음 | 카카오 콘솔에서 동의항목 활성화 |
| `API Error: 400 messages: text content blocks must be non-empty` | 스킬 응답이 비어있음 | 5단계 결과 보고를 반드시 출력해야 함 |
