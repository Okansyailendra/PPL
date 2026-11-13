-- =========================================================================
-- WarungPPL Database Script (Supabase / PostgreSQL Edition)
-- Jalankan file ini di SQL Editor Supabase jika ingin menggunakan Cloud Supabase
-- =========================================================================

-- 1. Hapus tabel lama jika ada
DROP VIEW IF EXISTS public.view_ringkasan_umkm CASCADE;
DROP VIEW IF EXISTS public.view_produk_kritis CASCADE;
DROP VIEW IF EXISTS public.view_piutang_jatuh_tempo CASCADE;

DROP TABLE IF EXISTS public.payment_logs CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.debts CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 2. Tabel users
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  store_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabel categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  umkm_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabel products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  umkm_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  category TEXT,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  cost_price INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 5,
  unit TEXT NOT NULL DEFAULT 'pcs',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabel debts (Buku Bon / Piutang)
CREATE TABLE public.debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  umkm_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  amount INTEGER NOT NULL,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  remaining_amount INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'BARANG' CHECK (type IN ('BARANG', 'PINJAMAN_TUNAI')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PARTIAL', 'PAID')),
  notes TEXT,
  related_trx_id UUID
);

-- 6. Tabel payment_logs (Riwayat Pembayaran & Cicilan Kasbon)
CREATE TABLE public.payment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  umkm_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_paid INTEGER NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'QRIS', 'TRANSFER')),
  notes TEXT,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabel transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  umkm_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('IN', 'OUT')),
  category TEXT,
  payment_method TEXT NOT NULL DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'QRIS', 'CREDIT', 'ONLINE', 'TRANSFER')),
  payment_status TEXT NOT NULL DEFAULT 'PAID' CHECK (payment_status IN ('PENDING', 'PAID', 'SETTLEMENT', 'UNPAID', 'EXPIRE', 'CANCEL', 'FAILED')),
  total_amount INTEGER NOT NULL,
  shipping_cost INTEGER DEFAULT 0,
  courier TEXT,
  courier_service TEXT,
  shipping_address TEXT,
  snap_token TEXT,
  items JSONB NOT NULL,
  debt_id UUID REFERENCES public.debts(id) ON DELETE SET NULL
);

-- Foreign Key debts -> transactions
ALTER TABLE public.debts
  ADD CONSTRAINT fk_debts_trx
  FOREIGN KEY (related_trx_id) REFERENCES public.transactions(id) ON DELETE SET NULL;

-- Enable RLS & Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all debts" ON public.debts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all payment_logs" ON public.payment_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);

-- SEED DATA
INSERT INTO public.users (id, email, password, store_name, owner_name, phone_number, created_at) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin@warungberkah.com', 'password123', 'Warung Sembako Berkah', 'Helwiyah', '081234567890', '2026-10-02 14:13:16+00'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'toko.madura@gmail.com', 'madura123', 'Toko Madura Barokah 24 Jam', 'H. Hasan Basri', '081987654321', '2026-10-12 14:13:16+00');

