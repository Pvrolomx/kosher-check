'use client'

import { useState, useRef, useCallback } from 'react'
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

export default function PhotoAnalyzer({ onResult }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [analysisText, setAnalysisText] = useState<string | null>(null)

  const analyzeImage = useCallback(async (file: File) => {
    setLoading(true)
    setAnalysisText('Analizando con Claude Vision…')

    const toBase64 = (f: File): Promise<string> =>
      new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload = () => {
          const b64 = (reader.result as string).split(',')[1]
          res(b64)
        }
        reader.onerror = rej
        reader.readAsDataURL(f)
      })

    try {
      const b64 = await toBase64(file)

      const resp = await fetch('/api/analyze-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: b64, mimeType: file.type }),
      })

      if (!resp.ok) throw new Error('API error')

      const data = await resp.json()

      const result: {
        status: 'kosher' | 'not_kosher' | 'not_found'
        product?: KosherProduct
        query?: string
        method: 'photo'
      } = {
        status: data.is_kosher === true ? 'kosher' : data.is_kosher === false ? 'not_kosher' : 'not_found',
        method: 'photo',
        query: data.product_name || 'Foto de etiqueta',
      }

      if (data.product_name || data.brand) {
        result.product = {
          name: data.product_name || 'Producto analizado',
          brand: data.brand,
          category: data.category,
          certifier: data.certifier,
          is_kosher: data.is_kosher ?? false,
          notes: data.notes,
        }
      }

      setAnalysisText(data.analysis_summary || null)
      addToHistory({
        query: result.query || 'Foto',
        result: result.status,
        product: result.product,
        method: 'photo',
      })
      onResult(result)
    } catch (e) {
      setAnalysisText('Error al analizar la imagen. Verifica tu conexión.')
      setLoading(false)
    }
  }, [onResult])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    analyzeImage(file)
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-kosher-text mb-2">Fotografiar etiqueta</h2>
      <p className="text-sm text-kosher-text-light mb-5">
        Claude analiza la etiqueta y detecta sellos kosher, ingredientes y certificaciones.
      </p>

      {loading ? (
        <div className="flex flex-col items-center py-12 gap-4">
          {preview && (
            <img src={preview} alt="Etiqueta" className="w-48 h-48 object-cover rounded-2xl shadow-md opacity-60" />
          )}
          <div className="w-10 h-10 border-4 border-kosher-green border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-kosher-text-light text-center max-w-xs">{analysisText}</p>
        </div>
      ) : (
        <>
          {preview ? (
            <div className="mb-5">
              <img src={preview} alt="Preview" className="w-full rounded-2xl shadow-md max-h-64 object-contain bg-black" />
            </div>
          ) : (
            <div className="border-2 border-dashed border-kosher-border rounded-2xl p-10 mb-5 flex flex-col items-center gap-3 bg-white">
              <div className="text-6xl">📸</div>
              <p className="text-sm text-kosher-text-light text-center">
                Toma una foto de la etiqueta del producto
              </p>
            </div>
          )}

          {/* Camera button (mobile) */}
          <button
            onClick={() => cameraRef.current?.click()}
            className="w-full py-4 bg-kosher-green text-white font-bold rounded-2xl text-base mb-3 active:scale-95 transition-transform shadow-md flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Tomar foto
          </button>

          {/* Gallery button */}
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full py-3 bg-white border-2 border-kosher-border text-kosher-text font-semibold rounded-2xl text-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5 text-kosher-text-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Elegir de galería
          </button>

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFile}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />

          <div className="mt-4 p-3 bg-kosher-warm rounded-xl border border-kosher-border">
            <p className="text-xs text-kosher-text-light text-center">
              🔍 Claude Vision detecta sellos OU, OK, KD, KMD y más en la etiqueta
            </p>
          </div>
        </>
      )}
    </div>
  )
}
