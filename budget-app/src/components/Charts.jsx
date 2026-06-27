// SVG chart components ported from the prototype's React.createElement code.
import { won } from '../lib/constants.js'

export function Donut({ segs, size = 128, stroke = 24 }) {
  const r = (size - stroke) / 2
  const C = 2 * Math.PI * r
  const total = segs.reduce((s, x) => s + x.value, 0) || 1
  let off = 0
  const circles = segs.filter((s) => s.value > 0).map((s, i) => {
    const len = (C * s.value) / total
    const el = (
      <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color}
        strokeWidth={stroke} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} />
    )
    off += len
    return el
  })
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>{circles}</svg>
    </div>
  )
}

export function Legend({ items }) {
  const vis = items.filter((x) => x.value > 0)
  if (!vis.length) return <div style={{ fontSize: 13, color: '#B0B8C1' }}>데이터 없음</div>
  const total = vis.reduce((s, x) => s + x.value, 0) || 1
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {vis.map((x, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 9, height: 9, borderRadius: 3, background: x.color, flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#4E5968' }}>{x.label}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#191F28' }}>{Math.round((x.value / total) * 100)}%</div>
        </div>
      ))}
    </div>
  )
}

export function OwnerBars({ rows, total }) {
  const mx = Math.max(total, 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
      {rows.map((r, i) => {
        const pct = (r.value / mx) * 100
        return (
          <div key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: r.bg, color: r.c, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{r.initial}</div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#4E5968' }}>{r.name}</span>
              <span style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 700, color: '#191F28' }}>{won(r.value)}원</span>
            </div>
            <div style={{ height: 8, borderRadius: 5, background: '#F2F4F6', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: pct + '%', borderRadius: 5, background: r.c, transition: 'width .5s' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function LineChart({ data }) {
  const W = 326, H = 140, pad = 22
  const max = Math.max(...data.map((d) => d.v)) * 1.1 || 1
  const X = (i) => pad + (i * (W - pad * 2)) / (data.length - 1)
  const Y = (v) => H - 24 - (v / max) * (H - 44)
  const pts = data.map((d, i) => [X(i), Y(d.v)])
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ')
  const area = line + ' L' + X(data.length - 1) + ' ' + (H - 24) + ' L' + pad + ' ' + (H - 24) + ' Z'
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3182F6" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#3182F6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#lg)" />
      <path d={line} fill="none" stroke="#3182F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={i === data.length - 1 ? 4.5 : 3} fill="#fff" stroke="#3182F6" strokeWidth="2.5" />
      ))}
      {data.map((d, i) => (
        <text key={'t' + i} x={X(i)} y={H - 6} fontSize="11" fill="#8B95A1" textAnchor="middle" fontWeight="600">{d.m}</text>
      ))}
    </svg>
  )
}

export function Ring({ pct }) {
  const size = 84, stroke = 10
  const r = (size - stroke) / 2
  const C = 2 * Math.PI * r
  const len = (C * Math.min(100, Math.max(0, pct))) / 100
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EDF1F5" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#3182F6" strokeWidth={stroke} strokeDasharray={`${len} ${C - len}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#3182F6' }}>{Math.round(pct)}%</div>
    </div>
  )
}

export function CompareBars({ values, labels, activeIdx }) {
  const max = Math.max(...values) * 1.1 || 1
  return (
    <div style={{ display: 'flex', gap: 18, alignItems: 'flex-end', height: 160, padding: '0 6px' }}>
      {values.map((vv, i) => {
        const active = i === activeIdx
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#191F28' }}>{won(vv)}</div>
            <div style={{ width: '100%', height: (vv / max) * 108, minHeight: 6, borderRadius: '10px 10px 0 0', background: active ? '#3182F6' : '#C5CCD3', transition: 'height .5s' }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: '#8B95A1' }}>{labels[i]}</div>
          </div>
        )
      })}
    </div>
  )
}
