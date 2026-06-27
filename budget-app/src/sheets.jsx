import { useState } from 'react';
import { Sheet, Segment } from './ui';
import { FIXED_CAT_LIST, FIXED_CATS, formatNum, newId } from './store';

const field = { fontSize: 13, fontWeight: 600, color: 'var(--sub)', display: 'block', marginBottom: 7 };
const input = {
  width: '100%', padding: '13px 14px', borderRadius: 12, border: '1.5px solid #E5E8EB',
  fontSize: 15, background: '#fff', color: 'var(--ink)',
};

// 담당 칩 선택
function OwnerPick({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {options.map(o => {
        const active = o === value;
        return (
          <button key={o} onClick={() => onChange(o)} style={{
            flex: 1, padding: '11px 0', borderRadius: 12,
            border: `1.5px solid ${active ? '#3182F6' : '#E5E8EB'}`,
            background: active ? '#3182F6' : '#fff', color: active ? '#fff' : 'var(--sub)',
            fontSize: 14, fontWeight: 700,
          }}>{o}</button>
        );
      })}
    </div>
  );
}

// 카테고리 칩
function CatPick({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
      {FIXED_CAT_LIST.map(c => {
        const active = c === value;
        return (
          <button key={c} onClick={() => onChange(c)} style={{
            padding: '7px 13px', borderRadius: 11,
            border: `1.5px solid ${active ? FIXED_CATS[c] : '#E5E8EB'}`,
            background: active ? `${FIXED_CATS[c]}14` : '#fff',
            color: active ? FIXED_CATS[c] : 'var(--sub)', fontSize: 13,
            fontWeight: active ? 700 : 500,
          }}>{c}</button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// 빠른 입력 (FAB)
// ─────────────────────────────────────────────
export function QuickInputSheet({ onClose, onSubmit }) {
  const [type, setType] = useState('지출'); // 지출 / 수입 / 저축
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('고정'); // 고정 / 변동
  const [cat, setCat] = useState('생활');
  const [owner, setOwner] = useState('이현');
  const [memo, setMemo] = useState('');

  function key(k) {
    if (k === '←') setAmount(a => a.slice(0, -1));
    else if (amount.length < 10) setAmount(a => (a === '0' ? '' : a) + k);
  }

  function save() {
    const amt = Number(amount) || 0;
    if (!title.trim() || amt <= 0) return;
    if (type === '수입') onSubmit('income', { id: newId('i'), owner, title: title.trim(), amount: amt, memo });
    else if (type === '저축') onSubmit('savings', { id: newId('s'), owner: '공동', title: title.trim(), amount: amt, memo });
    else onSubmit('expense', { id: newId('e'), owner, kind, cat: kind === '고정' ? cat : '', title: title.trim(), amount: amt, memo });
    onClose();
  }

  const ownerOpts = type === '수입' ? ['이현', '혜원', '기타'] : ['이현', '혜원'];
  const accent = type === '수입' ? '#3182F6' : type === '저축' ? '#845EF7' : '#F04452';

  return (
    <Sheet title="빠른 입력" onClose={onClose}
      footer={
        <button onClick={save} disabled={!title.trim() || !Number(amount)} style={{
          width: '100%', marginTop: 18, padding: 16, borderRadius: 14, border: 'none',
          background: (!title.trim() || !Number(amount)) ? '#E5E8EB' : accent,
          color: (!title.trim() || !Number(amount)) ? '#B0B8C1' : '#fff', fontSize: 16, fontWeight: 700,
        }}>저장하기</button>
      }>
      <div style={{ marginBottom: 18 }}>
        <Segment options={['지출', '수입', '저축']} value={type} onChange={setType} accent={accent} />
      </div>

      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <span style={{ fontSize: 34, fontWeight: 800, color: amount ? accent : '#D1D6DB' }}>
          {amount ? formatNum(Number(amount)) : '0'}
        </span>
        <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--faint)', marginLeft: 4 }}>원</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 18 }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '←'].map(k => (
          <button key={k} onClick={() => key(k)} style={{
            padding: '14px 0', borderRadius: 12, border: 'none', background: '#F2F4F6',
            fontSize: 18, fontWeight: 700, color: 'var(--ink)',
          }}>{k}</button>
        ))}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={field}>내용</label>
        <input style={input} value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 스타벅스, 월급" />
      </div>

      {type === '지출' && (
        <>
          <div style={{ marginBottom: 14 }}>
            <label style={field}>유형</label>
            <Segment options={['고정', '변동']} value={kind} onChange={setKind} accent="#F04452" />
          </div>
          {kind === '고정' && (
            <div style={{ marginBottom: 14 }}>
              <label style={field}>카테고리</label>
              <CatPick value={cat} onChange={setCat} />
            </div>
          )}
        </>
      )}

      {type !== '저축' && (
        <div style={{ marginBottom: 14 }}>
          <label style={field}>담당</label>
          <OwnerPick options={ownerOpts} value={owner} onChange={setOwner} />
        </div>
      )}

      <div>
        <label style={field}>메모 (선택)</label>
        <input style={input} value={memo} onChange={e => setMemo(e.target.value)} placeholder="간단한 메모" />
      </div>
    </Sheet>
  );
}

// ─────────────────────────────────────────────
// 수정 시트
// ─────────────────────────────────────────────
export function EditSheet({ item, bucket, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState(item.title);
  const [amount, setAmount] = useState(String(item.amount));
  const [owner, setOwner] = useState(item.owner);
  const [kind, setKind] = useState(item.kind || '고정');
  const [cat, setCat] = useState(item.cat || '생활');
  const [memo, setMemo] = useState(item.memo || '');

  const isExpense = bucket === 'expense';
  const isSaving = bucket === 'savings';

  function save() {
    const amt = Number(amount) || 0;
    const next = { ...item, title: title.trim(), amount: amt, memo };
    if (!isSaving) next.owner = owner;
    if (isExpense) { next.kind = kind; next.cat = kind === '고정' ? cat : ''; }
    onSave(next);
    onClose();
  }

  const ownerOpts = bucket === 'income' ? ['이현', '혜원', '기타'] : ['이현', '혜원'];

  return (
    <Sheet title="항목 수정" onClose={onClose}
      footer={
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button onClick={() => { onDelete(); onClose(); }} style={{
            flex: 1, padding: 16, borderRadius: 14, border: 'none', background: '#FFEAEC',
            color: '#F04452', fontSize: 16, fontWeight: 700,
          }}>삭제</button>
          <button onClick={save} disabled={!title.trim()} style={{
            flex: 2, padding: 16, borderRadius: 14, border: 'none',
            background: title.trim() ? '#3182F6' : '#E5E8EB',
            color: title.trim() ? '#fff' : '#B0B8C1', fontSize: 16, fontWeight: 700,
          }}>저장</button>
        </div>
      }>
      <div style={{ marginBottom: 14 }}>
        <label style={field}>항목명</label>
        <input style={input} value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={field}>금액</label>
        <input style={{ ...input, textAlign: 'right', fontWeight: 700 }} type="number" inputMode="numeric"
          value={amount} onChange={e => setAmount(e.target.value)} />
      </div>
      {!isSaving && (
        <div style={{ marginBottom: 14 }}>
          <label style={field}>담당</label>
          <OwnerPick options={ownerOpts} value={owner} onChange={setOwner} />
        </div>
      )}
      {isExpense && (
        <>
          <div style={{ marginBottom: 14 }}>
            <label style={field}>유형</label>
            <Segment options={['고정', '변동']} value={kind} onChange={setKind} accent="#F04452" />
          </div>
          {kind === '고정' && (
            <div style={{ marginBottom: 14 }}>
              <label style={field}>구분</label>
              <CatPick value={cat} onChange={setCat} />
            </div>
          )}
        </>
      )}
      <div>
        <label style={field}>메모 (선택)</label>
        <input style={input} value={memo} onChange={e => setMemo(e.target.value)} />
      </div>
    </Sheet>
  );
}
