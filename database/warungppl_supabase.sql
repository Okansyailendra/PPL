-- =========================================================================
-- WarungPPL Database Script (Supabase / PostgreSQL Edition)
-- Dilengkapi dukungan Akun Penjual & Akun Pembeli (Google Login)
-- Total 10 Kategori & 69 Produk Kelontong / Warung Madura Lengkap
-- =========================================================================

-- 1. Hapus Views & Tabel Lama Jika Ada (Clean Setup)
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

-- 2. Tabel users (Akun Penjual / Admin & Pembeli / Google Login)
CREATE TABLE public.users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT UNIQUE NOT NULL,
  password TEXT NULL,
  store_name TEXT NULL,
  owner_name TEXT NOT NULL,
  phone_number TEXT NULL,
  role TEXT NOT NULL DEFAULT 'pelanggan' CHECK (role IN ('penjual', 'pelanggan', 'admin')),
  avatar_url TEXT NULL,
  google_id TEXT NULL,
  address TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabel categories (Kategori Produk Etalase)
CREATE TABLE public.categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  umkm_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabel products (Inventaris Produk & Stok)
CREATE TABLE public.products (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  umkm_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
  category TEXT,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  cost_price INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 5,
  unit TEXT NOT NULL DEFAULT 'pcs',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabel debts (Buku Bon / Piutang Warung)
CREATE TABLE public.debts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  umkm_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
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
  related_trx_id TEXT
);

-- 6. Tabel payment_logs (Riwayat Pembayaran & Cicilan Kasbon)
CREATE TABLE public.payment_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  debt_id TEXT NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  umkm_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_paid INTEGER NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'QRIS', 'TRANSFER')),
  notes TEXT,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabel transactions (Mutasi Transaksi Penjualan, E-Commerce & Kulakan)
CREATE TABLE public.transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  umkm_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
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
  debt_id TEXT REFERENCES public.debts(id) ON DELETE SET NULL
);

-- Foreign Key debts -> transactions
ALTER TABLE public.debts
  ADD CONSTRAINT fk_debts_trx
  FOREIGN KEY (related_trx_id) REFERENCES public.transactions(id) ON DELETE SET NULL;

-- --------------------------------------------------------
-- 8. Row Level Security (RLS) & Policies
-- --------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Policy untuk users: Dapat dibaca publik/authenticated untuk cek profil/login
DROP POLICY IF EXISTS "Allow read users" ON public.users;
CREATE POLICY "Allow read users" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert users" ON public.users;
CREATE POLICY "Allow insert users" ON public.users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update users" ON public.users;
CREATE POLICY "Allow update users" ON public.users FOR UPDATE USING (true) WITH CHECK (true);

-- Policy untuk categories: Etalase Publik boleh membaca
DROP POLICY IF EXISTS "Allow public read categories" ON public.categories;
CREATE POLICY "Allow public read categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow modify categories" ON public.categories;
CREATE POLICY "Allow modify categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);

-- Policy untuk products: Etalase Publik boleh membaca
DROP POLICY IF EXISTS "Allow public read products" ON public.products;
CREATE POLICY "Allow public read products" ON public.products FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow modify products" ON public.products;
CREATE POLICY "Allow modify products" ON public.products FOR ALL USING (true) WITH CHECK (true);

-- Policy untuk debts & payment_logs
DROP POLICY IF EXISTS "Allow all debts" ON public.debts;
CREATE POLICY "Allow all debts" ON public.debts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all payment_logs" ON public.payment_logs;
CREATE POLICY "Allow all payment_logs" ON public.payment_logs FOR ALL USING (true) WITH CHECK (true);

-- Policy untuk transactions: Memungkinkan checkout pesanan e-commerce
DROP POLICY IF EXISTS "Allow all transactions" ON public.transactions;
CREATE POLICY "Allow all transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);

