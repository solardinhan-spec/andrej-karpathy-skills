# 04. BOM 구조 및 계층형 쿼리 (품목 단위)

> **키 정책:** BOM은 **제품(품목) 단위**로 구성하므로 노드 키는 `itemCode`이다.
> 도번(`dwgNo`)은 도면 문서 식별자이며 BOM 트리에는 등장하지 않는다.
> 각 품목의 대표 도면/리비전은 `items.latestRev` 또는 도면 검색으로 연결한다.

## 4.1 반도체 장비 BOM 설계 특성

```
CH-000 (Chiller System - Top Assembly)        itemCode
├── CH-001 (냉각 수조 서브어셈블리)         qty: 1
│   ├── CH-010 (SUS316L 수조 바디)          qty: 1
│   ├── CH-011 (히터 카트리지 250W)         qty: 4
│   └── CH-012 (온도 센서 PT100)            qty: 2
├── CH-002 (펌프 서브어셈블리)              qty: 1
│   ├── CH-020 (마그네틱 펌프 100LPM)       qty: 1
│   └── CH-021 (임펠러 AL6061 양극처리)     qty: 1
└── CH-004 (제어 패널 서브어셈블리)         qty: 1
    ├── EL-001 (PLC 컨트롤러)              qty: 1
    └── EL-002 (릴레이 보드 8ch)           qty: 1
```

> 한 품목(예: `CH-001`)이 조립도·상세도 등 여러 도면(`DWG-xxxx`)을 가질 수 있으나,
> BOM 노드는 품목 1개로 표현된다.

## 4.2 BOM 라우터 구현

