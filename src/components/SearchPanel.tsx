'use client'

import { useState, useCallback } from 'react'
import { supabase, searchCachedProducts, addToHistory } from '@/lib/supabase'
import type { KosherProduct } from '@/lib/supabase'

interface Props {
  onResult: (res: {
    status: 'kosher' | 'not_kosher' | 'not_found'
    product?: KosherProduct
    query?: string
    method?: 'barcode' | 'search' | 'photo'
  }) => void
}

const categoryLabel: Record<string, string> = {
  carne: '🥩 Carne',
  lacteo: '🥛 Lácteo',
  parve: '🌿 Parve',
}

export default function SearchPanel({ onResult }: Props) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<KosherProduct[]>([])
  const [searched, setSearched] = useState(false)

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) return
    setLoading(true)
    setSearched(true)
    setSuggestions([])

    try {
      // Try Supabase (online)
      const { data } = await supabase
        .from('kosher_products')
        .select('*')
        .or(`name.ilike.%${q}%,brand.ilike.%${q}%`)
        .order('name')
        .limit(20)

      if (data && data.length > 0) {
        setSuggestions(data)
        setLoading(false)
        return
      }
    } catch {}

    // Try local cache (offline)
    const cached = searchCachedProducts(q)
    setSuggestions(cached)
    setLoading(false)
  }, [])

  const selectProduct = (product: KosherProduct) => {
    const status = product.is_kosher ? 'kosher' : 'not_kosher'
    addToHistory({ query: product.name, result: status, product, method: 'search' })
    onResult({ status, product, method: 'search' })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (suggestions.length === 0 && searched && !loading) {
      addToHistory({ query, result: 'not_found', method: 'search' })
      onResult({ status: 'not_found', query, method: 'search' })
    } else {
      handleSearch(query)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    setSearched(false)
    setSuggestions([])
    if (val.length >= 2) {
      handleSearch(val)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-kosher-text mb-4">Buscar producto</h2>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Nombre o marca del producto…"
          autoFocus
          className="flex-1 border-2 border-kosher-border rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-kosher-gold transition-colors"
        />
        <button
          type="submit"
          className="px-4 bg-kosher-gold text-white rounded-xl font-semibold text-sm active:scale-95 transition-transform"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </form>

      {loading && (
        <div className="flex items-center justify-center py-8 gap-3">
          <div className="w-6 h-6 border-3 border-kosher-gold border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-kosher-text-light">Buscando…</span>
        </div>
      )}

      {!loading && suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-kosher-text-light mb-2">{suggestions.length} resultado(s)</p>
          {suggestions.map((product) => (
            <button
              key={product.id}
              onClick={() => selectProduct(product)}
              className="w-full text-left bg-white border border-kosher-border rounded-xl p-4 flex items-center gap-3 hover:border-kosher-gold hover:shadow-sm transition-all active:scale-98"
            >
              <span className="text-2xl flex-shrink-0">
                {product.is_kosher ? '✅' : '❌'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-kosher-text text-sm truncate">{product.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  {product.brand && (
                    <span className="text-xs text-kosher-text-light">{product.brand}</span>
                  )}
                  {product.category && (
                    <span className="text-xs text-kosher-gold">{categoryLabel[product.category] || product.category}</span>
                  )}
                  {product.certifier && product.certifier !== 'manual' && (
                    <span className="text-xs font-bold text-kosher-blue">{product.certifier}</span>
                  )}
                </div>
              </div>
              <svg className="w-4 h-4 text-kosher-text-light flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {!loading && searched && suggestions.length === 0 && (
        <div className="text-center py-10">
          <div className="text-5xl mb-3">⚠️</div>
          <p className="text-kosher-text font-semibold mb-1">No encontrado</p>
          <p className="text-sm text-kosher-text-light mb-5">"{query}" no está en la base de datos</p>
          <button
            onClick={() => {
              addToHistory({ query, result: 'not_found', method: 'search' })
              onResult({ status: 'not_found', query, method: 'search' })
            }}
            className="px-5 py-2.5 bg-kosher-gold text-white rounded-xl text-sm font-semibold active:scale-95 transition-transform"
          >
            + Agregar este producto
          </button>
        </div>
      )}

      {!searched && !loading && (
        <div className="text-center py-10 text-kosher-text-light">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm">Escribe al menos 2 caracteres para buscar</p>
        </div>
      )}
    </div>
  )
}
