import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Open Food Facts barcode lookup
async function lookupBarcode(barcode: string) {
  try {
    const resp = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,brands,labels_tags,ingredients_text,categories_tags`,
      { next: { revalidate: 86400 } }
    )
    if (!resp.ok) return null
    const data = await resp.json()
    if (data.status !== 1) return null
    return data.product
  } catch {
    return null
  }
}

// Claude knowledge lookup for a product name
async function askClaude(query: string, context?: string): Promise<{
  is_kosher: boolean | null
  certifier: string | null
  category: string | null
  notes: string
  confidence: 'high' | 'medium' | 'low'
}> {
  const contextStr = context ? `\nContexto adicional del producto: ${context}` : ''

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Eres un experto en kashrut (leyes kosher judías). Determina si este producto es kosher.

Producto: "${query}"${contextStr}

Considera:
- ¿Es un producto que típicamente tiene certificación kosher de esta marca?
- ¿Contiene ingredientes no-kosher (cerdo, mariscos, mezcla carne+lácteos)?
- ¿Qué certificadora lo avala normalmente (OU, OK, KA, KMD)?

Responde SOLO con JSON, sin markdown:
{
  "is_kosher": true,
  "certifier": "OU",
  "category": "parve",
  "notes": "Coca Cola tiene certificación OU Parve en México",
  "confidence": "high"
}

Valores válidos:
- is_kosher: true | false | null (null si no tienes información confiable)
- certifier: "OU" | "OK" | "KA" | "KMD" | "manual" | null
- category: "carne" | "lacteo" | "parve" | null
- confidence: "high" (certeza) | "medium" (probable) | "low" (especulación)
- notes: máximo 120 caracteres en español`
    }]
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const match = text.match(/\{[\s\S]*\}/)
  try {
    return JSON.parse(match?.[0] || '{}')
  } catch {
    return { is_kosher: null, certifier: null, category: null, notes: 'No se pudo determinar', confidence: 'low' }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { query, barcode, mode } = await req.json()
    // mode: 'barcode' | 'name'

    // ── CAPA 1: Supabase (nuestra base propia) ──
    let supabaseResult = null

    if (barcode) {
      const { data } = await supabase
        .from('kosher_products')
        .select('*')
        .eq('barcode', barcode)
        .single()
      supabaseResult = data
    }

    if (!supabaseResult && query) {
      const { data } = await supabase
        .from('kosher_products')
        .select('*')
        .or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
        .limit(10)
      if (data && data.length > 0) {
        return NextResponse.json({
          source: 'supabase',
          results: data
        })
      }
    }

    if (supabaseResult) {
      return NextResponse.json({
        source: 'supabase',
        results: [supabaseResult]
      })
    }

    // ── CAPA 2: Open Food Facts (para código de barras) ──
    let offProduct = null
    const lookupQuery = barcode || query

    if (barcode) {
      offProduct = await lookupBarcode(barcode)
    }

    // ── CAPA 3: Claude knowledge ──
    const productName = offProduct?.product_name || query || barcode || ''
    const offLabels: string[] = offProduct?.labels_tags || []
    const offIngredients: string = offProduct?.ingredients_text || ''
    const offBrand: string = offProduct?.brands || ''

    // Check if OFF already tells us it's kosher
    const offKosher = offLabels.some((l: string) => l.toLowerCase().includes('kosher'))

    let claudeResult = null
    let source = 'claude'

    if (offKosher) {
      // OFF confirmed kosher — trust it, still ask Claude for certifier details
      source = 'openfoodfacts+claude'
      claudeResult = await askClaude(
        `${offBrand} ${productName}`.trim(),
        `Etiquetas: ${offLabels.join(', ')}. Ingredientes: ${offIngredients.slice(0, 300)}`
      )
    } else if (productName) {
      // No OFF kosher data — ask Claude from general knowledge
      const context = offProduct
        ? `Marca: ${offBrand}. Ingredientes: ${offIngredients.slice(0, 300)}`
        : undefined
      claudeResult = await askClaude(productName, context)
    }

    if (!claudeResult || claudeResult.is_kosher === null) {
      return NextResponse.json({
        source: 'not_found',
        results: [],
        off_name: offProduct?.product_name || null,
        off_brand: offProduct?.brands || null,
      })
    }

    // Build synthetic product from Claude's answer
    const syntheticProduct = {
      name: offProduct?.product_name || productName,
      brand: offProduct?.brands || null,
      barcode: barcode || null,
      is_kosher: claudeResult.is_kosher,
      certifier: claudeResult.certifier,
      category: claudeResult.category,
      notes: `${claudeResult.notes} [Fuente: ${source === 'openfoodfacts+claude' ? 'Open Food Facts + Claude' : 'Claude AI'}, confianza: ${claudeResult.confidence}]`,
    }

    return NextResponse.json({
      source,
      confidence: claudeResult.confidence,
      results: [syntheticProduct],
    })

  } catch (error: any) {
    console.error('Search error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
