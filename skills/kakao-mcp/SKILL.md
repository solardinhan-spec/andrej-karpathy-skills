---
name: kakao-mcp
description: KakaoTalk connection via Play MCP. Use when integrating Claude Code with KakaoTalk messaging through the Kakao Play MCP server — sending messages, managing channels, and automating KakaoTalk workflows.
license: MIT
---

# KakaoTalk via Play MCP

Guide for connecting Claude Code to KakaoTalk using the Kakao Play MCP server.

## Setup

### 1. Register a KakaoTalk Channel

1. Go to [Kakao Developers](https://developers.kakao.com) and create an app.
2. Enable **KakaoTalk Channel** (카카오톡 채널) under your app.
3. Note your **REST API Key** and **Channel ID**.

### 2. Configure Play MCP in Claude Code

Add the following to your Claude Code MCP settings (`~/.claude/settings.json` or project `.claude/settings.json`):

```json
{
  "mcpServers": {
    "kakao-play": {
      "command": "npx",
      "args": ["-y", "kakao-play-mcp"],
      "env": {
        "KAKAO_REST_API_KEY": "<your-rest-api-key>",
        "KAKAO_CHANNEL_ID": "<your-channel-id>"
      }
    }
  }
}
```

### 3. Obtain an Access Token

**나에게 보내기** requires a user-level access token (OAuth 2.0 authorization code flow), not a client credentials token.

```bash
# Step 1 — Open in browser to authorize (replace CLIENT_ID and REDIRECT_URI)
https://kauth.kakao.com/oauth/authorize?client_id=<CLIENT_ID>&redirect_uri=<REDIRECT_URI>&response_type=code&scope=talk_message

# Step 2 — Exchange the returned code for a token
curl -X POST https://kauth.kakao.com/oauth/token \
  -d "grant_type=authorization_code" \
  -d "client_id=<CLIENT_ID>" \
  -d "redirect_uri=<REDIRECT_URI>" \
  -d "code=<AUTHORIZATION_CODE>"
```

Set the returned `access_token` as `KAKAO_ACCESS_TOKEN` in the MCP env block or a `.env` file (never commit credentials).

## Available Operations

Once connected, Claude Code can invoke these tools via the `kakao-play` MCP server:

| Tool | Description |
|------|-------------|
| `send_to_me` | Send a message to the authenticated user's own KakaoTalk (나에게 보내기) |
| `send_message` | Send a text message to a KakaoTalk channel |
| `send_template` | Send a structured message using a KakaoTalk template |
| `list_channels` | List accessible KakaoTalk channels |
| `get_channel_info` | Retrieve metadata for a specific channel |
| `upload_image` | Upload an image to use in messages |

## 나에게 보내기 (Send to Me)

Sends a message directly to the logged-in user's own KakaoTalk account.

**API endpoint:** `POST https://kapi.kakao.com/v2/api/talk/memo/default/send`  
**Required scope:** `talk_message`  
**Required header:** `Authorization: Bearer <access_token>`

### Text message payload

```json
{
  "template_object": {
    "object_type": "text",
    "text": "배포가 완료되었습니다.",
    "link": {
      "web_url": "https://example.com",
      "mobile_web_url": "https://example.com"
    }
  }
}
```

### Feed message payload (image + text)

```json
{
  "template_object": {
    "object_type": "feed",
    "content": {
      "title": "빌드 성공",
      "description": "모든 테스트가 통과했습니다.",
      "image_url": "https://example.com/image.png",
      "link": {
        "web_url": "https://example.com"
      }
    }
  }
}
```

### curl example

```bash
curl -X POST https://kapi.kakao.com/v2/api/talk/memo/default/send \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode 'template_object={"object_type":"text","text":"배포 완료!","link":{"web_url":"https://example.com"}}'
```

## Usage Examples

### 나에게 보내기

```
카카오톡으로 나에게 "배포 완료" 메시지 보내줘
```

Claude will call `send_to_me` with a text template.

### Send a simple channel message

```
카카오톡 채널에 "배포 완료" 메시지를 보내줘
```

Claude will call `send_message` with the channel ID and message text.

### Send a template message

```
주문 완료 알림 템플릿으로 사용자 홍길동에게 알림 보내줘
```

Claude will call `send_template` with the appropriate template ID and parameters.

## Security Guidelines

- **Never** hardcode API keys or access tokens in source files.
- Use environment variables or a secrets manager (e.g., AWS Secrets Manager, Vault).
- Rotate tokens regularly; KakaoTalk tokens expire after 6 hours by default.
- Restrict channel permissions to the minimum required scope.

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `401 Unauthorized` | Invalid or expired token | Re-obtain access token |
| `403 Forbidden` | Missing channel permission | Enable the required scope in Kakao Developers console |
| `404 Not Found` | Wrong channel ID | Verify channel ID in Kakao Developers dashboard |
| MCP server not found | Package not installed | Run `npm install -g kakao-play-mcp` |
