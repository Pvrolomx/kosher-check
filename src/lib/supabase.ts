import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type KosherCategory = 'carne' | 'lacteo' | 'parve'
export type KosherCertifier = 'KMD' | 'KA' | 'OU' | 'OK' | 'manual'

export interface KosherProduct {
  id?: string
  barcode?: string | null
  name: string
  brand?: string | null
  category?: KosherCategory | null
  certifier?: KosherCertifier | null
  is_kosher: boolean
  notes?: string | null
  created_at?: string
}

export interface HistoryEntry {
  id: string
  query: string
  result: 'kosher' | 'not_kosher' | 'not_found'
  product?: KosherProduct
  timestamp: number
  method: 'barcode' | 'search' | 'photo'
}

// Local cache for offline use
const CACHE_KEY = 'kosher_products_cache'
const HISTORY_KEY = 'kosher_history'
const MAX_HISTORY = 50

export function getCachedProducts(): KosherProduct[] {
  try {
    if (typeof window === 'undefined') return []
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function setCachedProducts(products: KosherProduct[]) {
  try {
    if (typeof window === 'undefined') return
    localStorage.setItem(CACHE_KEY, JSON.stringify(products))
  } catch {}
}

export function getHistory(): HistoryEntry[] {
  try {
    if (typeof window === 'undefined') return []
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addToHistory(entry: Omit<HistoryEntry, 'id' | 'timestamp'>) {
  try {
    if (typeof window === 'undefined') return
    const history = getHistory()
    const newEntry: HistoryEntry = {
      ...entry,
      id: Date.now().toString(),
      timestamp: Date.now(),
    }
    const updated = [newEntry, ...history].slice(0, MAX_HISTORY)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
    return newEntry
  } catch {}
}

// Search local cache
export function searchCachedProducts(query: string): KosherProduct[] {
  const products = getCachedProducts()
  const q = query.toLowerCase()
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.includes(q))
  )
}

// Sync from Supabase to local cache
export async function syncProductsToCache(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('kosher_products')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setCachedProducts(data)
    }
  } catch {
    // Offline — use cache
  }
}