```javascript
// src/routes/bom.js
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const Joi = require('joi');

const db = admin.firestore();

const bomSchema = Joi.object({
  parent: Joi.string().required(),       // itemCode
  revision: Joi.string().required(),
  children: Joi.array().items(
    Joi.object({
      itemCode: Joi.string().required(),
      qty: Joi.number().positive().required(),
      unit: Joi.string().valid('EA', 'SET', 'M', 'KG', 'L').default('EA'),
      remark: Joi.string().max(200).optional()
    })
  ).min(1).required()
});

// BOM 등록/갱신
router.post('/', async (req, res, next) => {
  try {
    if (!['designer', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'BOM 편집 권한이 없습니다.' });
    }
    const { error, value } = bomSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    const { parent, revision, children } = value;

    // 상위 품목 존재 확인
    const parentDoc = await db.collection('items').doc(parent).get();
    if (!parentDoc.exists) {
      return res.status(404).json({ success: false, error: `상위 품목 ${parent} 없음` });
    }

    // 하위 품목 유효성 검사
    const childCodes = children.map(c => c.itemCode);
    const childDocs = await Promise.all(childCodes.map(c => db.collection('items').doc(c).get()));
    const missing = childCodes.filter((_, i) => !childDocs[i].exists);
    if (missing.length) {
      return res.status(400).json({ success: false, error: `존재하지 않는 하위 품목: ${missing.join(', ')}` });
    }

    // 순환 참조 방지
    if (childCodes.includes(parent)) {
      return res.status(400).json({ success: false, error: 'BOM 순환 참조가 감지되었습니다.' });
    }

    await db.collection('bom').doc(`${parent}-BOM`).set({
      parent, revision, children,
      updatedBy: req.user.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ success: true, bomId: `${parent}-BOM` });
  } catch (err) { next(err); }
});

// Full BOM 트리 전개 (재귀 DFS)
router.get('/:itemCode/tree', async (req, res, next) => {
  try {
    const tree = await buildBOMTree(req.params.itemCode, 0, Number(req.query.maxDepth || 10), new Set());
    res.json({ success: true, bom: tree });
  } catch (err) { next(err); }
});

// Where-Used 역추적 (이 품목이 어느 상위에 쓰이는지)
router.get('/:itemCode/where-used', async (req, res, next) => {
  try {
    const { itemCode } = req.params;
    const results = [];
    const allBoms = await db.collection('bom').get();
    allBoms.forEach(doc => {
      const data = doc.data();
      const used = data.children?.find(c => c.itemCode === itemCode);
      if (used) results.push({ parent: data.parent, revision: data.revision, qty: used.qty });
    });
    res.json({ success: true, itemCode, usedIn: results, count: results.length });
  } catch (err) { next(err); }
});

// Indented BOM (인쇄/Excel 내보내기용)
router.get('/:itemCode/indented', async (req, res, next) => {
  try {
    const tree = await buildBOMTree(req.params.itemCode, 0, 10, new Set());
    const lines = [];
    flattenBOMTree(tree, 0, lines);
    res.json({ success: true, indented: lines });
  } catch (err) { next(err); }
});

/**
 * 재귀적 BOM 트리 빌더 (DFS) — visited로 순환 참조 방지
 */
async function buildBOMTree(itemCode, depth, maxDepth, visited) {
  if (depth > maxDepth || visited.has(itemCode)) {
    return { itemCode, name: '[최대 깊이 초과 또는 순환 참조]', children: null };
  }
  visited.add(itemCode);

  const [itemDoc, bomDoc] = await Promise.all([
    db.collection('items').doc(itemCode).get(),
    db.collection('bom').doc(`${itemCode}-BOM`).get()
  ]);
  const itemData = itemDoc.exists ? itemDoc.data() : { itemCode, name: '미등록 품목' };

  const node = {
    itemCode: itemData.itemCode,
    name: itemData.name,
    latestRev: itemData.latestRev,
    material: itemData.material,
    weight: itemData.weight,
    depth,
    children: null
  };

  if (bomDoc.exists) {
    const childTrees = await Promise.all(
      bomDoc.data().children.map(async (child) => {
        const sub = await buildBOMTree(child.itemCode, depth + 1, maxDepth, new Set(visited));
        return { ...sub, qty: child.qty, unit: child.unit || 'EA', remark: child.remark || '' };
      })
    );
    node.children = childTrees;
  }
  return node;
}

function flattenBOMTree(node, level, lines) {
  lines.push({
    level,
    itemCode: node.itemCode,
    name: node.name,
    latestRev: node.latestRev,
    material: node.material,
    qty: node.qty || 1,
    unit: node.unit || 'EA',
    indent: '  '.repeat(level) + (level > 0 ? '└─ ' : '')
  });
  if (node.children) node.children.forEach(c => flattenBOMTree(c, level + 1, lines));
}

module.exports = router;
```

## 4.3 BOM 데이터 모델 예시 (Firestore)

```json
// bom/CH-000-BOM
{
  "parent": "CH-000",
  "revision": "B",
  "children": [
    { "itemCode": "CH-001", "qty": 1, "unit": "SET", "remark": "냉각 서브어셈블리" },
    { "itemCode": "CH-002", "qty": 1, "unit": "SET", "remark": "펌프 서브어셈블리" },
    { "itemCode": "CH-004", "qty": 1, "unit": "SET", "remark": "제어 패널" }
  ],
  "updatedBy": "uid_engineer",
  "updatedAt": "2024-03-15T09:00:00Z"
}
```

## 4.4 품목 ↔ 도면 연결 조회

BOM 트리의 품목에서 실제 도면(DWG)으로 이동하려면 `drawings`를 `itemCode`로 조회한다.

```javascript
// 특정 품목의 도면 목록 (검색 API 또는 items 라우터 재사용)
const drawings = await db.collection('drawings')
  .where('itemCode', '==', itemCode)
  .get();
// → 각 도면의 dwgNo로 APS 뷰어 열람 (docs/03 search 라우터 참고)
```

---

## 4.5 Excel 내보내기 (BOM → .xlsx 다운로드)

`GET /api/bom/:itemCode/export` 를 호출하면 해당 품목의 BOM 전체를
인덴트(들여쓰기) 계층 구조로 표현한 Excel 파일이 다운로드된다.

### 다운로드 열 구성

