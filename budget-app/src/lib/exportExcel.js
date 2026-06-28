import { START_MONTH, monthLabel } from './constants.js'

const TYPE_LABEL = { income: '수입', expense: '지출', savings: '저축' }

// Build an .xlsx of all ledger entries and trigger a download.
// xlsx is dynamically imported so it is not part of the initial bundle.
export async function exportExcel(data, names) {
  const XLSX = await import('xlsx')
  const label = (slot) => (names && names[slot]) || slot

  const header = ['월', '분류', '담당', '유형', '구분/종류', '항목명', '금액', '메모']
  const rows = [header]

  const months = Object.keys(data || {}).filter((k) => k >= START_MONTH).sort()
  for (const mk of months) {
    const d = data[mk]
    if (!d) continue
    for (const t of ['income', 'expense', 'savings']) {
      for (const it of d[t]) {
        rows.push([
          monthLabel(mk),
          TYPE_LABEL[t],
          label(it.owner) || '',
          it.kind || '',
          it.cat || '',
          it.title || '',
          Number(it.amount) || 0,
          it.memo || '',
        ])
      }
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 11 }, { wch: 7 }, { wch: 7 }, { wch: 7 }, { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 20 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '가계부')
  XLSX.writeFile(wb, `가계부_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