INSERT INTO public.categories (id, umkm_id, name, description, created_at) VALUES
('11111111-0001-4444-8888-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Mi & Makanan Instan', 'Mi instan dan makanan siap saji cepat saji', '2026-10-07 14:13:16+00'),
('11111111-0002-4444-8888-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Bumbu & Dapur', 'Saus, kecap, merica, dan penyedap masakan', '2026-10-07 14:13:16+00'),
('11111111-0003-4444-8888-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Makanan Ringan & Biskuit', 'Cokelat, pilus, wafer, camilan, brownies, biskuit', '2026-10-07 14:13:16+00'),
('11111111-0004-4444-8888-000000000004', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Minuman', 'Minuman gelas, jus, isotonik, air mineral, susu, dan teh', '2026-10-07 14:13:16+00'),
('11111111-0005-4444-8888-000000000005', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sabun & Kebutuhan Rumah Tangga', 'Pewangi pakaian, sabun mandi, deterjen, sabun cuci piring', '2026-10-07 14:13:16+00'),
('11111111-0006-4444-8888-000000000006', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Obat & Kesehatan', 'Jamu saset, obat masuk angin, obat diare anak, madu', '2026-10-07 14:13:16+00'),
('11111111-0007-4444-8888-000000000007', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Perlengkapan & Korek Api', 'Selotip, lakban, dan korek api', '2026-10-07 14:13:16+00');

INSERT INTO public.products (id, umkm_id, category_id, category, name, price, cost_price, stock, min_stock, unit, created_at) VALUES
-- 1. Mi instan & makanan instan
('22222222-0001-4444-8888-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0001-4444-8888-000000000001', 'Mi & Makanan Instan', 'Intermi Rasa Kaldu Ayam', 2000, 1500, 60, 12, 'bungkus', '2026-10-07 14:13:16+00'),
('22222222-0002-4444-8888-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0001-4444-8888-000000000001', 'Mi & Makanan Instan', 'Mie Sedaap Goreng 90g', 3500, 2900, 80, 15, 'bungkus', '2026-10-07 14:13:16+00'),
('22222222-0003-4444-8888-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0001-4444-8888-000000000001', 'Mi & Makanan Instan', 'Indomie Goreng Spesial 85g', 3500, 2900, 120, 20, 'bungkus', '2026-10-07 14:13:16+00'),
('22222222-0004-4444-8888-000000000004', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0001-4444-8888-000000000001', 'Mi & Makanan Instan', 'Wow Spageti Meaty Bolognese', 5000, 4200, 30, 8, 'bungkus', '2026-10-07 14:13:16+00'),

-- 2. Bumbu & Dapur
('22222222-0005-4444-8888-000000000005', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0002-4444-8888-000000000002', 'Bumbu & Dapur', 'Del Monte Saus Tomat & Sambal Sachet', 1000, 700, 50, 10, 'sachet', '2026-10-07 14:13:16+00'),
('22222222-0006-4444-8888-000000000006', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0002-4444-8888-000000000002', 'Bumbu & Dapur', 'Ladaku Merica Bubuk Sachet', 1500, 1100, 60, 10, 'sachet', '2026-10-07 14:13:16+00'),

-- 3. Makanan Ringan & Biskuit
('22222222-0007-4444-8888-000000000007', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0003-4444-8888-000000000003', 'Makanan Ringan & Biskuit', 'Choki Choki Chococashew', 1500, 1000, 40, 10, 'pcs', '2026-10-07 14:13:16+00'),
('22222222-0008-4444-8888-000000000008', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0003-4444-8888-000000000003', 'Makanan Ringan & Biskuit', 'Garuda Pilus Rasa Sapi Panggang 95g', 6500, 5200, 25, 5, 'bungkus', '2026-10-07 14:13:16+00'),
('22222222-0009-4444-8888-000000000009', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0003-4444-8888-000000000003', 'Makanan Ringan & Biskuit', 'Gery Salut Malkist Cokelat 110g', 7500, 6200, 24, 6, 'bungkus', '2026-10-07 14:13:16+00'),
('22222222-0010-4444-8888-000000000010', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0003-4444-8888-000000000003', 'Makanan Ringan & Biskuit', 'Nabati Siip Keju Stick', 2000, 1500, 45, 10, 'bungkus', '2026-10-07 14:13:16+00'),
('22222222-0011-4444-8888-000000000011', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0003-4444-8888-000000000003', 'Makanan Ringan & Biskuit', 'Nextar Brownies Choco Delight 8x12g', 7000, 5800, 20, 5, 'kotak', '2026-10-07 14:13:16+00'),
('22222222-0012-4444-8888-000000000012', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0003-4444-8888-000000000003', 'Makanan Ringan & Biskuit', 'Ring Snack Rasa Keju 20g', 2000, 1500, 30, 5, 'bungkus', '2026-10-07 14:13:16+00'),
('22222222-0013-4444-8888-000000000013', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0003-4444-8888-000000000003', 'Makanan Ringan & Biskuit', 'Slai O''lai Strawberry 128g', 6000, 4900, 25, 5, 'bungkus', '2026-10-07 14:13:16+00'),

-- 4. Minuman
('22222222-0014-4444-8888-000000000014', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0004-4444-8888-000000000004', 'Minuman', 'Ale-Ale Minuman Gelas Rasa Jeruk 200ml', 1500, 1000, 48, 12, 'cup', '2026-10-07 14:13:16+00'),
('22222222-0015-4444-8888-000000000015', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0004-4444-8888-000000000004', 'Minuman', 'Floridina Orange Juice 350ml', 3500, 2800, 24, 6, 'botol', '2026-10-07 14:13:16+00'),
('22222222-0016-4444-8888-000000000016', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0004-4444-8888-000000000004', 'Minuman', 'Isoplus Isotonik 350ml', 3500, 2800, 24, 6, 'botol', '2026-10-07 14:13:16+00'),
('22222222-0017-4444-8888-000000000017', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0004-4444-8888-000000000004', 'Minuman', 'Le Minerale Air Mineral 600ml', 3500, 2600, 48, 12, 'botol', '2026-10-07 14:13:16+00'),
('22222222-0018-4444-8888-000000000018', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0004-4444-8888-000000000004', 'Minuman', 'Milk Life Susu UHT Cokelat 200ml', 4500, 3700, 20, 5, 'botol', '2026-10-07 14:13:16+00'),
('22222222-0019-4444-8888-000000000019', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0004-4444-8888-000000000004', 'Minuman', 'Teh Javana Gula Batu 350ml', 3500, 2700, 30, 6, 'botol', '2026-10-07 14:13:16+00'),

-- 5. Sabun & Kebutuhan Rumah Tangga
('22222222-0020-4444-8888-000000000020', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0005-4444-8888-000000000005', 'Sabun & Kebutuhan Rumah Tangga', 'Downy Pewangi Mystique Sachet', 1000, 750, 36, 8, 'sachet', '2026-10-07 14:13:16+00'),
('22222222-0021-4444-8888-000000000021', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0005-4444-8888-000000000005', 'Sabun & Kebutuhan Rumah Tangga', 'Giv Sabun Mandi Batang White 76g', 3500, 2800, 24, 6, 'pcs', '2026-10-07 14:13:16+00'),
('22222222-0022-4444-8888-000000000022', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0005-4444-8888-000000000005', 'Sabun & Kebutuhan Rumah Tangga', 'Molto Pewangi All-in-1 Sachet', 1000, 750, 40, 8, 'sachet', '2026-10-07 14:13:16+00'),
('22222222-0023-4444-8888-000000000023', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0005-4444-8888-000000000005', 'Sabun & Kebutuhan Rumah Tangga', 'Rinso Anti Noda Bubuk 770g', 21000, 18500, 15, 4, 'bungkus', '2026-10-07 14:13:16+00'),
('22222222-0024-4444-8888-000000000024', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0005-4444-8888-000000000005', 'Sabun & Kebutuhan Rumah Tangga', 'So Klin Liquid Deterjen Sachet', 1000, 750, 48, 10, 'sachet', '2026-10-07 14:13:16+00'),
('22222222-0025-4444-8888-000000000025', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0005-4444-8888-000000000005', 'Sabun & Kebutuhan Rumah Tangga', 'Sunlight Jeruk Nipis 210ml', 5000, 4200, 25, 5, 'pouch', '2026-10-07 14:13:16+00'),

-- 6. Obat & Kesehatan
('22222222-0026-4444-8888-000000000026', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0006-4444-8888-000000000006', 'Obat & Kesehatan', 'Antangin JRG Herbal Sachet', 4000, 3200, 30, 6, 'sachet', '2026-10-07 14:13:16+00'),
('22222222-0027-4444-8888-000000000027', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0006-4444-8888-000000000006', 'Obat & Kesehatan', 'Entrostop Anak Sachet', 3500, 2800, 20, 4, 'sachet', '2026-10-07 14:13:16+00'),
('22222222-0028-4444-8888-000000000028', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0006-4444-8888-000000000006', 'Obat & Kesehatan', 'KukuBima Ener-G! Anggur Sachet', 1500, 1100, 50, 10, 'sachet', '2026-10-07 14:13:16+00'),
('22222222-0029-4444-8888-000000000029', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0006-4444-8888-000000000006', 'Obat & Kesehatan', 'Madu TJ Murni Sachet 20g', 2500, 1900, 35, 6, 'sachet', '2026-10-07 14:13:16+00'),

-- 7. Perlengkapan & Korek Api
('22222222-0030-4444-8888-000000000030', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0007-4444-8888-000000000007', 'Perlengkapan & Korek Api', '3M Scotch Lakban Bening 48mm', 14000, 11500, 12, 3, 'pcs', '2026-10-07 14:13:16+00'),
('22222222-0031-4444-8888-000000000031', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0007-4444-8888-000000000007', 'Perlengkapan & Korek Api', 'Korek Api Gas Tokai Original', 3500, 2600, 40, 8, 'pcs', '2026-10-07 14:13:16+00'),
('22222222-0032-4444-8888-000000000032', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0007-4444-8888-000000000007', 'Perlengkapan & Korek Api', 'Korek Api Zippo Model Klasik', 35000, 26000, 5, 2, 'pcs', '2026-10-07 14:13:16+00');

INSERT INTO public.debts (id, umkm_id, customer_name, customer_phone, amount, paid_amount, remaining_amount, type, created_at, due_date, status, notes, related_trx_id) VALUES
('d1111111-1111-1111-1111-111111111111', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Pak RT Bambang', '081211112222', 75000, 0, 75000, 'BARANG', '2026-10-27 14:13:16+00', '2026-11-20 14:13:16+00', 'UNPAID', 'Kasbon sembako & sabun', NULL),
('d2222222-2222-2222-2222-222222222222', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Bu Dewi Sri', '081233334444', 50000, 20000, 30000, 'PINJAMAN_TUNAI', '2026-10-17 14:13:16+00', '2026-11-15 14:13:16+00', 'PARTIAL', 'Pinjaman tunai keperluan dapur', NULL);

INSERT INTO public.payment_logs (id, debt_id, umkm_id, amount_paid, payment_method, notes, payment_date, created_at) VALUES
('33333333-0001-4444-8888-000000000001', 'd2222222-2222-2222-2222-222222222222', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 20000, 'CASH', 'Cicilan pertama diserahkan tunai', '2026-10-25 10:00:00+00', '2026-10-25 10:00:00+00');

INSERT INTO public.transactions (id, umkm_id, customer_name, customer_phone, created_at, transaction_date, type, category, payment_method, payment_status, total_amount, items, debt_id) VALUES
('e1111111-1111-1111-1111-111111111111', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Budi Santoso', '081234567891', '2026-10-26 14:13:16+00', '2026-10-26 14:13:16+00', 'IN', 'PENJUALAN', 'CASH', 'PAID', 14000, '[{"name": "Indomie Goreng Spesial 85g", "unit": "bungkus", "price": 3500, "quantity": 2, "subtotal": 7000, "costPrice": 2900, "productId": "22222222-0003-4444-8888-000000000003"}, {"name": "Floridina Orange Juice 350ml", "unit": "botol", "price": 3500, "quantity": 2, "subtotal": 7000, "costPrice": 2800, "productId": "22222222-0015-4444-8888-000000000015"}]'::jsonb, NULL),
('e2222222-2222-2222-2222-222222222222', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Pak RT Bambang', '081211112222', '2026-10-27 14:13:16+00', '2026-10-27 14:13:16+00', 'IN', 'PENJUALAN', 'CREDIT', 'UNPAID', 75000, '[{"name": "Rinso Anti Noda Bubuk 770g", "unit": "bungkus", "price": 21000, "quantity": 1, "subtotal": 21000, "costPrice": 18500, "productId": "22222222-0023-4444-8888-000000000023"}, {"name": "Korek Api Zippo Model Klasik", "unit": "pcs", "price": 35000, "quantity": 1, "subtotal": 35000, "costPrice": 26000, "productId": "22222222-0032-4444-8888-000000000032"}]'::jsonb, 'd1111111-1111-1111-1111-111111111111'),
('e3333333-3333-3333-3333-333333333333', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Siti Rahma', '081987654320', '2026-10-29 14:13:16+00', '2026-10-29 14:13:16+00', 'IN', 'PENJUALAN', 'QRIS', 'PAID', 28000, '[{"name": "Sunlight Jeruk Nipis 210ml", "unit": "pouch", "price": 5000, "quantity": 2, "subtotal": 10000, "costPrice": 4200, "productId": "22222222-0025-4444-8888-000000000025"}, {"name": "3M Scotch Lakban Bening 48mm", "unit": "pcs", "price": 14000, "quantity": 1, "subtotal": 14000, "costPrice": 11500, "productId": "22222222-0030-4444-8888-000000000030"}, {"name": "Antangin JRG Herbal Sachet", "unit": "sachet", "price": 4000, "quantity": 1, "subtotal": 4000, "costPrice": 3200, "productId": "22222222-0026-4444-8888-000000000026"}]'::jsonb, NULL),
('e4444444-4444-4444-4444-444444444444', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Agen Grosir Pasar', NULL, '2026-10-30 14:13:16+00', '2026-10-30 14:13:16+00', 'OUT', 'KULAKAN', 'CASH', 'PAID', 250000, '[{"name": "Kulakan Mi Instan, Sabun, dan Minuman Dingin", "price": 250000, "quantity": 1, "subtotal": 250000, "costPrice": 250000}]'::jsonb, NULL);
