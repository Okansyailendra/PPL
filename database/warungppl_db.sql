-- =========================================================================
-- WarungPPL Database Script (MySQL / MariaDB Edition)
-- Database Name: `warungppl_db`
-- =========================================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `warungppl_db`
--

-- --------------------------------------------------------
-- 1. Tabel users (Pemilik Warung / Kasir)
-- --------------------------------------------------------

DROP TABLE IF EXISTS `payment_logs`;
DROP TABLE IF EXISTS `transactions`;
DROP TABLE IF EXISTS `debts`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `customers`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) NOT NULL,
  `store_name` varchar(191) NOT NULL,
  `owner_name` varchar(191) NOT NULL,
  `phone_number` varchar(50) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` (`id`, `email`, `password`, `store_name`, `owner_name`, `phone_number`, `created_at`) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin@warungberkah.com', 'password123', 'Warung Sembako Berkah', 'Helwiyah', '081234567890', '2026-10-02 14:13:16'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'toko.madura@gmail.com', 'madura123', 'Toko Madura Barokah 24 Jam', 'H. Hasan Basri', '081987654321', '2026-10-12 14:13:16');

-- --------------------------------------------------------
-- 2. Tabel categories (Kategori Produk)
-- --------------------------------------------------------

CREATE TABLE `categories` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `umkm_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_categories_umkm` (`umkm_id`),
  CONSTRAINT `fk_categories_user` FOREIGN KEY (`umkm_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `categories` (`id`, `umkm_id`, `name`, `description`, `created_at`) VALUES