| 열 | 필드 | 예시 |
|----|------|------|
| A | Level (계층) | `0`, `1`, `2` |
| B | Item Code | `CH-000` |
| C | 품목명 | `Chiller System` |
| D | 최신 Rev | `B` |
| E | 재질 | `SUS316L` |
| F | 수량(Qty) | `4` |
| G | 단위(Unit) | `EA` |
| H | 비고(Remark) | `히터 카트리지` |

### 라우터 추가 코드

```javascript
// src/routes/bom.js — 기존 router 선언 아래에 추가
const XLSX = require('xlsx');

// ─── Excel 내보내기 ───────────────────────────────────────────────────────────
router.get('/:itemCode/export', async (req, res, next) => {
  try {
    // BOM 트리 평탄화
    const tree = await buildBOMTree(req.params.itemCode, 0, 10, new Set());
    const rows = [];
    flattenBOMTree(tree, 0, rows);

    // 헤더
    const header = ['Level', 'Item Code', '품목명', '최신 Rev', '재질', '수량(Qty)', '단위(Unit)', '비고'];
    const data = [
      header,
      ...rows.map(r => [
        r.level,
        r.itemCode,
        r.name || '',
        r.latestRev || '',
        r.material || '',
        r.qty,
        r.unit,
        r.remark || ''
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);

    // 열 너비 자동 조정
    ws['!cols'] = [
      { wch: 7 },   // Level
      { wch: 12 },  // Item Code
      { wch: 30 },  // 품목명
      { wch: 8 },   // Rev
      { wch: 14 },  // 재질
      { wch: 9 },   // Qty
      { wch: 8 },   // Unit
      { wch: 30 },  // 비고
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BOM');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `BOM_${req.params.itemCode}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) { next(err); }
});
```

### 프론트엔드 다운로드 버튼

```tsx
// BOM 화면에서 다운로드 버튼 추가
async function downloadBOM(itemCode: string) {
  const res = await fetch(`/api/bom/${itemCode}/export`, {
    headers: { Authorization: `Bearer ${await getIdToken()}` },
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BOM_${itemCode}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// JSX
<button onClick={() => downloadBOM(itemCode)}>
  ⬇ Excel 다운로드
</button>
```

---

## 4.6 Excel 가져오기 (Excel 업로드 → BOM 등록)

Excel 파일을 업로드하면 파싱 후 Firestore에 BOM을 일괄 등록한다.
`designer` 이상 역할만 허용된다.

### 업로드 파일 형식 (필수 열)

| 열 | 필드 | 설명 | 필수 |
|----|------|------|------|
| A | parentCode | 상위 품목코드 | ✅ |
| B | itemCode | 하위 품목코드 | ✅ |
| C | qty | 수량 (양수) | ✅ |
| D | unit | 단위 (EA/SET/M/KG/L) | 선택 (기본 EA) |
| E | remark | 비고 | 선택 |

**행 예시:**

| parentCode | itemCode | qty | unit | remark |
|------------|----------|-----|------|--------|
| CH-000 | CH-001 | 1 | SET | 냉각 서브어셈블리 |
| CH-000 | CH-002 | 1 | SET | 펌프 서브어셈블리 |
| CH-001 | CH-010 | 1 | EA | SUS316L 수조 바디 |
| CH-001 | CH-011 | 4 | EA | 히터 카트리지 250W |

> 같은 `parentCode`를 가진 행들이 하나의 BOM 문서로 묶인다.
> 헤더 행(1행)은 자동으로 건너뛴다.

### 라우터 추가 코드

```javascript
// src/routes/bom.js — multer 메모리 스토리지 선언
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ─── Excel 가져오기 ───────────────────────────────────────────────────────────
router.post('/import', upload.single('file'), async (req, res, next) => {
  try {
    if (!['designer', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'BOM 편집 권한이 없습니다.' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Excel 파일이 없습니다.' });
    }

    // Excel 파싱
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });

    if (!rows.length) {
      return res.status(400).json({ success: false, error: '데이터 행이 없습니다.' });
    }

    // parentCode 기준으로 BOM 문서 그룹핑
    const bomMap = {};
    const validUnits = ['EA', 'SET', 'M', 'KG', 'L'];

    for (const row of rows) {
      const parentCode = String(row.parentCode || '').trim();
      const itemCode   = String(row.itemCode   || '').trim();
      const qty        = Number(row.qty);
      const unit       = validUnits.includes(String(row.unit).toUpperCase())
                           ? String(row.unit).toUpperCase()
                           : 'EA';
      const remark     = String(row.remark || '').trim();

      if (!parentCode || !itemCode) continue; // 빈 행 건너뜀
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ success: false,
          error: `잘못된 수량: parentCode=${parentCode}, itemCode=${itemCode}` });
      }
      if (itemCode === parentCode) {
        return res.status(400).json({ success: false,
          error: `순환 참조 감지: ${parentCode} → ${itemCode}` });
      }

      if (!bomMap[parentCode]) bomMap[parentCode] = [];
      bomMap[parentCode].push({ itemCode, qty, unit, remark });
    }

    // 품목 존재 여부 일괄 확인
    const allCodes = [...new Set([
      ...Object.keys(bomMap),
      ...Object.values(bomMap).flat().map(c => c.itemCode)
    ])];
    const itemDocs = await Promise.all(allCodes.map(c => db.collection('items').doc(c).get()));
    const missing = allCodes.filter((c, i) => !itemDocs[i].exists);
    if (missing.length) {
      return res.status(400).json({ success: false,
        error: `등록되지 않은 품목코드: ${missing.join(', ')}` });
    }

    // Firestore 일괄 저장 (배치)
    const batch = db.batch();
    for (const [parentCode, children] of Object.entries(bomMap)) {
      const ref = db.collection('bom').doc(`${parentCode}-BOM`);
      batch.set(ref, {
        parent: parentCode,
        revision: 'IMPORT',
        children,
        updatedBy: req.user.uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
    await batch.commit();

    res.json({
      success: true,
      imported: Object.keys(bomMap).length,
      message: `${Object.keys(bomMap).length}개 BOM 문서가 등록/갱신되었습니다.`
    });
  } catch (err) { next(err); }
});
```

### 프론트엔드 업로드 폼

```tsx
// BOM 화면에서 업로드 입력
async function importBOM(file: File) {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch('/api/bom/import', {
    method: 'POST',
    headers: { Authorization: `Bearer ${await getIdToken()}` },
    body: form,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  alert(data.message);
}

// JSX
<input
  type="file"
  accept=".xlsx,.xls"
  onChange={e => e.target.files?.[0] && importBOM(e.target.files[0])}
/>
```

---

## 4.7 Excel 템플릿 다운로드

빈 서식 파일을 제공하여 사용자가 작성 후 업로드하도록 안내한다.

```javascript
// src/routes/bom.js — 템플릿 파일 발급 (인증 불필요, GET)
router.get('/template', (req, res) => {
  const header = [['parentCode', 'itemCode', 'qty', 'unit', 'remark']];
  const example = [
    ['CH-000', 'CH-001', 1, 'SET', '냉각 서브어셈블리'],
    ['CH-000', 'CH-002', 1, 'SET', '펌프 서브어셈블리'],
    ['CH-001', 'CH-010', 1, 'EA', 'SUS316L 수조 바디'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([...header, ...example]);
  ws['!cols'] = [
    { wch: 14 }, { wch: 14 }, { wch: 8 }, { wch: 8 }, { wch: 30 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'BOM_Template');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="BOM_template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});
```

### API 요약

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| `GET` | `/api/bom/:itemCode/export` | BOM → Excel 다운로드 | 전체 사용자 |
| `POST` | `/api/bom/import` | Excel → BOM 일괄 등록 | designer 이상 |
| `GET` | `/api/bom/template` | 빈 서식 템플릿 다운로드 | 전체 사용자 |

> `xlsx` npm 패키지(`^0.18.5`)가 `backend/package.json`에 추가되어야 한다.
> Cloud Functions 배포 시 `npm ci`로 자동 설치된다.
