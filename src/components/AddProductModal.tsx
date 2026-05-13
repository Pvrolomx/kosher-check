'use client'

import { useState } from 'react'
import { supabase, syncProductsToCache } from '@/lib/supabase'
import type { KosherCategory, KosherCertifier } from '@/lib/supabase'

interface Props {
  onClose: () => void
  onSaved: () => void
  initialName?: string
  initialBarcode?: string
}

export default function AddProductModal({ onClose, onSaved, initialName = '', initialBarcode = '' }: Props) {
  const [form, setForm] = useState({
    name: initialName,
    brand: '',
    barcode: initialBarcode,
    category: '' as KosherCategory | '',
    certifier: '' as KosherCertifier | '',
    is_kosher: true,
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('El nombre del producto es requerido')
      return
    }
    setSaving(true)
    setError(null)

    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim() || null,
      barcode: form.barcode.trim() || null,
      category: form.category || null,
      certifier: form.certifier || 'manual',
      is_kosher: form.is_kosher,
      notes: form.notes.trim() || null,
    }

    const { error: err } = await supabase.from('kosher_products').insert(payload)

    if (err) {
      setError('Error al guardar: ' + err.message)
      setSaving(false)
      return
    }

    await syncProductsToCache()
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-kosher-border sticky top-0 bg-white rounded-t-3xl">
          <h3 className="font-bold text-lg text-kosher-text">Agregar producto</h3>
          <button onClick={onClose} className="text-kosher-text-light hover:text-kosher-text p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Is Kosher toggle — big and prominent */}
          <div className="flex items-center justify-between p-4 bg-kosher-warm rounded-2xl border border-kosher-border">
            <span className="font-semibold text-kosher-text">¿Es Kosher?</span>
            <div className="flex gap-2">
              <button
                onClick={() => setForm({ ...form, is_kosher: true })}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                  form.is_kosher
                    ? 'bg-kosher-green text-white shadow-md'
                    : 'bg-white text-kosher-text-light border border-kosher-border'
                }`}
              >
                ✅ Sí
              </button>
              <button
                onClick={() => setForm({ ...form, is_kosher: false })}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                  !form.is_kosher
                    ? 'bg-kosher-red text-white shadow-md'
                    : 'bg-white text-kosher-text-light border border-kosher-border'
                }`}
              >
                ❌ No
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-kosher-text-light uppercase tracking-wide mb-1.5 block">
              Nombre del producto *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Leche La Lechera"
              className="w-full border border-kosher-border rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-kosher-gold"
            />
          </div>

          {/* Brand */}
          <div>
            <label className="text-xs font-semibold text-kosher-text-light uppercase tracking-wide mb-1.5 block">
              Marca
            </label>
            <input
              type="text"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              placeholder="Ej: Nestlé"
              className="w-full border border-kosher-border rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-kosher-gold"
            />
          </div>

          {/* Barcode */}
          <div>
            <label className="text-xs font-semibold text-kosher-text-light uppercase tracking-wide mb-1.5 block">
              Código de barras
            </label>
            <input
              type="text"
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              placeholder="7501234567890"
              inputMode="numeric"
              className="w-full border border-kosher-border rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-kosher-gold"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-kosher-text-light uppercase tracking-wide mb-1.5 block">
              Categoría
            </label>
            <div className="flex gap-2">
              {(['carne', 'lacteo', 'parve'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setForm({ ...form, category: form.category === cat ? '' : cat })}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    form.category === cat
                      ? 'bg-kosher-gold text-white border-kosher-gold'
                      : 'bg-white text-kosher-text-light border-kosher-border'
                  }`}
                >
                  {cat === 'carne' ? '🥩 Carne' : cat === 'lacteo' ? '🥛 Lácteo' : '🌿 Parve'}
                </button>
              ))}
            </div>
          </div>

          {/* Certifier */}
          <div>
            <label className="text-xs font-semibold text-kosher-text-light uppercase tracking-wide mb-1.5 block">
              Certificador
            </label>
            <div className="flex flex-wrap gap-2">
              {(['OU', 'OK', 'KA', 'KMD', 'manual'] as const).map((cert) => (
                <button
                  key={cert}
                  onClick={() => setForm({ ...form, certifier: form.certifier === cert ? '' : cert })}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                    form.certifier === cert
                      ? 'bg-kosher-blue text-white border-kosher-blue'
                      : 'bg-white text-kosher-text-light border-kosher-border'
                  }`}
                >
                  {cert}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-kosher-text-light uppercase tracking-wide mb-1.5 block">
              Notas
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notas adicionales…"
              rows={3}
              className="w-full border border-kosher-border rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-kosher-gold resize-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-kosher-gold text-white font-bold rounded-2xl text-base active:scale-95 transition-transform shadow-md disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar producto'}
          </button>
        </div>
      </div>
    </div>
  )
}
