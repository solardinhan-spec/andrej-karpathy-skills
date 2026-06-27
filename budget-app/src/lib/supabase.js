import { createClient } from '@supabase/supabase-js'

// Trim to defend against trailing spaces / newlines from copy-paste in env vars.
const url = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

// Cloud mode is intended when both env vars are present.
export const isCloud = Boolean(url && anon)

function validUrl(u) {
  try {
    const p = new URL(u).protocol
    return p === 'http:' || p === 'https:'
  } catch (_) {
    return false
  }
}

// configError !== '' means env vars were provided but are malformed.
// We NEVER let createClient throw at module load (that would blank the whole app);
// instead we surface a readable message via useBudget.
export let configError = ''
export let supabase = null

if (isCloud) {
  if (!validUrl(url)) {
    configError = 'VITE_SUPABASE_URL 값이 올바른 주소가 아니에요. (https://... 형태여야 하며, 키 값과 바뀌지 않았는지 확인하세요)'
  } else if (!anon.startsWith('sb_') && !anon.startsWith('ey')) {
    configError = 'VITE_SUPABASE_ANON_KEY 값이 올바른 키가 아니에요. (sb_publishable_... 또는 ey... 로 시작해야 합니다)'
  } else {
    try {
      supabase = createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true } })
    } catch (e) {
      configError = 'Supabase 클라이언트 초기화에 실패했어요: ' + (e?.message || String(e))
    }
  }
}
