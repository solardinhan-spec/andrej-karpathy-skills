# 06. Cloud Functions 자동화 (이벤트 트리거 + Google Workspace 연동)

> HTTP API(`exports.api`)와 동일한 `pdm-functions` 코드베이스에 둔다.
> 트리거는 `src/triggers.js`에 정의하고 `index.js`에서 re-export 한다 (docs/03 참고).

## 6.1 Functions 프로젝트 초기화

HTTP API와 동일 프로젝트(`pdm-functions/`)를 사용하므로 의존성은 이미 설치되어 있다.
추가로 Drive 백업이 필요하면 `googleapis`만 확인한다.

## 6.2 도면 배포 트리거 → Gmail 알림 + Drive 백업

```javascript
// src/triggers.js
const { onDocumentUpdated, onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { google } = require('googleapis');

if (!admin.apps.length) admin.initializeApp();

const db = admin.firestore();
const bucket = admin.storage().bucket();
const REGION = 'asia-northeast3';

/**
 * 트리거 1: 도면(dwgNo) 상태가 Released로 변경될 때
 * - 담당자 + 검토자 2명 + 관리자에게 Gmail 알림
 * - Google Drive 승인 도면 폴더 자동 백업
 */
exports.onDrawingReleased = onDocumentUpdated(
  { document: 'drawings/{dwgNo}', region: REGION },
  async (event) => {
    const newData = event.data.after.data();
    const prevData = event.data.before.data();
    if (newData.status !== 'Released' || prevData.status === 'Released') return null;

    const { dwgNo, itemCode, revision, title, filePath, authors = [], reviewers = [] } = newData;
    console.log(`[트리거] 도면 배포: ${dwgNo} (${itemCode}) Rev.${revision}`);

    // 수신자: 담당자 + 검토자 + 관리자
    const involvedUids = [...new Set([...authors, ...reviewers])];
    const userDocs = await Promise.all(involvedUids.map(uid => db.collection('users').doc(uid).get()));
    const adminSnap = await db.collection('users').where('role', '==', 'admin').get();
    const recipients = [
      ...userDocs.filter(d => d.exists).map(d => d.data().email),
      ...adminSnap.docs.map(d => d.data().email)
    ].filter(Boolean);

    await Promise.allSettled([
      sendApprovalEmail(dwgNo, itemCode, revision, title, recipients),
      backupToDrive(dwgNo, revision, filePath)
    ]);
    return null;
  }
);

/**
 * 트리거 2: 신규 품목(itemCode) 등록 시 관리자 알림
 */
exports.onItemCreated = onDocumentCreated(
  { document: 'items/{itemCode}', region: REGION },
  async (event) => {
    const { itemCode, name } = event.data.data();
    const adminSnap = await db.collection('users').where('role', '==', 'admin').limit(3).get();
    const emails = adminSnap.docs.map(d => d.data().email).filter(Boolean);
    if (emails.length) await sendNewItemNotification(itemCode, name, emails);
    return null;
  }
);

// ─────────────────────────────────────────────────────────────────────
// 헬퍼 함수들
// ─────────────────────────────────────────────────────────────────────

async function getGmailClient() {
  // Secret Manager에서 서비스 계정 키 로드 (운영 환경)
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/gmail.send']
  });
  const authClient = await auth.getClient();
  return google.gmail({ version: 'v1', auth: authClient });
}

async function sendApprovalEmail(dwgNo, itemCode, revision, title, recipients) {
  if (!recipients.length) return;

  const subject = `[PDM] 도면 배포 완료: ${dwgNo} (${itemCode}) Rev.${revision}`;
  const body = `
    안녕하세요,

    아래 도면이 검토자 2명 전원 승인되어 배포(Released)되었습니다.

    ────────────────────────
    도번: ${dwgNo}
    품목코드: ${itemCode}
    도면명: ${title}
    리비전: Rev.${revision}
    배포 일시: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
    ────────────────────────

    PDM 시스템에서 최신 도면을 확인해 주세요.
    ※ 이 메일은 자동으로 발송된 알림입니다.
  `.trim();

  try {
    const gmail = await getGmailClient();
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: createRawEmail(recipients, subject, body) }
    });
    console.log(`[Gmail] 배포 알림 발송 → ${recipients.join(', ')}`);
  } catch (err) {
    console.error(`[Gmail] 발송 실패: ${err.message}`);
  }
}

async function sendNewItemNotification(itemCode, name, recipients) {
  const subject = `[PDM] 신규 품목 등록: ${itemCode}`;
  const body = `신규 품목 ${itemCode} (${name})이 등록되었습니다.`;
  try {
    const gmail = await getGmailClient();
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: createRawEmail(recipients, subject, body) }
    });
  } catch (err) {
    console.error(`[Gmail] 신규 품목 알림 실패: ${err.message}`);
  }
}

async function backupToDrive(dwgNo, revision, filePath) {
  try {
    const drive = google.drive({ version: 'v3' });
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive.file']
    });
    drive.context._options.auth = await auth.getClient();

    // Cloud Storage에서 파일 스트림 가져오기
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    if (!exists) {
      console.warn(`[Drive] 파일 없음: ${filePath}`);
      return;
    }

    const stream = file.createReadStream();

    // Drive의 "승인 도면" 폴더에 업로드 (DWG 원본)
    const driveResponse = await drive.files.create({
      requestBody: {
        name: `${dwgNo}_REV_${revision}.dwg`,
        parents: [process.env.DRIVE_FOLDER_ID || 'root'],
        description: `PDM 자동 백업 - ${dwgNo} Rev.${revision}`
      },
      media: {
        mimeType: 'application/acad',
        body: stream
      }
    });

    console.log(`[Drive] 백업 완료: ${driveResponse.data.id}`);
  } catch (err) {
    console.error(`[Drive] 백업 실패: ${err.message}`);
  }
}

/**
 * RFC 2822 형식 이메일 생성 (Base64URL 인코딩)
 */
function createRawEmail(to, subject, body) {
  const email = [
    `To: ${to.join(', ')}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(body).toString('base64')
  ].join('\r\n');

  return Buffer.from(email).toString('base64url');
}
```

## 6.3 Cloud Functions 배포

```bash
# Functions 배포 (asia-northeast3 = 서울 리전)
firebase deploy --only functions

