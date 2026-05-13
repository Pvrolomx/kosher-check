-- KosherCheck - Tabla principal de productos kosher
-- Ejecutar en Supabase SQL Editor del proyecto pwsrjmhmxqfxmcadhjtz

CREATE TABLE IF NOT EXISTS kosher_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barcode TEXT UNIQUE,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT CHECK (category IN ('carne', 'lacteo', 'parve')),
  certifier TEXT CHECK (certifier IN ('KMD', 'KA', 'OU', 'OK', 'manual')) DEFAULT 'manual',
  is_kosher BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_kosher_products_barcode ON kosher_products(barcode);
CREATE INDEX IF NOT EXISTS idx_kosher_products_name ON kosher_products USING gin(to_tsvector('spanish', name));
CREATE INDEX IF NOT EXISTS idx_kosher_products_brand ON kosher_products(brand);
CREATE INDEX IF NOT EXISTS idx_kosher_products_is_kosher ON kosher_products(is_kosher);

-- RLS: acceso público para lectura, autenticado para escritura
ALTER TABLE kosher_products ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública (la app usa anon key)
CREATE POLICY "Public read access" ON kosher_products
  FOR SELECT USING (true);

-- Política de escritura para anon (uso personal, no restringido)
CREATE POLICY "Anon insert/update" ON kosher_products
  FOR ALL USING (true) WITH CHECK (true);

-- Seed: algunos productos de prueba para México
INSERT INTO kosher_products (name, brand, category, certifier, is_kosher, notes) VALUES
  ('Leche Lala Entera', 'Lala', 'lacteo', 'OU', true, 'Certificada OU Dairy'),
  ('Galletas Oreo', 'Nabisco', 'lacteo', 'OU', true, 'OU-D en la parte trasera'),
  ('Coca Cola', 'Coca-Cola', 'parve', 'OU', true, 'OU Parve'),
  ('Atún en Agua StarKist', 'StarKist', 'parve', 'OU', true, 'OU Fish Parve'),
  ('Aceite Nutrioli', 'Nutrioli', 'parve', 'OK', true, 'OK Parve'),
  ('Manzanas', NULL, 'parve', 'manual', true, 'Fruta fresca, naturalmente parve'),
  ('Pan Bimbo Blanco', 'Bimbo', 'parve', 'KMD', true, 'Certificado KMD México'),
  ('Jamón de Cerdo', NULL, 'carne', 'manual', false, 'Cerdo - no kosher'),
  ('Camarones', NULL, 'parve', 'manual', false, 'Mariscos - no kosher')
ON CONFLICT (barcode) DO NOTHING;
