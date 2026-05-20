---
name: email-briefing
description: Daily email briefing skill. Fetches recent Gmail threads from the past 24 hours, summarizes them, and saves the briefing as a new Notion page. Run this every weekday morning.
---

# Email Briefing

Fetch today's emails from Gmail, summarize them, and save to Notion.

## Steps

1. **Get today's emails** — Search Gmail for threads from the last 24 hours in inbox:
   - Query: `in:inbox newer_than:1d`
   - Fetch up to 20 threads. For each thread that has more than a snippet, call `get_thread` to read the full content.

2. **Summarize** — Group threads into categories:
   - **Action required** — emails needing a reply or decision
   - **FYI** — newsletters, notifications, updates worth knowing
   - **Ignore** — automated/promotional noise (skip these in the briefing)

3. **Save to Notion** — Search for a page titled "Email Briefing" in the workspace. If found, create a new child page under it. If not found, create a standalone page.
   - Page title format: `📧 {YYYY-MM-DD} 이메일 브리핑`
   - Content structure:
     ```
     ## 요약
     - 총 N개 스레드 (액션 필요: X개, 참고: Y개)

     ## 액션 필요
     - **[보낸 사람]** 제목 — 한 줄 요약 + 필요한 액션

     ## 참고
     - **[보낸 사람]** 제목 — 한 줄 요약
     ```

4. **Report** — After saving, print the Notion page URL and a one-line summary of what was written.

## Notes
- Today's date is available as `currentDate` in the system context.
- Skip threads from mailing lists unless they contain something time-sensitive.
- Write summaries in Korean.
- If there are no emails in the last 24 hours, create the page anyway with a "이메일 없음" note.
