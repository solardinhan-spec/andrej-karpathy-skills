# 04. BOM 구조 및 계층형 쿼리

## 4.1 반도체 장비 BOM 설계 특성

반도체 장비(Chiller, Wafer Chuck)의 BOM은 다음 특성을 가집니다:

```
CH-000 (Chiller System - Top Assembly)
├── CH-001 (냉각 수조 서브어셈블리)         qty: 1
│   ├── CH-010 (SUS316L 수조 바디)          qty: 1
│   ├── CH-011 (히터 카트리지 250W)         qty: 4
│   └── CH-012 (온도 센서 PT100)            qty: 2
├── CH-002 (펌프 서브어셈블리)              qty: 1
│   ├── CH-020 (마그네틱 펌프 100LPM)       qty: 1
│   ├── CH-021 (임펠러 AL6061 양극처리)     qty: 1
│   └── CH-022 (펌프 하우징 볼트 M6x20)    qty: 8
├── CH-003 (배관 서브어셈블리)              qty: 1
│   ├── CH-030 (PFA 튜브 OD6 x L500)       qty: 6
│   ├── CH-031 (스테인리스 피팅 1/4")       qty: 12
│   └── CH-032 (차단 밸브 소형)             qty: 4
└── CH-004 (제어 패널 서브어셈블리)         qty: 1
    ├── EL-001 (PLC 컨트롤러)              qty: 1
    └── EL-002 (릴레이 보드 8ch)           qty: 1
```

## 4.2 BOM 라우터 구현

```javascript
// src/routes/bom.js
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const Joi = require('joi');

const db = admin.firestore();

// BOM 등록/갱신
const bomSchema = Joi.object({
  parent: Joi.string().required(),
  revision: Joi.string().required(),
  children: Joi.array().items(
    Joi.object({
      partNo: Joi.string().required(),
      qty: Joi.number().positive().required(),
      unit: Joi.string().valid('EA', 'SET', 'M', 'KG', 'L').default('EA'),
      remark: Joi.string().max(200).optional()
    })
  ).min(1).required()
});

router.post('/', async (req, res, next) => {
  try {
    // 설계자 이상만 BOM 편집 가능
    if (!['designer', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'BOM 편집 권한이 없습니다.' });
    }

    const { error, value } = bomSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    const { parent, revision, children } = value;

    // 상위 Part 존재 여부 확인
    const parentDoc = await db.collection('parts').doc(parent).get();
    if (!parentDoc.exists) {
      return res.status(404).json({ success: false, error: `상위 품번 ${parent}이 존재하지 않습니다.` });
    }

    // 하위 Part 전체 유효성 검사
    const childPartNos = children.map(c => c.partNo);
    const childDocs = await Promise.all(
      childPartNos.map(pn => db.collection('parts').doc(pn).get())
    );

    const missingParts = childDocs
      .filter(doc => !doc.exists)
      .map((_, i) => childPartNos[i]);

    if (missingParts.length > 0) {
      return res.status(400).json({
        success: false,
        error: `존재하지 않는 하위 품번: ${missingParts.join(', ')}`
      });
    }

    // 순환 참조 방지 (자기 자신이 하위에 포함되는 경우)
    if (childPartNos.includes(parent)) {
      return res.status(400).json({ success: false, error: 'BOM 순환 참조가 감지되었습니다.' });
    }

    const bomId = `${parent}-BOM`;
    await db.collection('bom').doc(bomId).set({
      parent,
      revision,
      children,
      updatedBy: req.user.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, bomId, message: 'BOM이 등록되었습니다.' });
  } catch (err) {
    next(err);
  }
});

// Full BOM 트리 전개 (재귀 DFS)
router.get('/:parentPartNo/tree', async (req, res, next) => {
  try {
    const { parentPartNo } = req.params;
    const { maxDepth = 10 } = req.query;

    const tree = await buildBOMTree(parentPartNo, 0, Number(maxDepth), new Set());
    res.json({ success: true, bom: tree });
  } catch (err) {
    next(err);
  }
});

// BOM Where-Used 역추적 (특정 Part가 어느 상위 어셈블리에 사용되는지)
router.get('/:partNo/where-used', async (req, res, next) => {
  try {
    const { partNo } = req.params;
    const results = [];

    const bomSnapshot = await db.collection('bom')
      .where('children', 'array-contains-any', [{ partNo }])
      .get();

    // Firestore array-contains-any는 정확한 객체 매칭이 필요하므로 필터링 처리
    const allBoms = await db.collection('bom').get();

    allBoms.forEach(doc => {
      const data = doc.data();
      const isUsed = data.children?.some(c => c.partNo === partNo);
      if (isUsed) {
        results.push({
          parentPartNo: data.parent,
          bomRevision: data.revision,
          qty: data.children.find(c => c.partNo === partNo)?.qty
        });
      }
    });

    res.json({ success: true, partNo, usedIn: results, count: results.length });
  } catch (err) {
    next(err);
  }
});

// BOM Indented 텍스트 출력 (인쇄/Excel 내보내기용)
router.get('/:parentPartNo/indented', async (req, res, next) => {
  try {
    const tree = await buildBOMTree(req.params.parentPartNo, 0, 10, new Set());
    const lines = [];
    flattenBOMTree(tree, 0, lines);

    res.json({ success: true, indented: lines });
  } catch (err) {
    next(err);
  }
});

/**
 * 재귀적 BOM 트리 빌더 (DFS)
 * visited Set으로 순환 참조 방지
 */
async function buildBOMTree(partNo, depth, maxDepth, visited) {
  if (depth > maxDepth || visited.has(partNo)) {
    return { partNo, name: '[최대 깊이 초과 또는 순환 참조]', children: null };
  }

  visited.add(partNo);

  const [partDoc, bomSnapshot] = await Promise.all([
    db.collection('parts').doc(partNo).get(),
    db.collection('bom').doc(`${partNo}-BOM`).get()
  ]);

  const partData = partDoc.exists ? partDoc.data() : { partNo, name: '미등록 품목' };

  const node = {
    partNo: partData.partNo,
    name: partData.name,
    revision: partData.revision,
    material: partData.material,
    status: partData.status,
    weight: partData.weight,
    depth,
    children: null
  };

  if (bomSnapshot.exists) {
    const bomData = bomSnapshot.data();
    const childVisited = new Set(visited); // 각 분기별 독립적인 visited

    const childTrees = await Promise.all(
      bomData.children.map(async (child) => {
        const childTree = await buildBOMTree(child.partNo, depth + 1, maxDepth, new Set(childVisited));
        return { ...childTree, qty: child.qty, unit: child.unit || 'EA', remark: child.remark || '' };
      })
    );

    node.children = childTrees;
  }

  return node;
}

/**
 * 트리를 들여쓰기 평탄화 (Indented BOM)
 */
function flattenBOMTree(node, level, lines) {
  lines.push({
    level,
    partNo: node.partNo,
    name: node.name,
    revision: node.revision,
    material: node.material,
    status: node.status,
    qty: node.qty || 1,
    unit: node.unit || 'EA',
    indent: '  '.repeat(level) + (level > 0 ? '└─ ' : '')
  });

  if (node.children) {
    node.children.forEach(child => flattenBOMTree(child, level + 1, lines));
  }
}

module.exports = router;
```

