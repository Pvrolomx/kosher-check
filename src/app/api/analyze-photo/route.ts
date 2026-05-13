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
              text: `Analiza esta etiqueta de producto alimenticio y determina si es kosher.

Busca específicamente:
1. Sellos de certificación kosher: OU, OK, KD, KA, KMD, Kosher, כשר, Parve, Dairy, Meat/Fleishig
2. Ingredientes que podrían hacerlo no-kosher (cerdo, mariscos, mezcla carne+lácteo)
3. Nombre del producto y marca si son visibles

Responde SOLO con un JSON válido, sin markdown, exactamente así:
{
  "is_kosher": true | false | null,
  "product_name": "nombre del producto o null",
  "brand": "marca o null",
  "category": "carne" | "lacteo" | "parve" | null,
  "certifier": "OU" | "OK" | "KA" | "KMD" | "manual" | null,
  "notes": "explicación breve en español de máximo 100 caracteres",
  "analysis_summary": "resumen de 1 línea de qué viste en la etiqueta"
}

Si no se puede determinar, usa is_kosher: null.`,
            },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    
    // Clean JSON (remove possible markdown fences)
    const clean = text.replace(/```json|```/g, '').trim()
    
    try {
      const parsed = JSON.parse(clean)
      return NextResponse.json(parsed)
    } catch {
      // If Claude didn't return valid JSON, return a structured error
      return NextResponse.json({
        is_kosher: null,
        product_name: null,
        brand: null,
        category: null,
        certifier: null,
        notes: 'No se pudo analizar la imagen correctamente',
        analysis_summary: text.slice(0, 100),
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
