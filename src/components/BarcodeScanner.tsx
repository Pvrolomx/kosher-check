'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { addToHistory } from '@/lib/supabase'
import type { KosherProduct } from '@/lib/supabase'

interface Props {
  onResult: (res: {
    status: 'kosher' | 'not_kosher' | 'not_found'
    product?: KosherProduct
    query?: string
    method?: 'barcode' | 'search' | 'photo'
  }) => void
}

export default function BarcodeScanner({ onResult }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [manualBarcode, setManualBarcode] = useState('')
  const streamRef = useRef<MediaStream | null>(null)
  const scannerRef = useRef<any>(null)
  const scannedRef = useRef(false)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (scannerRef.current) {
      try { scannerRef.current.reset() } catch {}
      scannerRef.current = null
    }
    setScanning(false)
  }, [])

  const lookupBarcode = useCallback(async (barcode: string) => {
    if (scannedRef.current) return
    scannedRef.current = true
    setLoading(true)
    stopCamera()

    setLoadingMsg('Buscando en base de datos…')

    try {
      const resp = await fetch('/api/search-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode, query: barcode, mode: 'barcode' }),
      })
      const data = await resp.json()

      if (data.results && data.results.length > 0) {
        const product = data.results[0]
        const status = product.is_kosher ? 'kosher' : 'not_kosher'
        addToHistory({ query: barcode, result: status, product, method: 'barcode' })
        onResult({ status, product, method: 'barcode' })
        return
      }
    } catch {
      // offline fallback
    }

    addToHistory({ query: barcode, result: 'not_found', method: 'barcode' })
    onResult({ status: 'not_found', query: barcode, method: 'barcode' })
    setLoading(false)
  }, [onResult, stopCamera])

  const startScanner = useCallback(async () => {
    setError(null)
    setScanning(true)
    scannedRef.current = false

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader()
      scannerRef.current = reader

      reader.decodeFromStream(stream, videoRef.current!, (result) => {
        if (result && !scannedRef.current) {
          lookupBarcode(result.getText())
        }
      })
    } catch {
      setError('No se pudo acceder a la cámara. Verifica los permisos.')
      setScanning(false)
    }
  }, [lookupBarcode])

  useEffect(() => () => stopCamera(), [stopCamera])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualBarcode.trim()) lookupBarcode(manualBarcode.trim())
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-kosher-text mb-4">Escanear código de barras</h2>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-12 h-12 border-4 border-kosher-gold border-t-transparent rounded-full animate-spin" />
          <p className="text-kosher-text-light text-sm">{loadingMsg}</p>
        </div>
      ) : (
        <>
          <div className="relative bg-black rounded-2xl overflow-hidden mb-4" style={{ aspectRatio: '4/3' }}>
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />

            {scanning && (
              <>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative border-2 border-kosher-gold w-3/4 h-1/3 rounded-lg opacity-80">
                    <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-kosher-gold" />
                    <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-kosher-gold" />
                    <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-kosher-gold" />
                    <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-kosher-gold" />
                  </div>
                </div>
                <div className="scanner-line absolute w-full h-0.5 bg-gradient-to-r from-transparent via-kosher-gold to-transparent" />
              </>
            )}

            {!scanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <div className="text-center">
                  <div className="text-6xl mb-3">📷</div>
                  <p className="text-white text-sm">Toca para activar la cámara</p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          {!scanning ? (
            <button
              onClick={startScanner}
              className="w-full py-4 bg-kosher-gold text-white font-bold rounded-2xl text-lg active:scale-95 transition-transform shadow-md mb-4"
            >
              Activar cámara
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="w-full py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl mb-4 active:scale-95 transition-transform"
            >
              Detener
            </button>
          )}

          <div className="border-t border-kosher-border pt-4">
            <p className="text-xs text-kosher-text-light mb-2">O ingresa el código manualmente:</p>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualBarcode}
                onChange={e => setManualBarcode(e.target.value)}
                placeholder="7501234567890"
                className="flex-1 border border-kosher-border rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-kosher-gold"
                inputMode="numeric"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-kosher-gold text-white rounded-xl font-semibold text-sm active:scale-95 transition-transform"
              >
                Buscar
              </button>
            </form>
          </div>

          <div className="mt-4 p-3 bg-kosher-warm rounded-xl border border-kosher-border">
            <p className="text-xs text-kosher-text-light text-center">
              🌐 Consulta tu base propia + Open Food Facts + Claude AI
            </p>
          </div>
        </>
      )}
    </div>
  )
}