## 4.3 BOM 데이터 모델 예시 (Firestore 저장 구조)

```json
// bom/CH-000-BOM
{
  "parent": "CH-000",
  "revision": "B",
  "children": [
    { "partNo": "CH-001", "qty": 1, "unit": "SET", "remark": "냉각 서브어셈블리" },
    { "partNo": "CH-002", "qty": 1, "unit": "SET", "remark": "펌프 서브어셈블리" },
    { "partNo": "CH-003", "qty": 1, "unit": "SET", "remark": "배관 서브어셈블리" },
    { "partNo": "CH-004", "qty": 1, "unit": "SET", "remark": "제어 패널" }
  ],
  "updatedBy": "uid_engineer",
  "updatedAt": "2024-03-15T09:00:00Z"
}
```

## 4.4 BOM 변경 이력 관리 (ECN 연계)

BOM이 변경될 때마다 ECN(Engineering Change Notice)을 발행하여 이력을 추적합니다.

```javascript
// src/routes/ecn.js
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

const db = admin.firestore();

// ECN 자동 채번
async function generateEcnNo() {
  const year = new Date().getFullYear();
  const ref = db.collection('sequences').doc(`ECN-${year}`);

  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    const nextSeq = doc.exists ? doc.data().currentSeq + 1 : 1;
    transaction.set(ref, { currentSeq: nextSeq });
    return `ECN-${year}-${String(nextSeq).padStart(3, '0')}`;
  });
}

// ECN 발행
router.post('/', async (req, res, next) => {
  try {
    const { affectedParts, changeReason, changeDescription, requestedBy } = req.body;

    const ecnNo = await generateEcnNo();

    await db.collection('ecn').doc(ecnNo).set({
      ecnNo,
      affectedParts,
      changeReason,
      changeDescription,
      requestedBy: req.user.uid,
      requestedByName: req.user.name,
      status: 'Open',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(201).json({ success: true, ecnNo });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```
