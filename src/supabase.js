import { createClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

let client = null

/** 未配置 env 时关闭云同步，应用仍可纯本地使用 */
export function isSyncConfigured() {
  return !!(url && anonKey)
}

export function getSupabase() {
  if (!isSyncConfigured()) return null
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    })
  }
  return client
}
