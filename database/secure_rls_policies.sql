-- =========================================================================
-- SCRIPT MIGRASI KEAMANAN: Memperbaiki Row Level Security (RLS) di Supabase
-- Jalankan skrip ini di SQL Editor Supabase untuk mengamankan database
-- =========================================================================

-- 1. Pastikan RLS aktif di semua tabel
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 2. HAPUS kebijakan lama yang terlalu terbuka (Allow all ...)
DROP POLICY IF EXISTS "Allow all users" ON public.users;
DROP POLICY IF EXISTS "Allow all debts" ON public.debts;
DROP POLICY IF EXISTS "Allow all payment_logs" ON public.payment_logs;
DROP POLICY IF EXISTS "Allow all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow all categories" ON public.categories;
DROP POLICY IF EXISTS "Allow all products" ON public.products;

-- 3. Kebijakan untuk etalase publik (Katalog barang dan kategori)
-- Hanya diizinkan membaca (SELECT) oleh publik (anon) dan authenticated
DROP POLICY IF EXISTS "Allow public read categories" ON public.categories;
CREATE POLICY "Allow public read categories" ON public.categories
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public read products" ON public.products;
CREATE POLICY "Allow public read products" ON public.products
  FOR SELECT TO anon, authenticated
  USING (true);

-- 4. Batasi akses publik anon terhadap analytical views finansial dan piutang
REVOKE ALL ON public.view_piutang_jatuh_tempo FROM anon;
REVOKE ALL ON public.view_ringkasan_umkm FROM anon;

-- Catatan Keamanan:
-- Tabel `users`, `debts`, `payment_logs`, dan `transactions` sengaja TIDAK diberikan
-- policy untuk role `anon`. Dengan demikian, siapapun yang menggunakan ANON KEY
-- dari browser/Postman akan otomatis ditolak oleh Supabase.
-- Aplikasi Next.js backend akan mengakses tabel-tabel ini secara aman menggunakan
-- SUPABASE_SERVICE_ROLE_KEY di sisi server.
