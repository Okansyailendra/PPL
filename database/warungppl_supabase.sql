-- =========================================================================
-- WarungCopilot Database Script (Supabase / PostgreSQL Edition)
-- Jalankan file ini di SQL Editor Supabase jika ingin menggunakan Cloud Supabase
-- =========================================================================

-- 1. Hapus tabel lama jika ada
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.debts CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
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

-- 3. Tabel customers
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  umkm_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabel products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  umkm_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT CHECK (status IN ('UNPAID', 'PAID')) DEFAULT 'UNPAID',
  related_trx_id UUID
);

-- 6. Tabel transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  umkm_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  type TEXT CHECK (type IN ('IN', 'OUT')) NOT NULL,
  category TEXT,
  payment_method TEXT CHECK (payment_method IN ('CASH', 'CREDIT')) DEFAULT 'CASH',
  total_amount INTEGER NOT NULL,
  items JSONB NOT NULL,
  debt_id UUID REFERENCES public.debts(id) ON DELETE SET NULL
);

-- Foreign Key debts -> transactions
ALTER TABLE public.debts
  ADD CONSTRAINT fk_debts_trx
  FOREIGN KEY (related_trx_id) REFERENCES public.transactions(id) ON DELETE SET NULL;

-- Enable RLS & Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all debts" ON public.debts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);

-- SEED DATA
INSERT INTO public.users (id, email, password, store_name, owner_name, phone_number, created_at) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin@warungberkah.com', 'password123', 'Warung Sembako Berkah', 'Hj. Siti Aminah', '081234567890', '2026-10-02 14:13:16+00'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'toko.madura@gmail.com', 'madura123', 'Toko Madura Barokah 24 Jam', 'H. Hasan Basri', '081987654321', '2026-10-12 14:13:16+00');

