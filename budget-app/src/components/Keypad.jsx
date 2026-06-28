// 공용 숫자 키패드 (1~9, 00, 0, ⌫). onKey(k)로 입력 전달.
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫']

export default function Keypad({ onKey }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
      {KEYS.map((k) => (
        <div key={k} className="press" onClick={() => onKey(k)} style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#191F28', borderRadius: 14, background: '#F8FAFB' }}>{k}</div>
      ))}
    </div>
  )
}
