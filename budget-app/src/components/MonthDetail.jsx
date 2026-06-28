import { useRef } from 'react'
import { won, OWN, FCAT, FCAT_ICON, BIGS, OWNERS, savMeta } from '../lib/constants.js'
import { sum } from '../lib/compute.js'

const ownerOf = (o) => OWN[o] || OWN.기타

// ---- one swipeable row (swipe left to reveal delete, tap to edit) ----
function SwipeRow({ row, list, open, setSwipeOpenId, onEdit, onDelete }) {
  const ref = useRef(null)
  const st = useRef(null)

  const down = (e) => {
    st.current = { x: e.clientX, moved: false, open }
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch (_) {}
  }
  const move = (e) => {
    const s = st.current; if (!s) return
    const dx = e.clientX - s.x
    if (Math.abs(dx) > 4) s.moved = true
    const tx = Math.max(-84, Math.min(0, (s.open ? -84 : 0) + dx))
    if (ref.current) { ref.current.style.transition = 'none'; ref.current.style.transform = `translateX(${tx}px)` }
  }
  const up = (e) => {
    const s = st.current; st.current = null; if (!s) return
    const dx = e.clientX - s.x
    if (ref.current) { ref.current.style.transition = ''; ref.current.style.transform = '' }
    if (!s.moved) { onEdit(list, row.id); return }
    const willOpen = ((s.open ? -84 : 0) + dx) < -42
    setSwipeOpenId(willOpen ? row.id : null)
  }

  return (
    <div className="swrow" data-open={String(open)}>
      <div className="press" onClick={() => onDelete(list, row.id)} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 84, background: '#F04452', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, zIndex: 0 }}>삭제</div>
      <div ref={ref} className="swcontent" onPointerDown={down} onPointerMove={move} onPointerUp={up}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid #F4F6F8', background: '#fff', boxShadow: row.accent }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, background: row.tileBg }}>{row.tileEmoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#191F28' }}>{row.title}</div>
          {row.sub && <div style={{ fontSize: 12, color: '#8B95A1', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.sub}</div>}
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#191F28' }}>{row.amtText}</span>
          {row.tag && <span style={row.tagStyle}>{row.tag}</span>}
        </div>
      </div>
    </div>
  )
}

function buildRow(item, big, noPill) {
  const base = { id: item.id, title: item.title, amtText: won(item.amount) + '원', sub: item.memo || '', tag: '', tagStyle: null, accent: undefined }
  let tile
  if (big === 'income') tile = { e: '💰', bg: '#E8F3FF' }
  else if (big === 'savings') { const m = savMeta(item.cat || item.title); tile = { e: m.emoji, bg: m.bg } }
  else {
    if (item.kind === '고정') {
      const c = FCAT[item.cat] || '#868E96'
      tile = { e: FCAT_ICON[item.cat] || '💳', bg: c + '18' }
      base.accent = 'inset 3px 0 0 #DCE7FB'
      if (!noPill) { base.tag = item.cat; base.tagStyle = { fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: c + '18', color: c } }
    } else {
      tile = { e: '🧾', bg: '#FFF1F2' }
      base.accent = 'inset 3px 0 0 #FFE0CC'
      if (!noPill) { base.tag = '변동'; base.tagStyle = { fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: '#F2F4F6', color: '#8B95A1' } }
    }
  }
  base.tileEmoji = tile.e
  base.tileBg = tile.bg
  return base
}

