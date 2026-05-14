// KosherCheck Vision API — updated prompt for seal detection
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType } = await req.json()

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType || 'image/jpeg',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `Eres un experto en certificaciones kosher. Analiza esta imagen — puede ser una etiqueta completa, un sello kosher individual, o un empaque.

DETECTA cualquiera de estos elementos:

SELLOS KOSHER (busca el símbolo aunque sea pequeño o parcial):
- OU = letra U dentro de un círculo (el más común, del Orthodox Union)
- OK = letras OK dentro de círculo  
- KD = Kosher Dairy (con D pequeña)
- KA = Kehilla kosher
- KMD = Kosher México
- Triangle-K, Star-K, CRC, MK, Kof-K
- La letra כ (kaf hebrea) sola
- La palabra "Kosher" o "כשר" en cualquier idioma
- "Parve", "Pareve", "Fleishig", "Milchig", "Dairy", "Meat"

NO-KOSHER (ingredientes que lo invalidan):
- Cerdo, pork, ham, bacon, lard, manteca de cerdo
- Mariscos, shellfish, shrimp, crab, lobster
- Mezcla de carne y lácteos en el mismo producto

IMPORTANTE: Si ves solo un sello sin nombre de producto, devuelve el certifier y is_kosher=true. No necesitas ver el producto completo.

Responde ÚNICAMENTE con este JSON exacto, sin markdown ni texto extra:
{
  "is_kosher": true,
  "product_name": "nombre o null si no se ve",
  "brand": "marca o null",
  "category": "parve",
  "certifier": "OU",
  "notes": "Sello OU detectado — Orthodox Union Parve",
  "analysis_summary": "Descripción de 1 línea de lo que viste"
}

Valores válidos:
- is_kosher: true | false | null (null SOLO si la imagen es completamente ilegible)
- category: "carne" | "lacteo" | "parve" | null
- certifier: "OU" | "OK" | "KA" | "KMD" | "manual" | null`,
            },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Aggressive JSON extraction — find the first {...} block
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const clean = jsonMatch ? jsonMatch[0] : ''

    try {
      const parsed = JSON.parse(clean)
      return NextResponse.json(parsed)
    } catch {
      // Claude responded but not in JSON — extract what we can
      const lower = text.toLowerCase()
      const isKosher = lower.includes('kosher') && !lower.includes('no kosher') && !lower.includes('not kosher') && !lower.includes('no es kosher')
      const certifier = text.match(/\b(OU|OK|KMD|KA)\b/)?.[1] || null

      return NextResponse.json({
        is_kosher: isKosher ? true : null,
        product_name: null,
        brand: null,
        category: null,
        certifier,
        notes: 'Análisis completado',
        analysis_summary: text.slice(0, 150),
      })
    }
  } catch (error: any) {
    console.error('Photo analysis error:', error)
    return NextResponse.json(
      { error: 'Analysis failed', details: error.message },
      { status: 500 }
    )
  }
}
