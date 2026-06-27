import { useState } from 'react';
import { Avatar, Segment, SwipeRow } from '../ui';
import { totals, formatKRW, formatNum, FIXED_CATS, OWNERS } from '../store';

const BIG_TABS = [
  { id: 'income', label: '수입', color: '#3182F6' },
  { id: 'expense', label: '지출', color: '#F04452' },
  { id: 'savings', label: '저축', color: '#845EF7' },
];

const sum = (arr) => arr.reduce((s, x) => s + (x.amount || 0), 0);

// 고정지출 행 (액센트 바 + 카테고리 칩)
function FixedRow({ item, onClick, onDelete }) {
  const color = FIXED_CATS[item.cat] || '#868E96';
  return (
    <SwipeRow onClick={onClick} onDelete={onDelete}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '13px 14px 13px 0', borderLeft: `3px solid ${color}`, paddingLeft: 13 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</p>
          <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}14`, padding: '2px 7px', borderRadius: 8, marginTop: 4, display: 'inline-block' }}>{item.cat || '기타'}</span>
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, marginLeft: 10 }}>{formatNum(item.amount)}</span>
      </div>
    </SwipeRow>
  );
}

// 변동지출/수입/저축 단순 행
function PlainRow({ item, onClick, onDelete, color = '#FF8A3D', showDot = true }) {
  return (
    <SwipeRow onClick={onClick} onDelete={onDelete}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 14px' }}>
        {showDot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, marginRight: 10, flexShrink: 0 }} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</p>
          {item.memo && <p style={{ fontSize: 12, color: 'var(--sub)', margin: '3px 0 0' }}>{item.memo}</p>}
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, marginLeft: 10 }}>{formatNum(item.amount)}</span>
      </div>
    </SwipeRow>
  );
}

// 소그룹 (고정/변동) 헤더
function SubHead({ dot, label, amount }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px 8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sub)' }}>{label}</span>
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sub)' }}>{formatNum(amount)}</span>
    </div>
  );
}

// 구성원 그룹 (펼침/접힘)
function OwnerGroup({ owner, count, subtotal, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="card" style={{ padding: '6px 16px 10px', marginBottom: 12 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0',
        background: 'none', border: 'none',
      }}>
        <Avatar owner={owner} />
        <span style={{ fontSize: 15, fontWeight: 700, color: OWNERS[owner]?.text }}>{owner}</span>
        <span style={{ fontSize: 12, color: 'var(--faint)' }}>{count}건</span>
        <span style={{ marginLeft: 'auto', fontSize: 15, fontWeight: 700 }}>{formatKRW(subtotal)}</span>
        <span style={{ fontSize: 12, color: 'var(--faint)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

export default function MonthScreen({ month, onRowClick, onDelete, onAdd }) {
  const [tab, setTab] = useState('expense');
  const [filter, setFilter] = useState('전체');
  const t = totals(month);

  const owners = tab === 'income' ? ['이현', '혜원', '기타'] : ['이현', '혜원'];

  function renderBucket() {
    if (tab === 'savings') {
      const subtotal = sum(month.savings);
      return (
        <>
          <div className="card" style={{ padding: '6px 16px 12px', marginBottom: 12 }}>
            {month.savings.map(s => (
              <PlainRow key={s.id} item={s} color="#845EF7"
                onClick={() => onRowClick(s, 'savings')} onDelete={() => onDelete(s.id, 'savings')} />
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px 4px', borderTop: '1px solid #F2F4F6', marginTop: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--sub)' }}>저축 합계</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#845EF7' }}>{formatKRW(subtotal)}</span>
            </div>
          </div>
        </>
      );
    }

    const list = tab === 'income' ? month.income : month.expense;
    const visibleOwners = (tab === 'expense' && filter !== '전체') ? [filter] : owners;

    return visibleOwners.map(owner => {
      const items = list.filter(x => x.owner === owner);
      if (items.length === 0 && tab === 'income') return null;
      const subtotal = sum(items);

      return (
        <OwnerGroup key={owner} owner={owner} count={items.length} subtotal={subtotal}>
          {tab === 'expense' ? (
            <ExpenseGroupBody items={items} onRowClick={onRowClick} onDelete={onDelete} />
          ) : (
            items.map(it => (
              <PlainRow key={it.id} item={it} color="#3182F6"
                onClick={() => onRowClick(it, 'income')} onDelete={() => onDelete(it.id, 'income')} />
            ))
          )}
        </OwnerGroup>
      );
    });
  }

  return (
    <div style={{ padding: '4px 16px 16px' }}>
      <div style={{ marginBottom: 14 }}>
        <Segment options={BIG_TABS.map(t => ({ value: t.id, label: t.label }))} value={tab}
          onChange={setTab} accent={BIG_TABS.find(b => b.id === tab).color} />
      </div>

      {tab === 'expense' && (
        <div style={{ marginBottom: 12 }}>
          <Segment options={['전체', '이현', '혜원']} value={filter} onChange={setFilter} accent="#F04452" />
        </div>
      )}

      {renderBucket()}

      {/* 합계 + 항목 추가 */}
      <div className="card" style={{ padding: '16px 18px', marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, color: 'var(--sub)', fontWeight: 600 }}>
          {tab === 'income' ? '총수입' : tab === 'savings' ? '총저축' : '총지출'}
        </span>
        <span style={{ fontSize: 18, fontWeight: 800, color: BIG_TABS.find(b => b.id === tab).color }}>
          {formatKRW(tab === 'income' ? t.income : tab === 'savings' ? t.savings : t.expense)}
        </span>
      </div>

      <button onClick={() => onAdd(tab)} style={{
        width: '100%', marginTop: 12, padding: 15, borderRadius: 14, border: '1.5px dashed #C9D2DB',
        background: '#fff', color: 'var(--sub)', fontSize: 14, fontWeight: 700,
      }}>+ 항목 추가</button>
    </div>
  );
}

// 지출 그룹 본문 (고정/변동 소그룹)
function ExpenseGroupBody({ items, onRowClick, onDelete }) {
  const fixedItems = items.filter(e => e.kind === '고정');
  const varyItems = items.filter(e => e.kind === '변동');
  return (
    <>
      {fixedItems.length > 0 && (
        <div style={{ marginBottom: varyItems.length ? 14 : 4 }}>
          <SubHead dot="#3182F6" label="고정지출" amount={sum(fixedItems)} />
          {fixedItems.map(it => (
            <FixedRow key={it.id} item={it}
              onClick={() => onRowClick(it, 'expense')} onDelete={() => onDelete(it.id, 'expense')} />
          ))}
        </div>
      )}
      {varyItems.length > 0 && (
        <div>
          <SubHead dot="#FF8A3D" label="변동지출" amount={sum(varyItems)} />
          {varyItems.map(it => (
            <PlainRow key={it.id} item={it} color="#FF8A3D"
              onClick={() => onRowClick(it, 'expense')} onDelete={() => onDelete(it.id, 'expense')} />
          ))}
        </div>
      )}
      {items.length === 0 && <p style={{ fontSize: 13, color: 'var(--faint)', padding: '6px 2px 10px' }}>항목이 없어요</p>}
    </>
  );
}