INSERT INTO public.products (id, umkm_id, name, price, cost_price, stock, min_stock, unit, created_at) VALUES
('c1111111-1111-1111-1111-111111111111', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Beras Ramos Super 5kg', 72000, 65000, 25, 5, 'karung', '2026-10-07 14:13:16+00'),
('c2222222-2222-2222-2222-222222222222', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Minyak Goreng Bimoli 2L', 38000, 34000, 18, 6, 'pouch', '2026-10-07 14:13:16+00'),
('c3333333-3333-3333-3333-333333333333', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Telur Ayam Ras 1kg', 28000, 25000, 40, 10, 'kg', '2026-10-08 14:13:16+00'),
('c4444444-4444-4444-4444-444444444444', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Indomie Goreng Spesial', 3500, 2900, 120, 20, 'pcs', '2026-10-08 14:13:16+00'),
('c5555555-5555-5555-5555-555555555555', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Gula Pasir Gulaku 1kg', 18500, 16500, 30, 8, 'bungkus', '2026-10-09 14:13:16+00'),
('c6666666-6666-6666-6666-666666666666', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Tepung Terigu Segitiga Biru 1kg', 12500, 10500, 15, 5, 'kg', '2026-10-10 14:13:16+00'),
('c7777777-7777-7777-7777-777777777777', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Kopi Kapal Api Special Mix (1 Renceng)', 15000, 13000, 12, 4, 'renceng', '2026-10-12 14:13:16+00'),
('c8888888-8888-8888-8888-888888888888', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Susu Kental Manis Frisian Flag 370g', 12000, 10200, 3, 5, 'kaleng', '2026-10-14 14:13:16+00'),
('c9999999-9999-9999-9999-999999999999', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sunlight Pencuci Piring 700ml', 14500, 12500, 2, 5, 'pouch', '2026-10-17 14:13:16+00'),
('caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Aqua Air Mineral Galon 19L', 20000, 16000, 10, 3, 'galon', '2026-10-20 14:13:16+00'),
('cbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Teh Celup Sosro Kotak (Isi 30)', 7500, 6000, 22, 5, 'kotak', '2026-10-22 14:13:16+00'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Kecap Manis Bango 520ml', 24000, 21000, 8, 4, 'pouch', '2026-10-22 14:13:16+00'),
('cddddddd-dddd-dddd-dddd-dddddddddddd', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Beras Ramos 5kg', 73000, 66000, 15, 4, 'karung', '2026-10-17 14:13:16+00'),
('ceeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Gas Elpiji 3kg (Melon)', 22000, 19000, 20, 5, 'tabung', '2026-10-17 14:13:16+00'),
('cfffffff-ffff-ffff-ffff-ffffffffffff', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Rokok Sampoerna Mild 16', 33000, 30500, 50, 10, 'bungkus', '2026-10-18 14:13:16+00');

INSERT INTO public.debts (id, umkm_id, customer_name, customer_phone, amount, created_at, due_date, status, related_trx_id) VALUES
('d1111111-1111-1111-1111-111111111111', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Pak RT Bambang', '081211112222', 111000, '2026-10-27 14:13:16+00', '2026-11-06 14:13:16+00', 'UNPAID', NULL),
('d2222222-2222-2222-2222-222222222222', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Bu Dewi Sri', '081233334444', 45000, '2026-10-17 14:13:16+00', '2026-10-27 14:13:16+00', 'PAID', NULL),
('d3333333-3333-3333-3333-333333333333', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Mas Rian (Driver Ojol)', '081255556666', 35000, '2026-10-24 14:13:16+00', '2026-10-31 14:13:16+00', 'UNPAID', NULL);

INSERT INTO public.transactions (id, umkm_id, customer_id, created_at, transaction_date, type, category, payment_method, total_amount, items, debt_id) VALUES
('e1111111-1111-1111-1111-111111111111', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, '2026-10-26 14:13:16+00', '2026-10-26 14:13:16+00', 'IN', 'Penjualan Kasir', 'CASH', 100000, '[{"name": "Beras Ramos Super 5kg", "unit": "karung", "price": 72000, "quantity": 1, "subtotal": 72000, "costPrice": 65000, "productId": "c1111111-1111-1111-1111-111111111111"}, {"name": "Telur Ayam Ras 1kg", "unit": "kg", "price": 28000, "quantity": 1, "subtotal": 28000, "costPrice": 25000, "productId": "c3333333-3333-3333-3333-333333333333"}]'::jsonb, NULL),
('e2222222-2222-2222-2222-222222222222', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, '2026-10-27 14:13:16+00', '2026-10-27 14:13:16+00', 'IN', 'Kasbon Pelanggan', 'CREDIT', 111000, '[{"name": "Minyak Goreng Bimoli 2L", "unit": "pouch", "price": 38000, "quantity": 2, "subtotal": 76000, "costPrice": 34000, "productId": "c2222222-2222-2222-2222-222222222222"}, {"name": "Indomie Goreng Spesial", "unit": "pcs", "price": 3500, "quantity": 10, "subtotal": 35000, "costPrice": 2900, "productId": "c4444444-4444-4444-4444-444444444444"}]'::jsonb, 'd1111111-1111-1111-1111-111111111111'),
('e3333333-3333-3333-3333-333333333333', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, '2026-10-29 14:13:16+00', '2026-10-29 14:13:16+00', 'IN', 'Penjualan Kasir', 'CASH', 49500, '[{"name": "Gula Pasir Gulaku 1kg", "unit": "bungkus", "price": 18500, "quantity": 2, "subtotal": 37000, "costPrice": 16500, "productId": "c5555555-5555-5555-5555-555555555555"}, {"name": "Tepung Terigu Segitiga Biru 1kg", "unit": "kg", "price": 12500, "quantity": 1, "subtotal": 12500, "costPrice": 10500, "productId": "c6666666-6666-6666-6666-666666666666"}]'::jsonb, NULL),
('e4444444-4444-4444-4444-444444444444', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, '2026-10-30 14:13:16+00', '2026-10-30 14:13:16+00', 'OUT', 'Kulakan & Restock', 'CASH', 500000, '[{"name": "Kulakan Beras & Minyak Goreng Agen Pasar Induk", "price": 500000, "quantity": 1, "subtotal": 500000, "costPrice": 500000}]'::jsonb, NULL),
('e5555555-5555-5555-5555-555555555555', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, '2026-10-24 14:13:16+00', '2026-10-24 14:13:16+00', 'IN', 'Kasbon Pelanggan', 'CREDIT', 35000, '[{"name": "Aqua Air Mineral Galon 19L", "unit": "galon", "price": 20000, "quantity": 1, "subtotal": 20000, "costPrice": 16000, "productId": "caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}, {"name": "Kopi Kapal Api Special Mix (1 Renceng)", "unit": "renceng", "price": 15000, "quantity": 1, "subtotal": 15000, "costPrice": 13000, "productId": "c7777777-7777-7777-7777-777777777777"}]'::jsonb, 'd3333333-3333-3333-3333-333333333333');

-- Link relasi e2222222 ke d1111111
UPDATE public.debts SET related_trx_id = 'e2222222-2222-2222-2222-222222222222' WHERE id = 'd1111111-1111-1111-1111-111111111111';
UPDATE public.debts SET related_trx_id = 'e5555555-5555-5555-5555-555555555555' WHERE id = 'd3333333-3333-3333-3333-333333333333';
