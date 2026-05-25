# 06. Cloud Functions 자동화 (이벤트 트리거 + Google Workspace 연동)

## 6.1 Functions 프로젝트 초기화

```bash
mkdir pdm-functions && cd pdm-functions
npm init -y
npm install firebase-functions firebase-admin googleapis nodemailer
npm install -D firebase-functions-test
```

## 6.2 도면 승인 트리거 → Gmail 알림 + Drive 백업

```javascript
// functions/index.js
const functions = require('firebase-functions/v2');
const admin = require('firebase-admin');
const { google } = require('googleapis');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

/**
 * 트리거 1: 도면 상태가 Released로 변경될 때
 * - 담당 부서 Gmail 알림 발송
 * - Google Drive 승인 도면 폴더 자동 백업
 */
exports.onDrawingReleased = functions.firestore.onDocumentUpdated(
  'drawings/{drawingId}',
  async (event) => {
    const newData = event.data.after.data();
    const prevData = event.data.before.data();

    if (newData.status !== 'Released' || prevData.status === 'Released') {
      return null; // Released로 변경된 시점만 처리
    }

    const { partNo, revision, approvedByName, filePath } = newData;

    console.log(`[트리거] 도면 배포 완료: ${partNo} Rev.${revision}`);

    // 관련 수신자 목록 조회 (부서 이메일 설정)
    const recipientSnapshot = await db.collection('users')
      .where('role', 'in', ['admin', 'reviewer'])
      .get();

    const recipients = recipientSnapshot.docs.map(d => d.data().email).filter(Boolean);

    await Promise.allSettled([
      sendApprovalEmail(partNo, revision, approvedByName, recipients),
      backupToDrive(partNo, revision, filePath)
    ]);

    return null;
  }
);

/**
 * 트리거 2: 새 Part 등록 시 설계팀장에게 알림
 */
exports.onNewPartCreated = functions.firestore.onDocumentCreated(
  'parts/{partNo}',
  async (event) => {
    const partData = event.data.data();
    const { partNo, name, createdByName } = partData;

    const managerSnapshot = await db.collection('users')
      .where('role', '==', 'admin')
      .limit(3)
      .get();

    const managerEmails = managerSnapshot.docs.map(d => d.data().email).filter(Boolean);

    if (managerEmails.length > 0) {
      await sendNewPartNotification(partNo, name, createdByName, managerEmails);
    }

    return null;
  }
);

/**
 * 트리거 3: ECN 발행 시 영향받는 품목 설계자 알림
 */
exports.onEcnCreated = functions.firestore.onDocumentCreated(
  'ecn/{ecnNo}',
  async (event) => {
    const ecnData = event.data.data();
    const { ecnNo, affectedParts, changeReason } = ecnData;

    // 영향받는 Part들의 생성자 이메일 수집
    const partDocs = await Promise.all(
      affectedParts.map(pn => db.collection('parts').doc(pn).get())
    );

    const designerUids = [...new Set(
      partDocs.filter(d => d.exists).map(d => d.data().createdBy)
    )];

    const userDocs = await Promise.all(
      designerUids.map(uid => db.collection('users').doc(uid).get())
    );

    const emails = userDocs.filter(d => d.exists).map(d => d.data().email).filter(Boolean);

    if (emails.length > 0) {
      await sendEcnNotification(ecnNo, affectedParts, changeReason, emails);
    }

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

async function sendApprovalEmail(partNo, revision, approvedBy, recipients) {
  if (!recipients.length) return;

  const subject = `[PDM] 도면 배포 완료: ${partNo} Rev.${revision}`;
  const body = `
    안녕하세요,

    아래 도면이 최종 승인되어 배포(Released) 상태로 전환되었습니다.

    ────────────────────────
    품번: ${partNo}
    리비전: Rev.${revision}
    승인자: ${approvedBy}
    배포 일시: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
    ────────────────────────

    PDM 시스템에서 최신 도면을 확인해 주세요.

    ※ 이 메일은 자동으로 발송된 알림입니다.
  `.trim();

  try {
    const gmail = await getGmailClient();
    const message = createRawEmail(recipients, subject, body);

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: message }
    });

    console.log(`[Gmail] 알림 발송 완료 → ${recipients.join(', ')}`);
  } catch (err) {
    console.error(`[Gmail] 발송 실패: ${err.message}`);
  }
}

async function sendNewPartNotification(partNo, name, createdBy, recipients) {
  const subject = `[PDM] 신규 품목 등록: ${partNo}`;
  const body = `신규 품번 ${partNo} (${name})이 ${createdBy}에 의해 등록되었습니다.`;

  try {
    const gmail = await getGmailClient();
    const message = createRawEmail(recipients, subject, body);
    await gmail.users.messages.send({ userId: 'me', requestBody: { raw: message } });
  } catch (err) {
    console.error(`[Gmail] 신규 품목 알림 실패: ${err.message}`);
  }
}

async function sendEcnNotification(ecnNo, affectedParts, reason, recipients) {
  const subject = `[PDM] ECN 발행: ${ecnNo}`;
  const body = `
    ECN 번호: ${ecnNo}
    영향 품번: ${affectedParts.join(', ')}
    변경 사유: ${reason}

    PDM 시스템에서 ECN 내용을 확인하고 필요한 조치를 취해 주세요.
  `.trim();

  try {
    const gmail = await getGmailClient();
    const message = createRawEmail(recipients, subject, body);
    await gmail.users.messages.send({ userId: 'me', requestBody: { raw: message } });
  } catch (err) {
    console.error(`[Gmail] ECN 알림 실패: ${err.message}`);
  }
}

async function backupToDrive(partNo, revision, filePath) {
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

    // Drive의 "승인 도면" 폴더에 업로드
    const driveResponse = await drive.files.create({
      requestBody: {
        name: `${partNo}_REV_${revision}.pdf`,
        parents: [process.env.DRIVE_FOLDER_ID || 'root'],
        description: `PDM 자동 백업 - ${partNo} Rev.${revision}`
      },
      media: {
        mimeType: 'application/pdf',
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
