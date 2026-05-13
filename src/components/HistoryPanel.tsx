'use client'

import { useState, useEffect } from 'react'
import { getHistory } from '@/lib/supabase'
import type { HistoryEntry } from '@/lib/supabase'

const methodIcon: Record<string, string> = {
  barcode: '📊',
  search: '🔍',
  photo: '📸',
}

const statusIcon: Record<string, string> = {
  kosher: '✅',
  not_kosher: '❌',
  not_found: '⚠️',
}

export default function HistoryPanel() {
  const [history, setHistory] = useState<HistoryEntry[]>([])

  useEffect(() => {
    setHistory(getHistory())
  }, [])

  const clearHistory = () => {
    localStorage.removeItem('kosher_history')
    setHistory([])
  }

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-kosher-text">Historial</h2>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-xs text-red-400 hover:text-red-600 transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-16 text-kosher-text-light">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-sm">Aún no hay consultas en el historial</p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="bg-white border border-kosher-border rounded-xl p-4 flex items-center gap-3"
            >
              <span className="text-xl flex-shrink-0">{statusIcon[entry.result]}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-kosher-text truncate">
                  {entry.product?.name || entry.query}
                </div>
                {entry.product?.brand && (
                  <div className="text-xs text-kosher-text-light">{entry.product.brand}</div>
                )}
                <div className="text-xs text-kosher-text-light mt-0.5">
                  {methodIcon[entry.method]} {formatTime(entry.timestamp)}
                </div>
              </div>
              {entry.product?.certifier && entry.product.certifier !== 'manual' && (
                <span className="text-xs font-bold text-kosher-blue bg-blue-50 px-2 py-1 rounded-full flex-shrink-0">
                  {entry.product.certifier}
                </span>
              )}
            </div>
          ))}
          <p className="text-center text-xs text-kosher-text-light pt-2">
            Últimas {history.length} consultas (máx. 50)
          </p>
        </div>
      )}
    </div>
  )
}
