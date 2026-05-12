#!/bin/bash
# SessionStart hook: KST 기준 날짜/요일 검증 및 환경변수 주입
# - 주말(토·일) 실행 자동 차단
# - 월요일 판별 + 조회 시작일(금요일) 자동 계산
# - KST_DATE, IS_MONDAY, QUERY_START_DATE 를 세션 환경변수로 주입

# stdin JSON 읽기 (Claude Code가 이벤트 정보를 stdin으로 전달)
input=$(cat)

# KST 기준 날짜/요일 계산
KST_DATE=$(TZ=Asia/Seoul date +%Y-%m-%d)
KST_DAY_NUM=$(TZ=Asia/Seoul date +%u)   # 1=월 2=화 ... 6=토 7=일
KST_DAY_KR=$(TZ=Asia/Seoul date +%A)
KST_TIME=$(TZ=Asia/Seoul date +%H:%M)

# ── 주말 실행 차단 ──────────────────────────────────────────────
if [ "$KST_DAY_NUM" -eq 6 ] || [ "$KST_DAY_NUM" -eq 7 ]; then
  echo "🚫 주말 실행 금지: KST 기준 ${KST_DATE} (${KST_DAY_KR}) — 자동 실행을 중단합니다." >&2
  exit 2
fi

# ── 요일별 조회 시작일 계산 ────────────────────────────────────
if [ "$KST_DAY_NUM" -eq 1 ]; then
  # 월요일: 지난 금요일(3일 전)부터 조회
  IS_MONDAY=true
  QUERY_START_DATE=$(TZ=Asia/Seoul date -d "3 days ago" +%Y-%m-%d)
  QUERY_START_GMAIL=$(TZ=Asia/Seoul date -d "3 days ago" +%Y/%m/%d)
else
  # 화~금: 어제부터 조회
  IS_MONDAY=false
  QUERY_START_DATE=$(TZ=Asia/Seoul date -d "yesterday" +%Y-%m-%d)
  QUERY_START_GMAIL=$(TZ=Asia/Seoul date -d "yesterday" +%Y/%m/%d)
fi

# ── 세션 환경변수 주입 ─────────────────────────────────────────
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  {
    echo "export KST_DATE=${KST_DATE}"
    echo "export KST_DAY_NUM=${KST_DAY_NUM}"
    echo "export IS_MONDAY=${IS_MONDAY}"
    echo "export QUERY_START_DATE=${QUERY_START_DATE}"
    echo "export QUERY_START_GMAIL=${QUERY_START_GMAIL}"
  } >> "$CLAUDE_ENV_FILE"
fi

echo "✅ [kst-date-check] ${KST_DATE} ${KST_TIME} KST | IS_MONDAY=${IS_MONDAY} | QUERY_START=${QUERY_START_DATE}" >&2
exit 0
