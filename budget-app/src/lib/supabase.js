import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

// Cloud mode is enabled only when both env vars are present.
// Otherwise the app falls back to on-device localStorage (single-device use).
export const isCloud = Boolean(url && anon)

export const supabase = isCloud
  ? createClient(url, anon, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null
