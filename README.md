# KosherCheck 🔱

PWA personal de Rolo y Claudia para verificar si un producto es Kosher en México.

## Funciones

- **Escanear**: código de barras con la cámara del celular
- **Buscar**: por nombre o marca del producto
- **Fotografiar**: Claude Vision analiza la etiqueta

## Resultados

- ✅ **Kosher** — producto certificado con certifier y categoría
- ❌ **No Kosher** — producto no apto
- ⚠️ **No encontrado** — opción de agregar manualmente

## Stack

- Next.js 14 + TypeScript + Tailwind CSS
- Supabase (base de datos + caché offline)
- Claude Vision API (análisis de etiqueta por foto)
- ZXing (escaneo de código de barras)
- Vercel (deploy en rama `production`)

## Configuración

Variables de entorno requeridas:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
```

## Base de datos

Ejecutar `supabase-migration.sql` en el SQL Editor de Supabase proyecto `pwsrjmhmxqfxmcadhjtz`.

## Deploy

La rama `production` se despliega automáticamente en Vercel.

---

Hecho por Colmena 2026