# 특정 Function만 배포
firebase deploy --only functions:onDrawingReleased

# 환경 변수 설정
firebase functions:config:set \
  drive.folder_id="YOUR_GOOGLE_DRIVE_FOLDER_ID"

# 배포 로그 확인
gcloud functions logs read onDrawingReleased --region=asia-northeast3
```

## 6.4 Cloud Scheduler를 이용한 정기 BOM 리포트 생성

```javascript
// functions/scheduledReports.js
const functions = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

/**
 * 매주 월요일 오전 8시에 주간 BOM 변경 현황 리포트 생성
 */
exports.weeklyBomReport = functions.onSchedule(
  {
    schedule: '0 8 * * 1', // 매주 월요일 08:00 KST
    timeZone: 'Asia/Seoul',
    region: 'asia-northeast3'
  },
  async () => {
    const db = admin.firestore();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // 지난 주 변경된 도면 조회
    const snapshot = await db.collection('drawings')
      .where('uploadedAt', '>=', oneWeekAgo)
      .orderBy('uploadedAt', 'desc')
      .get();

    const changes = snapshot.docs.map(d => d.data());

    // 리포트 Firestore 저장
    await db.collection('reports').add({
      type: 'weekly-bom',
      period: `${oneWeekAgo.toISOString()} ~ ${new Date().toISOString()}`,
      changes,
      generatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`[리포트] 주간 변경 현황 생성 완료: ${changes.length}건`);
  }
);
```
