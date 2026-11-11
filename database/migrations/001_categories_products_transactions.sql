-- =========================================================================
-- Migration 001 (MySQL): Tabel categories, update products & transactions
-- Target Database: warungppl_db
-- =========================================================================

START TRANSACTION;

-- 1. Buat tabel categories
CREATE TABLE IF NOT EXISTS `categories` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `umkm_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_categories_umkm` (`umkm_id`),
  CONSTRAINT `fk_categories_user` FOREIGN KEY (`umkm_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tambahkan kolom category_id & category pada tabel products (jika belum ada)
SET @has_category_id := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'category_id'
);
SET @sql_add_category_id := IF(
  @has_category_id = 0,
  'ALTER TABLE `products` ADD COLUMN `category_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `umkm_id`, ADD KEY `idx_products_category` (`category_id`), ADD CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql_add_category_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_category := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'category'
);
SET @sql_add_category := IF(
  @has_category = 0,
  'ALTER TABLE `products` ADD COLUMN `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `category_id`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_add_category;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Pastikan cost_price (modal), price (harga_jual), stock, dan unit tersedia dengan tipe yang sesuai
ALTER TABLE `products`
  MODIFY COLUMN `price` int NOT NULL,
  MODIFY COLUMN `cost_price` int NOT NULL DEFAULT '0',
  MODIFY COLUMN `stock` int NOT NULL DEFAULT '0',
  MODIFY COLUMN `unit` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pcs';

-- 3. Perbarui tabel transactions: dukung metode bayar CASH / QRIS / CREDIT / ONLINE / TRANSFER & kolom payment_status
ALTER TABLE `transactions`
  MODIFY COLUMN `payment_method` enum('CASH','QRIS','CREDIT','ONLINE','TRANSFER') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CASH';

SET @has_payment_status := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'payment_status'
);
SET @sql_add_payment_status := IF(
  @has_payment_status = 0,
  'ALTER TABLE `transactions` ADD COLUMN `payment_status` enum(''PENDING'',''PAID'',''SETTLEMENT'',''UNPAID'',''EXPIRE'',''CANCEL'',''FAILED'') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ''PAID'' AFTER `payment_method`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_add_payment_status;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Sinkronkan payment_status transaksi lama yang bertipe CREDIT menjadi UNPAID jika belum lunas
UPDATE `transactions` `t`
LEFT JOIN `debts` `d` ON `t`.`debt_id` = `d`.`id`
SET `t`.`payment_status` = IF(`d`.`status` = 'PAID', 'PAID', 'UNPAID')
WHERE `t`.`payment_method` = 'CREDIT';

-- 4. Seed kategori default untuk akun demo jika belum ada
INSERT IGNORE INTO `categories` (`id`, `umkm_id`, `name`, `description`) VALUES
('cat-1111-1111-1111-111111111111', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sembako & Dapur', 'Beras, minyak, gula, tepung, bumbu dapur'),
('cat-2222-2222-2222-222222222222', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Makanan & Snack', 'Mi instan, biskuit, jajanan'),
('cat-3333-3333-3333-333333333333', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Minuman', 'Kopi, teh, air mineral, susu'),
('cat-4444-4444-4444-444444444444', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sabun & Kebersihan', 'Sabun cuci piring, deterjen, perlengkapan mandi'),
('cat-5555-5555-5555-555555555555', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Sembako & Gas', 'Beras, gas elpiji, kebutuhan pokok'),
('cat-6666-6666-6666-666666666666', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Rokok & Korek', 'Rokok kemasan dan korek api');

COMMIT;

