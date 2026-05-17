'use client'

import { useState, useCallback, useRef } from 'react'
import { supabase, addToHistory, syncProductsToCache } from '@/lib/supabase'
import type { KosherProduct } from '@/lib/supabase'

interface Props {
  onResult: (res: {
    status: 'kosher' | 'not_kosher' | 'not_found'
    product?: KosherProduct
    query?: string
    method?: 'barcode' | 'search' | 'photo'
  }) => void
}

interface SearchResult {
  source: 'supabase' | 'openfoodfacts+claude' | 'claude' | 'not_found'
  confidence?: 'high' | 'medium' | 'low'
  results: KosherProduct[]
  off_name?: string | null
  off_brand?: string | null
  error?: string
}

const catLabel: Record<string, string> = {
  carne: '🥩 Carne', lacteo: '🥛 Lácteo', parve: '🌿 Parve',
}

const sourceLabel: Record<string, string> = {
  supabase: '📚 Base propia',
  'openfoodfacts+claude': '🌐 Open Food Facts + Claude',
  claude: '🤖 Claude AI',
  not_found: '',
}

const confidenceColor: Record<string, string> = {
  high: 'text-green-600',
  medium: 'text-amber-600',
  low: 'text-red-500',
}

export default function SearchPanel({ onResult }: Props) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<Set<number>>(new Set())
  const debounceRef = useRef<NodeJS.Timeout>()

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) return
    setLoading(true)
    setSearchResult(null)
    setSaved(new Set())

    try {
      const resp = await fetch('/api/search-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q.trim(), mode: 'name' }),
      })
      const data: SearchResult = await resp.json()
      setSearchResult(data)
    } catch {
      setSearchResult({ source: 'not_found', results: [], error: 'Error de conexión' })
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    setSearchResult(null)
    clearTimeout(debounceRef.current)
    if (val.trim().length >= 3) {
      debounceRef.current = setTimeout(() => doSearch(val), 600)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    clearTimeout(debounceRef.current)
    doSearch(query)
  }

  const selectProduct = (product: KosherProduct) => {
    const status = product.is_kosher ? 'kosher' : 'not_kosher'
    addToHistory({ query: product.name, result: status, product, method: 'search' })
    onResult({ status, product, method: 'search' })
  }

  const saveProduct = async (product: KosherProduct, index: number) => {
    setSaving(`${index}`)
    try {
      await supabase.from('kosher_products').insert({
        name: product.name,
        brand: product.brand || null,
        barcode: product.barcode || null,
        category: product.category || null,
        certifier: product.certifier || 'manual',
        is_kosher: product.is_kosher,
        notes: product.notes || null,
      })
      setSaved(prev => new Set(Array.from(prev).concat(index)))
      syncProductsToCache()
    } catch {
      // silent fail
    } finally {
      setSaving(null)
    }
  }

  const notFound = searchResult?.source === 'not_found' || searchResult?.results.length === 0

  return (
    <div>
      <h2 className="text-xl font-bold text-kosher-text mb-1">Buscar producto</h2>
      <p className="text-xs text-kosher-text-light mb-4">
        Busca en tu base, Open Food Facts y conocimiento de Claude AI
      </p>

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
          disabled={loading || query.trim().length < 2}
          className="px-4 bg-kosher-gold text-white rounded-xl font-semibold text-sm active:scale-95 transition-transform disabled:opacity-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </form>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center py-10 gap-3">
          <div className="w-8 h-8 border-4 border-kosher-gold border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-kosher-text-light">Consultando base de datos y Claude AI…</p>
        </div>
      )}

      {/* Results */}
      {!loading && searchResult && searchResult.results.length > 0 && (
        <div className="space-y-3">
          {/* Source badge */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-kosher-text-light">
              {searchResult.results.length} resultado(s)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-kosher-text-light">
                {sourceLabel[searchResult.source]}
              </span>
              {searchResult.confidence && (
                <span className={`text-xs font-semibold ${confidenceColor[searchResult.confidence]}`}>
                  {searchResult.confidence === 'high' ? '● Alta confianza' :
                   searchResult.confidence === 'medium' ? '● Confianza media' : '● Baja confianza'}
                </span>
              )}
            </div>
          </div>

          {searchResult.results.map((product, i) => (
            <div
              key={i}
              className={`bg-white border-2 rounded-xl overflow-hidden ${
                product.is_kosher ? 'border-green-300' : 'border-red-300'
              }`}
            >
              {/* Tap to select */}
              <button
                onClick={() => selectProduct(product)}
                className="w-full text-left p-4 flex items-start gap-3 active:bg-gray-50 transition-colors"
              >
                <span className="text-2xl flex-shrink-0 mt-0.5">
                  {product.is_kosher ? '✅' : '❌'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-kosher-text text-sm">{product.name}</div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {product.brand && (
                      <span className="text-xs text-kosher-text-light">{product.brand}</span>
                    )}
                    {product.certifier && product.certifier !== 'manual' && (
                      <span className="text-xs font-bold text-white bg-kosher-blue px-2 py-0.5 rounded-full">
                        {product.certifier}
                      </span>
                    )}
                    {product.category && (
                      <span className="text-xs text-kosher-gold">
                        {catLabel[product.category] || product.category}
                      </span>
                    )}
                  </div>
                  {product.notes && (
                    <p className="text-xs text-kosher-text-light mt-1 italic">{product.notes}</p>
                  )}
                </div>
                <svg className="w-4 h-4 text-kosher-text-light flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Save to DB (only for non-supabase results) */}
              {searchResult.source !== 'supabase' && (
                <div className="px-4 pb-3">
                  {saved.has(i) ? (
                    <p className="text-xs text-green-600 font-semibold">✅ Guardado en tu base de datos</p>
                  ) : (
                    <button
                      onClick={() => saveProduct(product, i)}
                      disabled={saving === `${i}`}
                      className="text-xs text-kosher-gold underline disabled:opacity-50"
                    >
                      {saving === `${i}` ? 'Guardando…' : '💾 Guardar en mi base de datos'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Confidence warning for low */}
          {searchResult.confidence === 'low' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs text-amber-700">
                ⚠️ Claude no tiene información confiable sobre este producto. Verifica en la etiqueta física o usa la función de fotografiar.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Not found */}
      {!loading && searchResult && notFound && (
        <div className="text-center py-10">
          <div className="text-5xl mb-3">⚠️</div>
          <p className="text-kosher-text font-semibold mb-1">No encontrado</p>
          <p className="text-sm text-kosher-text-light mb-1">
            "{query}" no está en ninguna base de datos
          </p>
          {searchResult.error && (
            <p className="text-xs text-red-400 mb-4">{searchResult.error}</p>
          )}
          <p className="text-xs text-kosher-text-light mb-5">
            Intenta fotografiar la etiqueta para que Claude Vision lo analice directamente.
          </p>
        </div>
      )}

      {/* Initial state */}
      {!loading && !searchResult && (
        <div className="text-center py-10 text-kosher-text-light">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm">Escribe al menos 3 caracteres</p>
          <p className="text-xs mt-2 opacity-70">
            Busca en tu base propia, Open Food Facts<br />y conocimiento general de Claude AI
          </p>
        </div>
      )}
    </div>
  )
}
