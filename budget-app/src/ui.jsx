import { useState, useRef } from 'react';
import { OWNERS } from './store';

// ── 구성원 아바타 칩 ──
export function Avatar({ owner, size = 28 }) {
  const o = OWNERS[owner] || OWNERS.기타;
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', background: o.bg, color: o.text,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 700, flexShrink: 0,
    }}>{o.initial}</span>
  );
}

// ── 인라인 SVG 도넛 ──
export function Donut({ data, size = 160, thickness = 22, center }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F2F4F6" strokeWidth={thickness} />
        {total > 0 && data.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * c;
          const seg = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={d.color} strokeWidth={thickness}
              strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-acc}
              strokeLinecap="butt" />
          );
          acc += dash;
          return seg;
        })}
      </svg>
      {center && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        }}>{center}</div>
      )}
    </div>
  );
}

// ── 저축률 링 ──
export function RateRing({ pct, size = 140, thickness = 16, color = '#845EF7', label }) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const dash = Math.min(pct, 100) / 100 * c;
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F2F4F6" strokeWidth={thickness} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={thickness}
          strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 26, fontWeight: 800, color }}>{pct.toFixed(0)}%</span>
        {label && <span style={{ fontSize: 12, color: 'var(--sub)', marginTop: 2 }}>{label}</span>}
      </div>
    </div>
  );
}

// ── 세그먼트 토글 ──
export function Segment({ options, value, onChange, accent = '#3182F6' }) {
  return (
    <div style={{ display: 'flex', background: '#F2F4F6', borderRadius: 12, padding: 4, gap: 4 }}>
      {options.map(opt => {
        const v = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        const active = v === value;
        return (
          <button key={v} onClick={() => onChange(v)} style={{
            flex: 1, padding: '9px 0', borderRadius: 9, border: 'none',
            background: active ? '#fff' : 'transparent',
            color: active ? accent : 'var(--sub)', fontSize: 14,
            fontWeight: active ? 700 : 500,
            boxShadow: active ? '0 1px 4px rgba(30,50,90,.08)' : 'none',
            transition: 'all .15s',
          }}>{label}</button>
        );
      })}
    </div>
  );
}

// ── 우→좌 스와이프 삭제 행 ──
export function SwipeRow({ onDelete, onClick, children }) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(null);
  const moved = useRef(false);

  function down(x) { startX.current = x; moved.current = false; }
  function move(x) {
    if (startX.current === null) return;
    const dx = x - startX.current;
    if (dx < -4) { moved.current = true; setOffset(Math.max(dx, -76)); }
    else if (dx > 4 && offset < 0) { moved.current = true; setOffset(Math.min(0, -76 + dx + 76)); }
  }
  function up() {
    setOffset(offset < -38 ? -76 : 0);
    startX.current = null;
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 14 }}>
      <button onClick={onDelete} style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 76, border: 'none',
        background: '#F04452', color: '#fff', fontSize: 14, fontWeight: 700,
      }}>삭제</button>
      <div
        onTouchStart={e => down(e.touches[0].clientX)}
        onTouchMove={e => move(e.touches[0].clientX)}
        onTouchEnd={up}
        onMouseDown={e => down(e.clientX)}
        onMouseMove={e => { if (startX.current !== null) move(e.clientX); }}
        onMouseUp={up}
        onMouseLeave={() => { if (startX.current !== null) up(); }}
        onClick={() => { if (!moved.current && offset === 0) onClick?.(); }}
        style={{
          transform: `translateX(${offset}px)`, transition: startX.current === null ? 'transform .22s cubic-bezier(.22,1,.36,1)' : 'none',
          background: 'var(--card)', position: 'relative', zIndex: 1, userSelect: 'none',
        }}
      >{children}</div>
    </div>
  );
}

// ── 바텀시트 셸 ──
export function Sheet({ title, onClose, children, footer }) {
  return (
    <div className="sheet-backdrop" onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 100,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div className="sheet-panel no-scrollbar" onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 440, background: '#fff', borderRadius: '24px 24px 0 0',
        padding: '8px 20px 24px', maxHeight: '92vh', overflowY: 'auto',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E5E8EB', margin: '8px auto 14px' }} />
        {title && <h2 style={{ fontSize: 19, fontWeight: 800, margin: '0 0 18px' }}>{title}</h2>}
        {children}
        {footer}
      </div>
    </div>
  );
}
