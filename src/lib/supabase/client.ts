import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export function isSupabaseConfigured() {
  return typeof supabaseUrl === 'string' && supabaseUrl.length > 0
    && typeof supabaseAnonKey === 'string' && supabaseAnonKey.length > 0
}

let cachedClient: SupabaseClient | null = null

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null
  if (cachedClient) return cachedClient

  cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  })
  return cachedClient
}
