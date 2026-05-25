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
