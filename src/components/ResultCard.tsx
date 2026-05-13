'use client'

import type { KosherProduct } from '@/lib/supabase'

interface Props {
  status: 'kosher' | 'not_kosher' | 'not_found'
  product?: KosherProduct
  query?: string
  onDismiss: () => void
  onAddManual: () => void
  categoryLabel: (cat?: string | null) => string
}

export default function ResultCard({ status, product, query, onDismiss, onAddManual, categoryLabel }: Props) {
  const configs = {
    kosher: {
      emoji: '✅',
      title: 'KOSHER',
      subtitle: product?.certifier ? `Certificado: ${product.certifier}` : 'Producto kosher',
      bg: 'bg-green-50',
      border: 'border-kosher-green',
      titleColor: 'text-green-800',
      badgeBg: 'bg-green-100',
      badgeText: 'text-green-800',
    },
    not_kosher: {
      emoji: '❌',
      title: 'NO KOSHER',
      subtitle: 'Este producto no es kosher',
      bg: 'bg-red-50',
      border: 'border-kosher-red',
      titleColor: 'text-red-800',
      badgeBg: 'bg-red-100',
      badgeText: 'text-red-800',
    },
    not_found: {
      emoji: '⚠️',
      title: 'NO ENCONTRADO',
      subtitle: 'No está en la base de datos',
      bg: 'bg-amber-50',
      border: 'border-amber-400',
      titleColor: 'text-amber-800',
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-800',
    },
  }

  const cfg = configs[status]

  return (
    <div className={`${cfg.bg} border-2 ${cfg.border} rounded-2xl p-5`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{cfg.emoji}</span>
          <div>
            <div className={`font-black text-xl ${cfg.titleColor}`}>{cfg.title}</div>
            {product?.name && (
              <div className="text-sm text-kosher-text font-medium mt-0.5">{product.name}</div>
            )}
            {!product?.name && query && (
              <div className="text-sm text-kosher-text-light mt-0.5">"{query}"</div>
            )}
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-kosher-text-light hover:text-kosher-text p-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Details */}
      <div className="flex flex-wrap gap-2 mb-3">
        {product?.brand && (
          <span className={`text-xs px-2.5 py-1 rounded-full ${cfg.badgeBg} ${cfg.badgeText} font-medium`}>
            {product.brand}
          </span>
        )}
        {product?.category && (
          <span className={`text-xs px-2.5 py-1 rounded-full ${cfg.badgeBg} ${cfg.badgeText} font-medium`}>
            {categoryLabel(product.category)}
          </span>
        )}
        {product?.certifier && product.certifier !== 'manual' && (
          <span className={`text-xs px-2.5 py-1 rounded-full ${cfg.badgeBg} ${cfg.badgeText} font-bold`}>
            {product.certifier}
          </span>
        )}
      </div>

      {product?.notes && (
        <p className="text-xs text-kosher-text-light mb-3 italic">{product.notes}</p>
      )}

      {status === 'not_found' && (
        <button
          onClick={onAddManual}
          className="w-full mt-1 py-2.5 bg-kosher-gold text-white rounded-xl text-sm font-semibold active:scale-95 transition-transform"
        >
          + Agregar manualmente
        </button>
      )}
    </div>
  )
}