export default function MonthDetail({ d, big, setBig, expOwner, setExpOwner, collapsed, toggleCollapse, swipeOpenId, setSwipeOpenId, onEdit, onDelete, onAdd, nav, names, onLoadFixed }) {
  const dispName = (o) => (names && names[o]) || o
  // ---- build owner groups ----
  const mkSections = (sections) => sections.map((sec) => ({
    hasLabel: !!sec.hasLabel, label: sec.label || '', subtotalText: sec.subtotalText || '', color: sec.color || '#8B95A1',
    items: sec.items.map((x) => ({ raw: x, row: buildRow(x, big, sec.noPill) })),
  }))

  const mkGroup = (o, name, allItems, sections, opts = {}) => {
    const w = ownerOf(o)
    const expanded = !collapsed[big + '|' + o]
    return {
      owner: o, name, initial: groupInitial(o), noChip: !!opts.noChip, chipBg: w.bg, chipColor: w.c,
      countText: allItems.length ? allItems.length + '건' : '',
      subtotalText: won(sum(allItems)) + '원', expanded,
      sections: mkSections(sections || [{ hasLabel: false, items: allItems }]),
    }
  }
  // 슬롯 이니셜 = 표시 이름 첫 글자
  const groupInitial = (o) => ((names && names[o] && names[o][0]) || (ownerOf(o).i))

  let ownerGroups = []
  if (big === 'savings') {
    ownerGroups = d.savings.length ? [mkGroup('공동', '이번 달 저축·투자', d.savings, null, { noChip: true })] : []
  } else if (big === 'income') {
    ownerGroups = OWNERS.map((o) => mkGroup(o, dispName(o), d.income.filter((x) => x.owner === o), null)).filter((g) => g.sections[0].items.length > 0)
  } else {
    const owners = expOwner === '전체' ? ['이현', '혜원'] : [expOwner]
    ownerGroups = owners.map((o) => {
      const all = d.expense.filter((x) => x.owner === o)
      const fx = all.filter((x) => x.kind === '고정')
      const vr = all.filter((x) => x.kind === '변동')
      const secs = []
      if (fx.length) secs.push({ hasLabel: true, label: '고정지출', color: '#3182F6', subtotalText: won(sum(fx)) + '원', items: fx })
      if (vr.length) secs.push({ hasLabel: true, label: '변동지출', color: '#FF8A3D', subtotalText: won(sum(vr)) + '원', items: vr, noPill: true })
      return mkGroup(o, dispName(o), all, secs)
    }).filter((g) => g.sections.length > 0)
  }
  const monthEmpty = ownerGroups.length === 0

  let grandLabel, grandTotalText
  if (big === 'expense' && expOwner !== '전체') {
    grandLabel = dispName(expOwner) + ' 지출 합계'
    grandTotalText = won(sum(d.expense.filter((x) => x.owner === expOwner))) + '원'
  } else {
    grandLabel = { income: '월 총수입', expense: '월 총지출', savings: '월 저축 합계' }[big]
    grandTotalText = won(sum(d[big])) + '원'
  }

  const listKey = big // entry "type" for mutations

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 58px 10px 20px' }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: '#191F28' }}>월별 상세</span>
        {nav}
      </div>

      <div style={{ display: 'flex', gap: 6, padding: '2px 16px 4px' }}>
        {BIGS.map((b) => (
          <div key={b[0]} className="press" onClick={() => { setBig(b[0]); setSwipeOpenId(null) }}
            style={{ flex: 1, textAlign: 'center', padding: 11, borderRadius: 12, fontSize: 15, fontWeight: 700, ...(big === b[0] ? { background: '#191F28', color: '#fff' } : { background: '#fff', color: '#8B95A1' }) }}>{b[1]}</div>
        ))}
      </div>

      {big === 'expense' && (
        <div style={{ display: 'flex', gap: 6, padding: '10px 16px 2px' }}>
          {['전체', '이현', '혜원'].map((o) => (
            <div key={o} className="press" onClick={() => { setExpOwner(o); setSwipeOpenId(null) }}
              style={{ flex: 1, textAlign: 'center', padding: 9, borderRadius: 11, fontSize: 14, fontWeight: 700, ...(expOwner === o ? { background: '#3182F6', color: '#fff' } : { background: '#fff', color: '#8B95A1' }) }}>{o === '전체' ? '전체' : dispName(o)}</div>
          ))}
        </div>
      )}

      {ownerGroups.map((g) => (
        <div key={g.owner} style={{ margin: '14px 16px 0' }}>
          <div className="press" onClick={() => toggleCollapse(big, g.owner)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '2px 6px 8px' }}>
            {!g.noChip && <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, background: g.chipBg, color: g.chipColor }}>{g.initial}</div>}
            <span style={{ fontSize: 15, fontWeight: 700, color: '#191F28' }}>{g.name}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#B0B8C1' }}>{g.countText}</span>
            <span style={{ marginLeft: 'auto', fontSize: 15, fontWeight: 800, color: '#4E5968' }}>{g.subtotalText}</span>
            <span style={{ display: 'flex', alignItems: 'center', transition: 'transform .25s', transform: `rotate(${g.expanded ? '0deg' : '-90deg'})` }}>
              <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 4l4 4 4-4" stroke="#B0B8C1" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          </div>
          {g.expanded && (
            <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 4px 16px rgba(30,50,90,.05)', overflow: 'hidden' }}>
              {g.sections.map((sec, si) => (
                <div key={si}>
                  {sec.hasLabel && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 16px', background: '#FAFBFC', borderBottom: '1px solid #F0F2F4' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, letterSpacing: '.2px', color: sec.color }}>
                        <span style={{ width: 7, height: 7, borderRadius: 2, background: sec.color }} />{sec.label}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#8B95A1' }}>{sec.subtotalText}</span>
                    </div>
                  )}
                  {sec.items.map((it) => (
                    <SwipeRow key={it.raw.id} row={it.row} list={listKey} open={swipeOpenId === it.raw.id}
                      setSwipeOpenId={setSwipeOpenId} onEdit={onEdit} onDelete={onDelete} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {monthEmpty && (
        <div style={{ margin: '24px 16px', textAlign: 'center', fontSize: 14, color: '#B0B8C1', lineHeight: 1.6 }}>아직 입력한 항목이 없어요.<br />아래 버튼으로 추가해 주세요.</div>
      )}

      <div style={{ margin: '16px 16px 0', background: '#fff', borderRadius: 16, padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 16px rgba(30,50,90,.05)' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#4E5968' }}>{grandLabel}</span>
        <span style={{ fontSize: 18, fontWeight: 800, color: '#191F28' }}>{grandTotalText}</span>
      </div>

      <div className="press" onClick={onAdd} style={{ margin: '12px 16px 0', background: '#E8F3FF', borderRadius: 14, padding: 14, textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#3182F6' }}>+ 항목 추가</div>

      {big === 'expense' && (
        <div className="press" onClick={onLoadFixed} style={{ margin: '10px 16px 0', background: '#F2F4F6', borderRadius: 14, padding: 14, textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#4E5968' }}>↻ 전월 고정지출 불러오기</div>
      )}
      <div style={{ height: 8 }} />
    </div>
  )
}