-- --------------------------------------------------------
-- 9. Views Penunjang Laporan & Monitoring
-- --------------------------------------------------------
CREATE VIEW public.view_piutang_jatuh_tempo AS
SELECT
  d.id AS debt_id,
  d.umkm_id AS umkm_id,
  u.store_name AS store_name,
  d.customer_name AS customer_name,
  d.customer_phone AS customer_phone,
  d.amount AS amount,
  d.paid_amount AS paid_amount,
  d.remaining_amount AS remaining_amount,
  d.type AS debt_type,
  d.due_date AS due_date,
  d.status AS status,
  (CASE
    WHEN (d.due_date < NOW() AND d.status != 'PAID') THEN 'JATUH TEMPO'
    WHEN d.status = 'PAID' THEN 'LUNAS'
    WHEN d.status = 'PARTIAL' THEN 'DICICIL'
    ELSE 'AKTIF'
  END) AS status_tempo
FROM public.debts d
JOIN public.users u ON d.umkm_id = u.id;

CREATE VIEW public.view_produk_kritis AS
SELECT
  p.id AS product_id,
  p.umkm_id AS umkm_id,
  u.store_name AS store_name,
  p.name AS product_name,
  p.stock AS stock,
  p.min_stock AS min_stock,
  p.unit AS unit,
  (p.min_stock - p.stock) AS kekurangan_stok,
  (CASE
    WHEN p.stock = 0 THEN 'HABIS (Segera Kulakan)'
    WHEN p.stock <= p.min_stock THEN 'MENIPIS (Perlu Restock)'
    ELSE 'AMAN'
  END) AS status_stok
FROM public.products p
JOIN public.users u ON p.umkm_id = u.id
WHERE p.stock <= p.min_stock;

CREATE VIEW public.view_ringkasan_umkm AS
SELECT
  u.id AS umkm_id,
  u.store_name AS store_name,
  u.owner_name AS owner_name,
  COUNT(DISTINCT p.id) AS total_produk,
  COALESCE(SUM(CASE WHEN t.type = 'IN' THEN t.total_amount ELSE 0 END), 0) AS total_pemasukan,
  COALESCE(SUM(CASE WHEN t.type = 'OUT' THEN t.total_amount ELSE 0 END), 0) AS total_pengeluaran,
  COALESCE((SELECT SUM(d.remaining_amount) FROM public.debts d WHERE d.umkm_id = u.id AND d.status != 'PAID'), 0) AS total_piutang_aktif
FROM public.users u
LEFT JOIN public.products p ON u.id = p.umkm_id
LEFT JOIN public.transactions t ON u.id = t.umkm_id
GROUP BY u.id, u.store_name, u.owner_name;

-- --------------------------------------------------------
-- 10. SEED DATA
-- --------------------------------------------------------

-- Akun Penjual & Pembeli (Google Login)
INSERT INTO public.users (id, email, password, store_name, owner_name, phone_number, role, avatar_url, google_id, address, created_at) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'adminwadira12@gmail.com', NULL, 'Toko Wadira (Warung Madura)', 'Admin Wadira', '089516201846', 'penjual', NULL, NULL, 'Jl. Raya Warung Madura No. 12', '2026-10-02 14:13:16+00'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'okanwahyudi540@gmail.com', NULL, 'Toko Wadira (Warung Madura)', 'Okan Wahyudi', '089516201846', 'penjual', NULL, NULL, 'Jl. Raya Warung Madura No. 12', '2026-10-02 14:13:16+00'),
('b93bb3f4-86b7-4348-92f7-14a2a816de08', 'otansyailendra123@gmail.com', NULL, NULL, '24-179 Okansyailendrawahyudi', '081234567899', 'pelanggan', NULL, NULL, 'Kos Putra Jl. Melati No. 5', '2026-11-19 13:39:07+00');

