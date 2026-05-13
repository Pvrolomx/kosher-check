'use client'

import { useEffect, useState } from 'react'
import { syncProductsToCache } from '@/lib/supabase'
import BarcodeScanner from '@/components/BarcodeScanner'
import SearchPanel from '@/components/SearchPanel'
import PhotoAnalyzer from '@/components/PhotoAnalyzer'
import ResultCard from '@/components/ResultCard'
import HistoryPanel from '@/components/HistoryPanel'
import AddProductModal from '@/components/AddProductModal'
import type { KosherProduct } from '@/lib/supabase'

type Mode = 'home' | 'barcode' | 'search' | 'photo' | 'history'

export default function Home() {
  const [mode, setMode] = useState<Mode>('home')
  const [result, setResult] = useState<{
    status: 'kosher' | 'not_kosher' | 'not_found'
    product?: KosherProduct
    query?: string
    method?: 'barcode' | 'search' | 'photo'
  } | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Register SW
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    // Install prompt
    const handler = (e: any) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setIsInstalled(true))

    // Sync products to cache
    syncProductsToCache()

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
      setInstallPrompt(null)
    }
  }

  const handleResult = (res: typeof result) => {
    setResult(res)
    setMode('home')
  }

  const resetResult = () => {
    setResult(null)
  }

  const categoryLabel = (cat?: string | null) => {
    if (!cat) return ''
    const map: Record<string, string> = {
      carne: '🥩 Carne',
      lacteo: '🥛 Lácteo',
      parve: '🌿 Parve',
    }
    return map[cat] || cat
  }

  return (
    <div className="min-h-screen bg-kosher-cream flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-kosher-border px-4 py-3 flex items-center justify-between shadow-sm">
        <button
          onClick={() => { setMode('home'); resetResult() }}
          className="flex items-center gap-2"
        >
          <div className="w-8 h-8 bg-kosher-gold rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">KC</span>
          </div>
          <span className="font-bold text-kosher-text text-lg">KosherCheck</span>
        </button>
        <div className="flex items-center gap-2">
          {installPrompt && !isInstalled && (
            <button
              onClick={handleInstall}
              className="text-xs bg-kosher-gold-light text-white px-3 py-1.5 rounded-full font-medium"
            >
              Instalar App
            </button>
          )}
          <button
            onClick={() => setMode(mode === 'history' ? 'home' : 'history')}
            className="text-kosher-text-light hover:text-kosher-gold p-1 rounded-lg transition-colors"
            title="Historial"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">

        {/* Result Card */}
        {result && mode === 'home' && (
          <div className="mb-6 animate-in slide-in-from-top duration-300">
            <ResultCard
              status={result.status}
              product={result.product}
              query={result.query}
              onDismiss={resetResult}
              onAddManual={() => setShowAddModal(true)}
              categoryLabel={categoryLabel}
            />
          </div>
        )}

        {/* Home Screen */}
        {mode === 'home' && (
          <div>
            {!result && (
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-kosher-text mb-1">¿Es Kosher?</h1>
                <p className="text-kosher-text-light text-sm">Escanea, busca o fotografía el producto</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {/* Escanear */}
              <button
                onClick={() => { setMode('barcode'); resetResult() }}
                className="bg-white border-2 border-kosher-border rounded-2xl p-6 flex items-center gap-5 shadow-sm active:scale-98 transition-all duration-150 hover:border-kosher-gold hover:shadow-md"
              >
                <div className="w-14 h-14 bg-kosher-gold rounded-2xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8H3m2 0h2M5 8V6m0 2v2M3 8h.01M21 8h.01M17 8h.01M12 8h.01M8 8h.01M4 20h4M4 16h2m-2 0v4m0-4V12" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-bold text-kosher-text text-lg">Escanear</div>
                  <div className="text-kosher-text-light text-sm">Código de barras con la cámara</div>
                </div>
                <svg className="w-5 h-5 text-kosher-text-light ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Buscar */}
              <button
                onClick={() => { setMode('search'); resetResult() }}
                className="bg-white border-2 border-kosher-border rounded-2xl p-6 flex items-center gap-5 shadow-sm active:scale-98 transition-all duration-150 hover:border-kosher-gold hover:shadow-md"
              >
                <div className="w-14 h-14 bg-kosher-blue rounded-2xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-bold text-kosher-text text-lg">Buscar</div>
                  <div className="text-kosher-text-light text-sm">Por nombre o marca del producto</div>
                </div>
                <svg className="w-5 h-5 text-kosher-text-light ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Fotografiar */}
              <button
                onClick={() => { setMode('photo'); resetResult() }}
                className="bg-white border-2 border-kosher-border rounded-2xl p-6 flex items-center gap-5 shadow-sm active:scale-98 transition-all duration-150 hover:border-kosher-gold hover:shadow-md"
              >
                <div className="w-14 h-14 bg-kosher-green rounded-2xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-bold text-kosher-text text-lg">Fotografiar</div>
                  <div className="text-kosher-text-light text-sm">Claude analiza la etiqueta del producto</div>
                </div>
                <svg className="w-5 h-5 text-kosher-text-light ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Quick tip */}
            <div className="mt-6 p-3 bg-kosher-warm rounded-xl border border-kosher-border">
              <p className="text-xs text-kosher-text-light text-center">
                💡 La base de datos se sincroniza automáticamente. Funciona sin internet con el caché local.
              </p>
            </div>
          </div>
        )}

        {/* Barcode Scanner */}
        {mode === 'barcode' && (
          <div>
            <button
              onClick={() => setMode('home')}
              className="flex items-center gap-1 text-kosher-text-light mb-4 hover:text-kosher-gold transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm">Volver</span>
            </button>
            <BarcodeScanner onResult={handleResult} />
          </div>
        )}

        {/* Search */}
        {mode === 'search' && (
          <div>
            <button
              onClick={() => setMode('home')}
              className="flex items-center gap-1 text-kosher-text-light mb-4 hover:text-kosher-gold transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm">Volver</span>
            </button>
            <SearchPanel onResult={handleResult} />
          </div>
        )}

        {/* Photo */}
        {mode === 'photo' && (
          <div>
            <button
              onClick={() => setMode('home')}
              className="flex items-center gap-1 text-kosher-text-light mb-4 hover:text-kosher-gold transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm">Volver</span>
            </button>
            <PhotoAnalyzer onResult={handleResult} />
          </div>
        )}

        {/* History */}
        {mode === 'history' && (
          <div>
            <button
              onClick={() => setMode('home')}
              className="flex items-center gap-1 text-kosher-text-light mb-4 hover:text-kosher-gold transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm">Volver</span>
            </button>
            <HistoryPanel />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-3 text-xs text-kosher-text-light border-t border-kosher-border bg-white">
        Hecho por Colmena 2026
      </footer>

      {/* Add Product Modal */}
      {showAddModal && (
        <AddProductModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false)
            syncProductsToCache()
          }}
        />
      )}
    </div>
  )
}