('cat-01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Mi & Makanan Instan', 'Mi instan dan makanan siap saji cepat saji', '2026-10-07 14:13:16'),
('cat-02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Bumbu & Dapur', 'Saus, kecap, merica, dan penyedap masakan', '2026-10-07 14:13:16'),
('cat-03', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Makanan Ringan & Biskuit', 'Cokelat, pilus, wafer, camilan, brownies, biskuit', '2026-10-07 14:13:16'),
('cat-04', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Minuman', 'Minuman gelas, jus, isotonik, air mineral, susu, dan teh', '2026-10-07 14:13:16'),
('cat-05', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sabun & Kebutuhan Rumah Tangga', 'Pewangi pakaian, sabun mandi, deterjen, sabun cuci piring', '2026-10-07 14:13:16'),
('cat-06', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Obat & Kesehatan', 'Jamu saset, obat masuk angin, obat diare anak, madu', '2026-10-07 14:13:16'),
('cat-07', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Perlengkapan & Korek Api', 'Selotip, lakban, dan korek api', '2026-10-07 14:13:16');

-- --------------------------------------------------------
-- 3. Tabel products (Inventaris Produk & Stok)
-- --------------------------------------------------------

CREATE TABLE `products` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `umkm_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` int NOT NULL,
  `cost_price` int NOT NULL DEFAULT '0',
  `stock` int NOT NULL DEFAULT '0',
  `min_stock` int NOT NULL DEFAULT '5',
  `unit` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pcs',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_products_umkm` (`umkm_id`),
  KEY `idx_products_category` (`category_id`),
  KEY `idx_products_stock` (`stock`),
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_products_user` FOREIGN KEY (`umkm_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `products` (`id`, `umkm_id`, `category_id`, `category`, `name`, `price`, `cost_price`, `stock`, `min_stock`, `unit`, `created_at`) VALUES
-- 1. Mi instan & makanan instan
('p01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-01', 'Mi & Makanan Instan', 'Intermi Rasa Kaldu Ayam', 2000, 1500, 60, 12, 'bungkus', '2026-10-07 14:13:16'),
('p02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-01', 'Mi & Makanan Instan', 'Mie Sedaap Goreng 90g', 3500, 2900, 80, 15, 'bungkus', '2026-10-07 14:13:16'),
('p03', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-01', 'Mi & Makanan Instan', 'Indomie Goreng Spesial 85g', 3500, 2900, 120, 20, 'bungkus', '2026-10-07 14:13:16'),
('p04', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-01', 'Mi & Makanan Instan', 'Wow Spageti Meaty Bolognese', 5000, 4200, 30, 8, 'bungkus', '2026-10-07 14:13:16'),

-- 2. Bumbu & Dapur
('p05', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-02', 'Bumbu & Dapur', 'Del Monte Saus Tomat & Sambal Sachet', 1000, 700, 50, 10, 'sachet', '2026-10-07 14:13:16'),
('p06', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-02', 'Bumbu & Dapur', 'Ladaku Merica Bubuk Sachet', 1500, 1100, 60, 10, 'sachet', '2026-10-07 14:13:16'),

-- 3. Makanan Ringan & Biskuit
('p07', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-03', 'Makanan Ringan & Biskuit', 'Choki Choki Chococashew', 1500, 1000, 40, 10, 'pcs', '2026-10-07 14:13:16'),
('p08', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-03', 'Makanan Ringan & Biskuit', 'Garuda Pilus Rasa Sapi Panggang 95g', 6500, 5200, 25, 5, 'bungkus', '2026-10-07 14:13:16'),
('p09', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-03', 'Makanan Ringan & Biskuit', 'Gery Salut Malkist Cokelat 110g', 7500, 6200, 24, 6, 'bungkus', '2026-10-07 14:13:16'),
('p10', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-03', 'Makanan Ringan & Biskuit', 'Nabati Siip Keju Stick', 2000, 1500, 45, 10, 'bungkus', '2026-10-07 14:13:16'),
('p11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-03', 'Makanan Ringan & Biskuit', 'Nextar Brownies Choco Delight 8x12g', 7000, 5800, 20, 5, 'kotak', '2026-10-07 14:13:16'),
('p12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-03', 'Makanan Ringan & Biskuit', 'Ring Snack Rasa Keju 20g', 2000, 1500, 30, 5, 'bungkus', '2026-10-07 14:13:16'),
('p13', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-03', 'Makanan Ringan & Biskuit', 'Slai O\'lai Strawberry 128g', 6000, 4900, 25, 5, 'bungkus', '2026-10-07 14:13:16'),

-- 4. Minuman
('p14', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-04', 'Minuman', 'Ale-Ale Minuman Gelas Rasa Jeruk 200ml', 1500, 1000, 48, 12, 'cup', '2026-10-07 14:13:16'),
('p15', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-04', 'Minuman', 'Floridina Orange Juice 350ml', 3500, 2800, 24, 6, 'botol', '2026-10-07 14:13:16'),
('p16', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-04', 'Minuman', 'Isoplus Isotonik 350ml', 3500, 2800, 24, 6, 'botol', '2026-10-07 14:13:16'),
('p17', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-04', 'Minuman', 'Le Minerale Air Mineral 600ml', 3500, 2600, 48, 12, 'botol', '2026-10-07 14:13:16'),
('p18', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-04', 'Minuman', 'Milk Life Susu UHT Cokelat 200ml', 4500, 3700, 20, 5, 'botol', '2026-10-07 14:13:16'),
('p19', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-04', 'Minuman', 'Teh Javana Gula Batu 350ml', 3500, 2700, 30, 6, 'botol', '2026-10-07 14:13:16'),

-- 5. Sabun & Kebutuhan Rumah Tangga
('p20', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-05', 'Sabun & Kebutuhan Rumah Tangga', 'Downy Pewangi Mystique Sachet', 1000, 750, 36, 8, 'sachet', '2026-10-07 14:13:16'),
('p21', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-05', 'Sabun & Kebutuhan Rumah Tangga', 'Giv Sabun Mandi Batang White 76g', 3500, 2800, 24, 6, 'pcs', '2026-10-07 14:13:16'),
('p22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-05', 'Sabun & Kebutuhan Rumah Tangga', 'Molto Pewangi All-in-1 Sachet', 1000, 750, 40, 8, 'sachet', '2026-10-07 14:13:16'),
('p23', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-05', 'Sabun & Kebutuhan Rumah Tangga', 'Rinso Anti Noda Bubuk 770g', 21000, 18500, 15, 4, 'bungkus', '2026-10-07 14:13:16'),
('p24', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-05', 'Sabun & Kebutuhan Rumah Tangga', 'So Klin Liquid Deterjen Sachet', 1000, 750, 48, 10, 'sachet', '2026-10-07 14:13:16'),
('p25', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-05', 'Sabun & Kebutuhan Rumah Tangga', 'Sunlight Jeruk Nipis 210ml', 5000, 4200, 25, 5, 'pouch', '2026-10-07 14:13:16'),

-- 6. Obat & Kesehatan
('p26', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-06', 'Obat & Kesehatan', 'Antangin JRG Herbal Sachet', 4000, 3200, 30, 6, 'sachet', '2026-10-07 14:13:16'),
('p27', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-06', 'Obat & Kesehatan', 'Entrostop Anak Sachet', 3500, 2800, 20, 4, 'sachet', '2026-10-07 14:13:16'),
('p28', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-06', 'Obat & Kesehatan', 'KukuBima Ener-G! Anggur Sachet', 1500, 1100, 50, 10, 'sachet', '2026-10-07 14:13:16'),
('p29', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-06', 'Obat & Kesehatan', 'Madu TJ Murni Sachet 20g', 2500, 1900, 35, 6, 'sachet', '2026-10-07 14:13:16'),

-- 7. Perlengkapan & Korek Api
('p30', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-07', 'Perlengkapan & Korek Api', '3M Scotch Lakban Bening 48mm', 14000, 11500, 12, 3, 'pcs', '2026-10-07 14:13:16'),
('p31', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-07', 'Perlengkapan & Korek Api', 'Korek Api Gas Tokai Original', 3500, 2600, 40, 8, 'pcs', '2026-10-07 14:13:16'),
('p32', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cat-07', 'Perlengkapan & Korek Api', 'Korek Api Zippo Model Klasik', 35000, 26000, 5, 2, 'pcs', '2026-10-07 14:13:16');

-- --------------------------------------------------------
-- 4. Tabel debts (Buku Bon / Piutang)
-- --------------------------------------------------------

CREATE TABLE `debts` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `umkm_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` int NOT NULL,
  `paid_amount` int NOT NULL DEFAULT '0',
  `remaining_amount` int NOT NULL DEFAULT '0',
  `type` enum('BARANG','PINJAMAN_TUNAI') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'BARANG',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `due_date` datetime NOT NULL,
  `status` enum('UNPAID','PARTIAL','PAID') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UNPAID',
  `notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `related_trx_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_debts_umkm` (`umkm_id`),
  KEY `idx_debts_status` (`status`),
  CONSTRAINT `fk_debts_user` FOREIGN KEY (`umkm_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `debts` (`id`, `umkm_id`, `customer_name`, `customer_phone`, `amount`, `paid_amount`, `remaining_amount`, `type`, `created_at`, `due_date`, `status`, `notes`, `related_trx_id`) VALUES
('d1111111-1111-1111-1111-111111111111', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Pak RT Bambang', '081211112222', 75000, 0, 75000, 'BARANG', '2026-10-27 14:13:16', '2026-11-20 14:13:16', 'UNPAID', 'Kasbon sembako & sabun', NULL),
('d2222222-2222-2222-2222-222222222222', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Bu Dewi Sri', '081233334444', 50000, 20000, 30000, 'PINJAMAN_TUNAI', '2026-10-17 14:13:16', '2026-11-15 14:13:16', 'PARTIAL', 'Pinjaman tunai keperluan dapur', NULL);

-- --------------------------------------------------------
-- 5. Tabel payment_logs (Riwayat Pembayaran & Cicilan Kasbon)
-- --------------------------------------------------------

CREATE TABLE `payment_logs` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `debt_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `umkm_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount_paid` int NOT NULL,
  `payment_method` enum('CASH','QRIS','TRANSFER') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CASH',
  `notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_paylog_debt` (`debt_id`),
  KEY `idx_paylog_umkm` (`umkm_id`),
  CONSTRAINT `fk_paylog_debt` FOREIGN KEY (`debt_id`) REFERENCES `debts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_paylog_user` FOREIGN KEY (`umkm_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `payment_logs` (`id`, `debt_id`, `umkm_id`, `amount_paid`, `payment_method`, `notes`, `payment_date`, `created_at`) VALUES
('log-001', 'd2222222-2222-2222-2222-222222222222', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 20000, 'CASH', 'Cicilan pertama diserahkan tunai', '2026-10-25 10:00:00', '2026-10-25 10:00:00');

-- --------------------------------------------------------
-- 6. Tabel transactions (Mutasi Transaksi Penjualan & Kulakan)
-- --------------------------------------------------------

CREATE TABLE `transactions` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `umkm_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `transaction_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `type` enum('IN','OUT') COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_method` enum('CASH','QRIS','CREDIT','ONLINE','TRANSFER') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CASH',
  `payment_status` enum('PENDING','PAID','SETTLEMENT','UNPAID','EXPIRE','CANCEL','FAILED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PAID',
  `total_amount` int NOT NULL,
  `shipping_cost` int DEFAULT '0',
  `courier` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `courier_service` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shipping_address` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `snap_token` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `items` json NOT NULL,
  `debt_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_transactions_umkm` (`umkm_id`),
  KEY `idx_transactions_date` (`transaction_date`),
  KEY `idx_transactions_debt` (`debt_id`),
  CONSTRAINT `fk_transactions_debt` FOREIGN KEY (`debt_id`) REFERENCES `debts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_transactions_user` FOREIGN KEY (`umkm_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Relasi foreign key debts -> transactions (optional link balik)
ALTER TABLE `debts`
  ADD CONSTRAINT `fk_debts_trx` FOREIGN KEY (`related_trx_id`) REFERENCES `transactions` (`id`) ON DELETE SET NULL;

INSERT INTO `transactions` (`id`, `umkm_id`, `customer_name`, `customer_phone`, `created_at`, `transaction_date`, `type`, `category`, `payment_method`, `payment_status`, `total_amount`, `items`, `debt_id`) VALUES
('e1111111-1111-1111-1111-111111111111', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Budi Santoso', '081234567891', '2026-10-26 14:13:16', '2026-10-26 14:13:16', 'IN', 'PENJUALAN', 'CASH', 'PAID', 14000, '[{"name": "Indomie Goreng Spesial 85g", "unit": "bungkus", "price": 3500, "quantity": 2, "subtotal": 7000, "costPrice": 2900, "productId": "p03"}, {"name": "Floridina Orange Juice 350ml", "unit": "botol", "price": 3500, "quantity": 2, "subtotal": 7000, "costPrice": 2800, "productId": "p15"}]', NULL),
('e2222222-2222-2222-2222-222222222222', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Pak RT Bambang', '081211112222', '2026-10-27 14:13:16', '2026-10-27 14:13:16', 'IN', 'PENJUALAN', 'CREDIT', 'UNPAID', 75000, '[{"name": "Rinso Anti Noda Bubuk 770g", "unit": "bungkus", "price": 21000, "quantity": 1, "subtotal": 21000, "costPrice": 18500, "productId": "p23"}, {"name": "Zippo Korek Api Klasik", "unit": "pcs", "price": 35000, "quantity": 1, "subtotal": 35000, "costPrice": 26000, "productId": "p32"}]', 'd1111111-1111-1111-1111-111111111111'),
('e3333333-3333-3333-3333-333333333333', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Siti Rahma', '081987654320', '2026-10-29 14:13:16', '2026-10-29 14:13:16', 'IN', 'PENJUALAN', 'QRIS', 'PAID', 28000, '[{"name": "Sunlight Jeruk Nipis 210ml", "unit": "pouch", "price": 5000, "quantity": 2, "subtotal": 10000, "costPrice": 4200, "productId": "p25"}, {"name": "3M Scotch Lakban Bening 48mm", "unit": "pcs", "price": 14000, "quantity": 1, "subtotal": 14000, "costPrice": 11500, "productId": "p30"}, {"name": "Antangin JRG Herbal Sachet", "unit": "sachet", "price": 4000, "quantity": 1, "subtotal": 4000, "costPrice": 3200, "productId": "p26"}]', NULL),
('e4444444-4444-4444-4444-444444444444', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Agen Grosir Pasar', NULL, '2026-10-30 14:13:16', '2026-10-30 14:13:16', 'OUT', 'KULAKAN', 'CASH', 'PAID', 250000, '[{"name": "Kulakan Mi Instan, Sabun, dan Minuman Dingin", "price": 250000, "quantity": 1, "subtotal": 250000, "costPrice": 250000}]', NULL);

-- --------------------------------------------------------
-- 7. Views Penunjang
-- --------------------------------------------------------

DROP VIEW IF EXISTS `view_piutang_jatuh_tempo`;
CREATE VIEW `view_piutang_jatuh_tempo` AS
SELECT
  `d`.`id` AS `debt_id`,
  `d`.`umkm_id` AS `umkm_id`,
  `u`.`store_name` AS `store_name`,
  `d`.`customer_name` AS `customer_name`,
  `d`.`customer_phone` AS `customer_phone`,
  `d`.`amount` AS `amount`,
  `d`.`paid_amount` AS `paid_amount`,
  `d`.`remaining_amount` AS `remaining_amount`,
  `d`.`type` AS `debt_type`,
  `d`.`due_date` AS `due_date`,
  `d`.`status` AS `status`,
  (CASE
    WHEN (`d`.`due_date` < NOW() AND `d`.`status` != 'PAID') THEN 'JATUH TEMPO'
    WHEN `d`.`status` = 'PAID' THEN 'LUNAS'
    WHEN `d`.`status` = 'PARTIAL' THEN 'DICICIL'
    ELSE 'AKTIF'
  END) AS `status_tempo`
FROM (`debts` `d` JOIN `users` `u` ON (`d`.`umkm_id` = `u`.`id`));

DROP VIEW IF EXISTS `view_produk_kritis`;
CREATE VIEW `view_produk_kritis` AS
SELECT
  `p`.`id` AS `product_id`,
  `p`.`umkm_id` AS `umkm_id`,
  `u`.`store_name` AS `store_name`,
  `p`.`name` AS `product_name`,
  `p`.`stock` AS `stock`,
  `p`.`min_stock` AS `min_stock`,
  `p`.`unit` AS `unit`,
  (`p`.`min_stock` - `p`.`stock`) AS `kekurangan_stok`,
  (CASE
    WHEN `p`.`stock` = 0 THEN 'HABIS (Segera Kulakan)'
    WHEN `p`.`stock` <= `p`.`min_stock` THEN 'MENIPIS (Perlu Restock)'
    ELSE 'AMAN'
  END) AS `status_stok`
FROM (`products` `p` JOIN `users` `u` ON (`p`.`umkm_id` = `u`.`id`))
WHERE `p`.`stock` <= `p`.`min_stock`;

DROP VIEW IF EXISTS `view_ringkasan_umkm`;
CREATE VIEW `view_ringkasan_umkm` AS
SELECT
  `u`.`id` AS `umkm_id`,
  `u`.`store_name` AS `store_name`,
  `u`.`owner_name` AS `owner_name`,
  COUNT(DISTINCT `p`.`id`) AS `total_produk`,
  COALESCE(SUM(CASE WHEN `t`.`type` = 'IN' THEN `t`.`total_amount` ELSE 0 END), 0) AS `total_pemasukan`,
  COALESCE(SUM(CASE WHEN `t`.`type` = 'OUT' THEN `t`.`total_amount` ELSE 0 END), 0) AS `total_pengeluaran`,
  COALESCE((SELECT SUM(`d`.`remaining_amount`) FROM `debts` `d` WHERE `d`.`umkm_id` = `u`.`id` AND `d`.`status` != 'PAID'), 0) AS `total_piutang_aktif`
FROM ((`users` `u`
  LEFT JOIN `products` `p` ON (`u`.`id` = `p`.`umkm_id`))
  LEFT JOIN `transactions` `t` ON (`u`.`id` = `t`.`umkm_id`))
GROUP BY `u`.`id`, `u`.`store_name`, `u`.`owner_name`;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