-- 10 Kategori Lengkap
INSERT INTO public.categories (id, umkm_id, name, description, created_at) VALUES
('11111111-0001-4444-8888-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Mi & Makanan Instan', 'Mi instan dan makanan siap saji cepat saji', '2026-10-07 14:13:16+00'),
('11111111-0002-4444-8888-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Bumbu & Dapur', 'Saus, kecap, merica, bumbu racik, dan penyedap masakan', '2026-10-07 14:13:16+00'),
('11111111-0003-4444-8888-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Makanan Ringan & Biskuit', 'Cokelat, pilus, wafer, camilan siip, brownies, biskuit, sosis', '2026-10-07 14:13:16+00'),
('11111111-0004-4444-8888-000000000004', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Minuman', 'Minuman gelas, jus botol, isotonik, air mineral, susu, teh, dan kopi saset', '2026-10-07 14:13:16+00'),
('11111111-0005-4444-8888-000000000005', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sabun & Kebutuhan Rumah Tangga', 'Pewangi pakaian, sabun mandi, deterjen, sampo, sabun cuci piring', '2026-10-07 14:13:16+00'),
('11111111-0006-4444-8888-000000000006', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Obat & Kesehatan', 'Jamu saset, obat masuk angin, obat diare anak, madu saset', '2026-10-07 14:13:16+00'),
('11111111-0007-4444-8888-000000000007', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Perlengkapan & Alat Rumah Tangga', 'Selotip, lakban, tali rafia, bohlam lampu, dan korek api', '2026-10-07 14:13:16+00'),
('11111111-0008-4444-8888-000000000008', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Aksesoris & Elektronik', 'Jam tangan, kalung, gelang, headset, kipas mini, mainan anak, parfum', '2026-10-07 14:13:16+00'),
('11111111-0009-4444-8888-000000000009', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Tagihan & Pulsa', 'Token listrik PLN, tagihan air PDAM, pulsa & paket data all operator', '2026-10-07 14:13:16+00'),
('11111111-0010-4444-8888-000000000010', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Gas & Galon', 'Gas LPG tabung melon 3 kg dan air minum galon isi ulang 19 liter', '2026-10-07 14:13:16+00');

-- 69 Produk Lengkap
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
('22222222-0032-4444-8888-000000000032', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0007-4444-8888-000000000007', 'Perlengkapan & Korek Api', 'Korek Api Zippo Model Klasik', 35000, 26000, 5, 2, 'pcs', '2026-10-07 14:13:16+00'),

-- Tambahan Kategori 2. Bumbu & Dapur
('22222222-0033-4444-8888-000000000033', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0002-4444-8888-000000000002', 'Bumbu & Dapur', 'Masako Bumbu Kaldu Rasa Sapi 10g', 1000, 500, 80, 15, 'sachet', '2026-10-07 14:13:16+00'),
('22222222-0034-4444-8888-000000000034', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0002-4444-8888-000000000002', 'Bumbu & Dapur', 'Masako Bumbu Kaldu Rasa Ayam 10g', 1000, 500, 80, 15, 'sachet', '2026-10-07 14:13:16+00'),
('22222222-0035-4444-8888-000000000035', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0002-4444-8888-000000000002', 'Bumbu & Dapur', 'Royco Bumbu Pelezat Rasa Sapi 9g', 1000, 500, 80, 15, 'sachet', '2026-10-07 14:13:16+00'),
('22222222-0036-4444-8888-000000000036', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0002-4444-8888-000000000002', 'Bumbu & Dapur', 'Sajiku Bumbu Nasi Goreng Rasa Ayam 20g', 2500, 1800, 40, 8, 'bungkus', '2026-10-07 14:13:16+00'),
('22222222-0037-4444-8888-000000000037', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0002-4444-8888-000000000002', 'Bumbu & Dapur', 'Sajiku Bumbu Ikan Goreng Gurih 20g', 2500, 1800, 35, 8, 'bungkus', '2026-10-07 14:13:16+00'),
('22222222-0038-4444-8888-000000000008', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0002-4444-8888-000000000002', 'Bumbu & Dapur', 'Kecap Sedaap Kedelai Hitam Pouch 250ml', 10500, 8500, 20, 5, 'pouch', '2026-10-07 14:13:16+00'),
('22222222-0039-4444-8888-000000000039', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0002-4444-8888-000000000002', 'Bumbu & Dapur', 'Kecap Sedaap Kedelai Hitam Pouch 500ml', 19000, 15500, 15, 4, 'pouch', '2026-10-07 14:13:16+00'),
('22222222-0040-4444-8888-000000000040', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0002-4444-8888-000000000002', 'Bumbu & Dapur', 'Minyak Goreng Bimoli Klasik Pouch 1 Liter', 20000, 17500, 24, 5, 'pouch', '2026-10-07 14:13:16+00'),
('22222222-0041-4444-8888-000000000041', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0002-4444-8888-000000000002', 'Bumbu & Dapur', 'Minyak Goreng Bimoli Spesial Botol 1 Liter', 22500, 19500, 18, 4, 'botol', '2026-10-07 14:13:16+00'),
('22222222-0042-4444-8888-000000000042', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0002-4444-8888-000000000002', 'Bumbu & Dapur', 'Desaku Ketumbar Bubuk Murni 15g', 2000, 1400, 40, 8, 'sachet', '2026-10-07 14:13:16+00'),
('22222222-0043-4444-8888-000000000043', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0002-4444-8888-000000000002', 'Bumbu & Dapur', 'Desaku Kunyit Bubuk Murni 10g', 2000, 1400, 40, 8, 'sachet', '2026-10-07 14:13:16+00'),

-- Tambahan Kategori 3. Makanan Ringan & Biskuit
('22222222-0044-4444-8888-000000000044', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0003-4444-8888-000000000003', 'Makanan Ringan & Biskuit', 'Sosis So Nice Siap Makan Rasa Sapi', 1500, 1000, 60, 12, 'pcs', '2026-10-07 14:13:16+00'),

-- Tambahan Kategori 4. Minuman
('22222222-0045-4444-8888-000000000045', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0004-4444-8888-000000000004', 'Minuman', 'Sariwangi Teh Celup Asli Renceng (12 Bag)', 7500, 5800, 25, 5, 'renceng', '2026-10-07 14:13:16+00'),
('22222222-0046-4444-8888-000000000046', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0004-4444-8888-000000000004', 'Minuman', 'Kopi Kapal Api Spesial Mix Gula 23g', 2000, 1400, 70, 15, 'sachet', '2026-10-07 14:13:16+00'),
('22222222-0047-4444-8888-000000000047', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0004-4444-8888-000000000004', 'Minuman', 'Luwak White Koffie Original 3in1 20g', 2000, 1400, 60, 15, 'sachet', '2026-10-07 14:13:16+00'),
('22222222-0048-4444-8888-000000000048', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0004-4444-8888-000000000004', 'Minuman', 'Teh Hijau Segar Kemasan Gelas 200ml', 1500, 1000, 48, 12, 'gelas', '2026-10-07 14:13:16+00'),

-- Tambahan Kategori 5. Sabun & Kebutuhan Rumah Tangga
('22222222-0049-4444-8888-000000000049', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0005-4444-8888-000000000005', 'Sabun & Kebutuhan Rumah Tangga', 'Sunlight Cuci Piring Jeruk Nipis 650ml', 15500, 12800, 20, 5, 'pouch', '2026-10-07 14:13:16+00'),
('22222222-0050-4444-8888-000000000050', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0005-4444-8888-000000000005', 'Sabun & Kebutuhan Rumah Tangga', 'Sampo Lifebuoy Anti Ketombe Renceng', 6000, 4800, 20, 4, 'renceng', '2026-10-07 14:13:16+00'),
('22222222-0051-4444-8888-000000000051', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0005-4444-8888-000000000005', 'Sabun & Kebutuhan Rumah Tangga', 'Sabun Mandi Batang Nuvo Family 76g', 4000, 3000, 30, 6, 'batang', '2026-10-07 14:13:16+00'),
('22222222-0052-4444-8888-000000000052', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0005-4444-8888-000000000005', 'Sabun & Kebutuhan Rumah Tangga', 'Deterjen Bubuk Daia Bunga 290g', 6000, 4800, 25, 5, 'bungkus', '2026-10-07 14:13:16+00'),

-- Tambahan Kategori 7. Perlengkapan & Alat Rumah Tangga
('22222222-0053-4444-8888-000000000053', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0007-4444-8888-000000000007', 'Perlengkapan & Alat Rumah Tangga', 'Lakban Cokelat / Bening Serbaguna 2 Inch', 12000, 8500, 15, 4, 'roll', '2026-10-07 14:13:16+00'),
('22222222-0054-4444-8888-000000000054', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0007-4444-8888-000000000007', 'Perlengkapan & Alat Rumah Tangga', 'Tali Rafia Gulungan Sedang 1/2 Kg', 13000, 9500, 15, 3, 'gulung', '2026-10-07 14:13:16+00'),
('22222222-0055-4444-8888-000000000055', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0007-4444-8888-000000000007', 'Perlengkapan & Alat Rumah Tangga', 'Lampu Pijar Hemat Energi Philips 18W', 32000, 26000, 10, 2, 'unit', '2026-10-07 14:13:16+00'),
('22222222-0056-4444-8888-000000000056', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0007-4444-8888-000000000007', 'Perlengkapan & Alat Rumah Tangga', 'Bohlam Lampu LED Opple Bright 40 Watt', 48000, 38000, 8, 2, 'unit', '2026-10-07 14:13:16+00'),
('22222222-0057-4444-8888-000000000057', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0007-4444-8888-000000000007', 'Perlengkapan & Alat Rumah Tangga', 'Bohlam Lampu LED Haomen Super Terang 30 Watt', 29000, 22000, 10, 2, 'unit', '2026-10-07 14:13:16+00'),

-- 8. Aksesoris & Elektronik
('22222222-0058-4444-8888-000000000058', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0008-4444-8888-000000000008', 'Aksesoris & Elektronik', 'Gelang Tali Etnik / Manik Kasual', 5000, 3000, 20, 5, 'pcs', '2026-10-07 14:13:16+00'),
('22222222-0059-4444-8888-000000000059', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0008-4444-8888-000000000008', 'Aksesoris & Elektronik', 'Kipas Angin Mini Portable USB Rechargeable', 30000, 22000, 8, 2, 'unit', '2026-10-07 14:13:16+00'),
('22222222-0060-4444-8888-000000000060', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0008-4444-8888-000000000008', 'Aksesoris & Elektronik', 'Mainan Anak Mobil-Mobilan / Tiup Balon', 7000, 4000, 15, 4, 'pcs', '2026-10-07 14:13:16+00'),
('22222222-0061-4444-8888-000000000061', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0008-4444-8888-000000000008', 'Aksesoris & Elektronik', 'Headset / Earphone Bass Stereo 3.5mm', 20000, 13000, 10, 3, 'pcs', '2026-10-07 14:13:16+00'),
('22222222-0062-4444-8888-000000000062', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0008-4444-8888-000000000008', 'Aksesoris & Elektronik', 'Jam Tangan Sport Digital LED Anti Air', 40000, 28000, 8, 2, 'unit', '2026-10-07 14:13:16+00'),
('22222222-0063-4444-8888-000000000063', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0008-4444-8888-000000000008', 'Aksesoris & Elektronik', 'Kalung Titanium / Tali Liontin Stylish', 18000, 11000, 12, 3, 'pcs', '2026-10-07 14:13:16+00'),
('22222222-0064-4444-8888-000000000064', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0008-4444-8888-000000000008', 'Aksesoris & Elektronik', 'Parfum Minyak Wangi Roll-On Non Alkohol 6ml', 15000, 9500, 15, 3, 'botol', '2026-10-07 14:13:16+00'),

-- 9. Tagihan & Pulsa
('22222222-0065-4444-8888-000000000065', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0009-4444-8888-000000000009', 'Tagihan & Pulsa', 'Token Listrik PLN Prabayar (Denom 20k - 100k)', 23000, 20500, 99, 10, 'transaksi', '2026-10-07 14:13:16+00'),
('22222222-0066-4444-8888-000000000066', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0009-4444-8888-000000000009', 'Tagihan & Pulsa', 'Pembayaran Tagihan Air PDAM Bulanan', 5000, 2500, 99, 10, 'transaksi', '2026-10-07 14:13:16+00'),
('22222222-0067-4444-8888-000000000067', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0009-4444-8888-000000000009', 'Tagihan & Pulsa', 'Pulsa & Paket Data All Operator', 13000, 10500, 99, 10, 'transaksi', '2026-10-07 14:13:16+00'),

-- 10. Gas & Galon
('22222222-0068-4444-8888-000000000068', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0010-4444-8888-000000000010', 'Gas & Galon', 'Gas LPG Tabung Melon 3 Kg (Tukar Tabung)', 22000, 19000, 16, 3, 'tabung', '2026-10-07 14:13:16+00'),
('22222222-0069-4444-8888-000000000069', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11111111-0010-4444-8888-000000000010', 'Gas & Galon', 'Air Minum Galon Isi Ulang Higienis 19L', 6000, 3500, 25, 5, 'galon', '2026-10-07 14:13:16+00');

-- --------------------------------------------------------
-- Data Kasbon, Payment Logs & Transaksi Awal
-- --------------------------------------------------------

INSERT INTO public.debts (id, umkm_id, customer_name, customer_phone, amount, paid_amount, remaining_amount, type, created_at, due_date, status, notes, related_trx_id) VALUES
('d1111111-1111-1111-1111-111111111111', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Pak RT Bambang', '081211112222', 75000, 0, 75000, 'BARANG', '2026-10-27 14:13:16+00', '2026-11-20 14:13:16+00', 'UNPAID', 'Kasbon sembako & sabun', NULL),
('d2222222-2222-2222-2222-222222222222', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Bu Dewi Sri', '081233334444', 50000, 20000, 30000, 'PINJAMAN_TUNAI', '2026-10-17 14:13:16+00', '2026-11-15 14:13:16+00', 'PARTIAL', 'Pinjaman tunai keperluan dapur', NULL);

INSERT INTO public.payment_logs (id, debt_id, umkm_id, amount_paid, payment_method, notes, payment_date, created_at) VALUES
('33333333-0001-4444-8888-000000000001', 'd2222222-2222-2222-2222-222222222222', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 20000, 'CASH', 'Cicilan pertama diserahkan tunai', '2026-10-25 10:00:00+00', '2026-10-25 10:00:00+00');

INSERT INTO public.transactions (id, umkm_id, customer_id, customer_name, customer_phone, created_at, transaction_date, type, category, payment_method, payment_status, total_amount, items, debt_id) VALUES
('e1111111-1111-1111-1111-111111111111', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, 'Budi Santoso', '081234567891', '2026-10-26 14:13:16+00', '2026-10-26 14:13:16+00', 'IN', 'PENJUALAN', 'CASH', 'PAID', 14000, '[{"name": "Indomie Goreng Spesial 85g", "unit": "bungkus", "price": 3500, "quantity": 2, "subtotal": 7000, "costPrice": 2900, "productId": "22222222-0003-4444-8888-000000000003"}, {"name": "Floridina Orange Juice 350ml", "unit": "botol", "price": 3500, "quantity": 2, "subtotal": 7000, "costPrice": 2800, "productId": "22222222-0015-4444-8888-000000000015"}]'::jsonb, NULL),
('e2222222-2222-2222-2222-222222222222', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, 'Pak RT Bambang', '081211112222', '2026-10-27 14:13:16+00', '2026-10-27 14:13:16+00', 'IN', 'PENJUALAN', 'CREDIT', 'UNPAID', 75000, '[{"name": "Rinso Anti Noda Bubuk 770g", "unit": "bungkus", "price": 21000, "quantity": 1, "subtotal": 21000, "costPrice": 18500, "productId": "22222222-0023-4444-8888-000000000023"}, {"name": "Korek Api Zippo Model Klasik", "unit": "pcs", "price": 35000, "quantity": 1, "subtotal": 35000, "costPrice": 26000, "productId": "22222222-0032-4444-8888-000000000032"}]'::jsonb, 'd1111111-1111-1111-1111-111111111111'),
('e3333333-3333-3333-3333-333333333333', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b93bb3f4-86b7-4348-92f7-14a2a816de08', '24-179 Okansyailendrawahyudi', '081234567899', '2026-10-29 14:13:16+00', '2026-10-29 14:13:16+00', 'IN', 'PENJUALAN', 'QRIS', 'PAID', 28000, '[{"name": "Sunlight Jeruk Nipis 210ml", "unit": "pouch", "price": 5000, "quantity": 2, "subtotal": 10000, "costPrice": 4200, "productId": "22222222-0025-4444-8888-000000000025"}, {"name": "3M Scotch Lakban Bening 48mm", "unit": "pcs", "price": 14000, "quantity": 1, "subtotal": 14000, "costPrice": 11500, "productId": "22222222-0030-4444-8888-000000000030"}, {"name": "Antangin JRG Herbal Sachet", "unit": "sachet", "price": 4000, "quantity": 1, "subtotal": 4000, "costPrice": 3200, "productId": "22222222-0026-4444-8888-000000000026"}]'::jsonb, NULL),
('e4444444-4444-4444-4444-444444444444', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, 'Agen Grosir Pasar', NULL, '2026-10-30 14:13:16+00', '2026-10-30 14:13:16+00', 'OUT', 'KULAKAN', 'CASH', 'PAID', 250000, '[{"name": "Kulakan Mi Instan, Sabun, dan Minuman Dingin", "price": 250000, "quantity": 1, "subtotal": 250000, "costPrice": 250000}]'::jsonb, NULL);
