'use client'

import { useState, useRef, useCallback } from 'react'
import { supabase, addToHistory } from '@/lib/supabase'
import type { KosherProduct } from '@/lib/supabase'

interface AnalysisResult {
  is_kosher: boolean | null
  product_name: string | null
  brand: string | null
  category: string | null
  certifier: string | null
  notes: string | null
  analysis_summary: string | null
  error?: string
}

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
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const analyzeImage = useCallback(async (file: File) => {
    setLoading(true)
    setError(null)
    setAnalysis(null)
    setSaved(false)

    const toBase64 = (f: File): Promise<string> =>
      new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload = () => res((reader.result as string).split(',')[1])
        reader.onerror = () => rej(new Error('Error leyendo archivo'))
        reader.readAsDataURL(f)
      })

    try {
      const b64 = await toBase64(file)

      const resp = await fetch('/api/analyze-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: b64, mimeType: file.type }),
      })

      const data: AnalysisResult = await resp.json()

      if (!resp.ok || data.error) {
        throw new Error(data.error || `Error del servidor (${resp.status})`)
      }

      setAnalysis(data)

      const status: 'kosher' | 'not_kosher' | 'not_found' =
        data.is_kosher === true ? 'kosher' :
        data.is_kosher === false ? 'not_kosher' :
        'not_found'

      const product: KosherProduct | undefined =
        data.product_name || data.certifier
          ? {
              name: data.product_name || 'Producto analizado por foto',
              brand: data.brand || undefined,
              category: data.category as any || undefined,
              certifier: data.certifier as any || undefined,
              is_kosher: data.is_kosher ?? false,
              notes: data.notes || undefined,
            }
          : undefined

      addToHistory({
        query: data.product_name || 'Foto de sello/etiqueta',
        result: status,
        product,
        method: 'photo',
      })

      onResult({ status, product, query: data.product_name || 'Foto', method: 'photo' })

    } catch (e: any) {
      setError(e.message || 'Error desconocido al analizar la imagen')
    } finally {
      setLoading(false)
    }
  }, [onResult])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setAnalysis(null)
    setError(null)
    setSaved(false)
    analyzeImage(file)
    e.target.value = ''
  }

  const handleSave = async () => {
    if (!analysis || analysis.is_kosher === null) return
    setSaving(true)
    try {
      await supabase.from('kosher_products').insert({
        name: analysis.product_name || 'Producto (foto)',
        brand: analysis.brand || null,
        category: analysis.category || null,
        certifier: analysis.certifier || 'manual',
        is_kosher: analysis.is_kosher,
        notes: analysis.notes || null,
      })
      setSaved(true)
    } catch {
      setError('No se pudo guardar en la base de datos')
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setPreview(null)
    setAnalysis(null)
    setError(null)
    setSaved(false)
  }

  const catLabel: Record<string, string> = {
    carne: '🥩 Carne', lacteo: '🥛 Lácteo', parve: '🌿 Parve',
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-kosher-text mb-2">Fotografiar etiqueta o sello</h2>
      <p className="text-sm text-kosher-text-light mb-4">
        Funciona con la etiqueta completa <strong>o</strong> solo el sello kosher (OU, OK, KMD…)
      </p>

      {preview && (
        <div className="relative mb-4">
          <img src={preview} alt="Foto" className="w-full rounded-2xl shadow-md max-h-64 object-contain bg-black" />
          {!loading && (
            <button onClick={reset} className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">✕</button>
          )}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center py-10 gap-3">
          <div className="w-10 h-10 border-4 border-kosher-green border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-kosher-text-light">Claude Vision analizando la imagen…</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm font-semibold text-red-700 mb-1">⚠️ Error al analizar</p>
          <p className="text-xs text-red-600 mb-2">{error}</p>
          <button onClick={reset} className="text-xs underline text-red-500">Intentar con otra foto</button>
        </div>
      )}

      {analysis && !loading && (
        <div className={`mb-4 p-4 rounded-2xl border-2 ${
          analysis.is_kosher === true ? 'bg-green-50 border-green-500' :
          analysis.is_kosher === false ? 'bg-red-50 border-red-400' :
          'bg-amber-50 border-amber-400'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">
              {analysis.is_kosher === true ? '✅' : analysis.is_kosher === false ? '❌' : '⚠️'}
            </span>
            <div>
              <div className={`font-black text-lg ${
                analysis.is_kosher === true ? 'text-green-800' :
                analysis.is_kosher === false ? 'text-red-800' : 'text-amber-800'
              }`}>
                {analysis.is_kosher === true ? 'KOSHER' : analysis.is_kosher === false ? 'NO KOSHER' : 'NO DETERMINADO'}
              </div>
              {analysis.product_name && <div className="text-sm text-kosher-text">{analysis.product_name}</div>}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-2">
            {analysis.certifier && (
              <span className="text-xs font-bold px-2.5 py-1 bg-kosher-blue text-white rounded-full">{analysis.certifier}</span>
            )}
            {analysis.category && (
              <span className="text-xs px-2.5 py-1 bg-white border border-kosher-border rounded-full">{catLabel[analysis.category] || analysis.category}</span>
            )}
            {analysis.brand && (
              <span className="text-xs px-2.5 py-1 bg-white border border-kosher-border rounded-full text-kosher-text-light">{analysis.brand}</span>
            )}
          </div>

          {analysis.notes && <p className="text-xs text-kosher-text-light italic mb-3">{analysis.notes}</p>}

          {analysis.is_kosher !== null && !saved && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2.5 bg-kosher-gold text-white rounded-xl text-sm font-semibold active:scale-95 transition-transform disabled:opacity-60"
            >
              {saving ? 'Guardando…' : '💾 Guardar en base de datos'}
            </button>
          )}
          {saved && (
            <div className="text-center text-sm text-green-700 font-semibold py-1.5">
              ✅ Guardado — aparecerá en búsquedas futuras
            </div>
          )}
        </div>
      )}

      {!loading && (
        <>
          {!preview && (
            <div className="border-2 border-dashed border-kosher-border rounded-2xl p-8 mb-4 flex flex-col items-center gap-3 bg-white">
              <div className="text-5xl">📸</div>
              <p className="text-sm text-kosher-text-light text-center">
                Puedes fotografiar la etiqueta completa <br/>o <strong>acercarte solo al sello</strong>
              </p>
            </div>
          )}

          <button
            onClick={() => cameraRef.current?.click()}
            className="w-full py-4 bg-kosher-green text-white font-bold rounded-2xl text-base mb-3 active:scale-95 transition-transform shadow-md flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {preview ? 'Tomar otra foto' : 'Tomar foto'}
          </button>

          <button
            onClick={() => fileRef.current?.click()}
            className="w-full py-3 bg-white border-2 border-kosher-border text-kosher-text font-semibold rounded-2xl text-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5 text-kosher-text-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Elegir de galería
          </button>
        </>
      )}

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {!preview && !loading && (
        <div className="mt-4 p-3 bg-kosher-warm rounded-xl border border-kosher-border">
          <p className="text-xs text-kosher-text-light text-center">
            🔍 Claude detecta sellos OU, OK, KD, KMD y otros — incluso si son pequeños
          </p>
        </div>
      )}
    </div>
  )
}
