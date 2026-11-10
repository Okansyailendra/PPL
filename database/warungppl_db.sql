-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Nov 01, 2026 at 02:21 PM
-- Server version: 8.0.30
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `warungcopilot_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `umkm_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `debts`
--

CREATE TABLE `debts` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `umkm_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `due_date` datetime NOT NULL,
  `status` enum('UNPAID','PAID') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UNPAID',
  `related_trx_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `debts`
--

INSERT INTO `debts` (`id`, `umkm_id`, `customer_name`, `customer_phone`, `amount`, `created_at`, `due_date`, `status`, `related_trx_id`) VALUES
('d1111111-1111-1111-1111-111111111111', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Pak RT Bambang', '081211112222', 111000, '2026-10-27 14:13:16', '2026-11-06 14:13:16', 'UNPAID', 'e2222222-2222-2222-2222-222222222222'),
('d2222222-2222-2222-2222-222222222222', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Bu Dewi Sri', '081233334444', 45000, '2026-10-17 14:13:16', '2026-10-27 14:13:16', 'PAID', NULL),
('d3333333-3333-3333-3333-333333333333', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Mas Rian (Driver Ojol)', '081255556666', 35000, '2026-10-24 14:13:16', '2026-10-31 14:13:16', 'UNPAID', 'e5555555-5555-5555-5555-555555555555');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `umkm_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` int NOT NULL,
  `cost_price` int NOT NULL DEFAULT '0',
  `stock` int NOT NULL DEFAULT '0',
  `min_stock` int NOT NULL DEFAULT '5',
  `unit` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pcs',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `umkm_id`, `name`, `price`, `cost_price`, `stock`, `min_stock`, `unit`, `created_at`) VALUES
('c1111111-1111-1111-1111-111111111111', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Beras Ramos Super 5kg', 72000, 65000, 25, 5, 'karung', '2026-10-07 14:13:16'),
('c2222222-2222-2222-2222-222222222222', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Minyak Goreng Bimoli 2L', 38000, 34000, 18, 6, 'pouch', '2026-10-07 14:13:16'),
('c3333333-3333-3333-3333-333333333333', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Telur Ayam Ras 1kg', 28000, 25000, 40, 10, 'kg', '2026-10-08 14:13:16'),
('c4444444-4444-4444-4444-444444444444', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Indomie Goreng Spesial', 3500, 2900, 120, 20, 'pcs', '2026-10-08 14:13:16'),
('c5555555-5555-5555-5555-555555555555', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Gula Pasir Gulaku 1kg', 18500, 16500, 30, 8, 'bungkus', '2026-10-09 14:13:16'),
('c6666666-6666-6666-6666-666666666666', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Tepung Terigu Segitiga Biru 1kg', 12500, 10500, 15, 5, 'kg', '2026-10-10 14:13:16'),
('c7777777-7777-7777-7777-777777777777', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Kopi Kapal Api Special Mix (1 Renceng)', 15000, 13000, 12, 4, 'renceng', '2026-10-12 14:13:16'),
('c8888888-8888-8888-8888-888888888888', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Susu Kental Manis Frisian Flag 370g', 12000, 10200, 3, 5, 'kaleng', '2026-10-14 14:13:16'),
('c9999999-9999-9999-9999-999999999999', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sunlight Pencuci Piring 700ml', 14500, 12500, 2, 5, 'pouch', '2026-10-17 14:13:16'),
('caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Aqua Air Mineral Galon 19L', 20000, 16000, 10, 3, 'galon', '2026-10-20 14:13:16'),
('cbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Teh Celup Sosro Kotak (Isi 30)', 7500, 6000, 22, 5, 'kotak', '2026-10-22 14:13:16'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Kecap Manis Bango 520ml', 24000, 21000, 8, 4, 'pouch', '2026-10-22 14:13:16'),
('cddddddd-dddd-dddd-dddd-dddddddddddd', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Beras Ramos 5kg', 73000, 66000, 15, 4, 'karung', '2026-10-17 14:13:16'),
('ceeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Gas Elpiji 3kg (Melon)', 22000, 19000, 20, 5, 'tabung', '2026-10-17 14:13:16'),
('cfffffff-ffff-ffff-ffff-ffffffffffff', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Rokok Sampoerna Mild 16', 33000, 30500, 50, 10, 'bungkus', '2026-10-18 14:13:16');

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `umkm_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `transaction_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `type` enum('IN','OUT') COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_method` enum('CASH','CREDIT') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CASH',
  `total_amount` int NOT NULL,
  `items` json NOT NULL,
  `debt_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `transactions`
--

INSERT INTO `transactions` (`id`, `umkm_id`, `customer_id`, `created_at`, `transaction_date`, `type`, `category`, `payment_method`, `total_amount`, `items`, `debt_id`) VALUES
('e1111111-1111-1111-1111-111111111111', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, '2026-10-26 14:13:16', '2026-10-26 14:13:16', 'IN', 'Penjualan Kasir', 'CASH', 100000, '[{\"name\": \"Beras Ramos Super 5kg\", \"unit\": \"karung\", \"price\": 72000, \"quantity\": 1, \"subtotal\": 72000, \"costPrice\": 65000, \"productId\": \"c1111111-1111-1111-1111-111111111111\"}, {\"name\": \"Telur Ayam Ras 1kg\", \"unit\": \"kg\", \"price\": 28000, \"quantity\": 1, \"subtotal\": 28000, \"costPrice\": 25000, \"productId\": \"c3333333-3333-3333-3333-333333333333\"}]', NULL),
('e2222222-2222-2222-2222-222222222222', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, '2026-10-27 14:13:16', '2026-10-27 14:13:16', 'IN', 'Kasbon Pelanggan', 'CREDIT', 111000, '[{\"name\": \"Minyak Goreng Bimoli 2L\", \"unit\": \"pouch\", \"price\": 38000, \"quantity\": 2, \"subtotal\": 76000, \"costPrice\": 34000, \"productId\": \"c2222222-2222-2222-2222-222222222222\"}, {\"name\": \"Indomie Goreng Spesial\", \"unit\": \"pcs\", \"price\": 3500, \"quantity\": 10, \"subtotal\": 35000, \"costPrice\": 2900, \"productId\": \"c4444444-4444-4444-4444-444444444444\"}]', 'd1111111-1111-1111-1111-111111111111'),
('e3333333-3333-3333-3333-333333333333', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, '2026-10-29 14:13:16', '2026-10-29 14:13:16', 'IN', 'Penjualan Kasir', 'CASH', 49500, '[{\"name\": \"Gula Pasir Gulaku 1kg\", \"unit\": \"bungkus\", \"price\": 18500, \"quantity\": 2, \"subtotal\": 37000, \"costPrice\": 16500, \"productId\": \"c5555555-5555-5555-5555-555555555555\"}, {\"name\": \"Tepung Terigu Segitiga Biru 1kg\", \"unit\": \"kg\", \"price\": 12500, \"quantity\": 1, \"subtotal\": 12500, \"costPrice\": 10500, \"productId\": \"c6666666-6666-6666-6666-666666666666\"}]', NULL),
('e4444444-4444-4444-4444-444444444444', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, '2026-10-30 14:13:16', '2026-10-30 14:13:16', 'OUT', 'Kulakan & Restock', 'CASH', 500000, '[{\"name\": \"Kulakan Beras & Minyak Goreng Agen Pasar Induk\", \"price\": 500000, \"quantity\": 1, \"subtotal\": 500000, \"costPrice\": 500000}]', NULL),
('e5555555-5555-5555-5555-555555555555', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, '2026-10-24 14:13:16', '2026-10-24 14:13:16', 'IN', 'Kasbon Pelanggan', 'CREDIT', 35000, '[{\"name\": \"Aqua Air Mineral Galon 19L\", \"unit\": \"galon\", \"price\": 20000, \"quantity\": 1, \"subtotal\": 20000, \"costPrice\": 16000, \"productId\": \"caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\"}, {\"name\": \"Kopi Kapal Api Special Mix (1 Renceng)\", \"unit\": \"renceng\", \"price\": 15000, \"quantity\": 1, \"subtotal\": 15000, \"costPrice\": 13000, \"productId\": \"c7777777-7777-7777-7777-777777777777\"}]', 'd3333333-3333-3333-3333-333333333333');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `store_name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner_name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password`, `store_name`, `owner_name`, `phone_number`, `created_at`) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin@warungberkah.com', 'password123', 'Warung Sembako Berkah', 'Helwiyah', '081234567890', '2026-10-02 14:13:16'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'toko.madura@gmail.com', 'madura123', 'Toko Madura Barokah 24 Jam', 'H. Hasan Basri', '081987654321', '2026-10-12 14:13:16');

-- --------------------------------------------------------

--
-- Stand-in structure for view `view_piutang_jatuh_tempo`
-- (See below for the actual view)
--
CREATE TABLE `view_piutang_jatuh_tempo` (
`amount` int
,`customer_name` varchar(191)
,`customer_phone` varchar(50)
,`debt_id` varchar(36)
,`due_date` datetime
,`status` enum('UNPAID','PAID')
,`status_tempo` varchar(11)
,`store_name` varchar(191)
,`umkm_id` varchar(36)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `view_produk_kritis`
-- (See below for the actual view)
--
CREATE TABLE `view_produk_kritis` (
`kekurangan_stok` bigint
,`min_stock` int
,`product_id` varchar(36)
,`product_name` varchar(255)
,`status_stok` varchar(23)
,`stock` int
,`store_name` varchar(191)
,`umkm_id` varchar(36)
,`unit` varchar(50)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `view_ringkasan_umkm`
-- (See below for the actual view)
--
CREATE TABLE `view_ringkasan_umkm` (
`owner_name` varchar(191)
,`store_name` varchar(191)
,`total_pemasukan` decimal(32,0)
,`total_pengeluaran` decimal(32,0)
,`total_piutang_aktif` decimal(32,0)
,`total_produk` bigint
,`umkm_id` varchar(36)
);

-- --------------------------------------------------------

--
-- Structure for view `view_piutang_jatuh_tempo`
--
DROP TABLE IF EXISTS `view_piutang_jatuh_tempo`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_piutang_jatuh_tempo`  AS SELECT `d`.`id` AS `debt_id`, `d`.`umkm_id` AS `umkm_id`, `u`.`store_name` AS `store_name`, `d`.`customer_name` AS `customer_name`, `d`.`customer_phone` AS `customer_phone`, `d`.`amount` AS `amount`, `d`.`due_date` AS `due_date`, `d`.`status` AS `status`, (case when ((`d`.`due_date` < now()) and (`d`.`status` = 'UNPAID')) then 'JATUH TEMPO' when (`d`.`status` = 'PAID') then 'LUNAS' else 'AKTIF' end) AS `status_tempo` FROM (`debts` `d` join `users` `u` on((`d`.`umkm_id` = `u`.`id`)))  ;

-- --------------------------------------------------------

--
-- Structure for view `view_produk_kritis`
--
DROP TABLE IF EXISTS `view_produk_kritis`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_produk_kritis`  AS SELECT `p`.`id` AS `product_id`, `p`.`umkm_id` AS `umkm_id`, `u`.`store_name` AS `store_name`, `p`.`name` AS `product_name`, `p`.`stock` AS `stock`, `p`.`min_stock` AS `min_stock`, `p`.`unit` AS `unit`, (`p`.`min_stock` - `p`.`stock`) AS `kekurangan_stok`, (case when (`p`.`stock` = 0) then 'HABIS (Segera Kulakan)' when (`p`.`stock` <= `p`.`min_stock`) then 'MENIPIS (Perlu Restock)' else 'AMAN' end) AS `status_stok` FROM (`products` `p` join `users` `u` on((`p`.`umkm_id` = `u`.`id`))) WHERE (`p`.`stock` <= `p`.`min_stock`)  ;

-- --------------------------------------------------------

--
-- Structure for view `view_ringkasan_umkm`
--
DROP TABLE IF EXISTS `view_ringkasan_umkm`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_ringkasan_umkm`  AS SELECT `u`.`id` AS `umkm_id`, `u`.`store_name` AS `store_name`, `u`.`owner_name` AS `owner_name`, count(distinct `p`.`id`) AS `total_produk`, coalesce(sum((case when (`t`.`type` = 'IN') then `t`.`total_amount` else 0 end)),0) AS `total_pemasukan`, coalesce(sum((case when (`t`.`type` = 'OUT') then `t`.`total_amount` else 0 end)),0) AS `total_pengeluaran`, coalesce((select sum(`d`.`amount`) from `debts` `d` where ((`d`.`umkm_id` = `u`.`id`) and (`d`.`status` = 'UNPAID'))),0) AS `total_piutang_aktif` FROM ((`users` `u` left join `products` `p` on((`u`.`id` = `p`.`umkm_id`))) left join `transactions` `t` on((`u`.`id` = `t`.`umkm_id`))) GROUP BY `u`.`id`, `u`.`store_name`, `u`.`owner_name`;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_customers_umkm` (`umkm_id`);

--
-- Indexes for table `debts`
--
ALTER TABLE `debts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_debts_umkm` (`umkm_id`),
  ADD KEY `idx_debts_status` (`status`),
  ADD KEY `fk_debts_trx` (`related_trx_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_products_umkm` (`umkm_id`),
  ADD KEY `idx_products_stock` (`stock`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_transactions_umkm` (`umkm_id`),
  ADD KEY `idx_transactions_date` (`transaction_date`),
  ADD KEY `idx_transactions_debt` (`debt_id`),
  ADD KEY `fk_transactions_customer` (`customer_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email_unique` (`email`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `customers`
--
ALTER TABLE `customers`
  ADD CONSTRAINT `fk_customers_umkm` FOREIGN KEY (`umkm_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `debts`
--
ALTER TABLE `debts`
  ADD CONSTRAINT `fk_debts_trx` FOREIGN KEY (`related_trx_id`) REFERENCES `transactions` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_debts_user` FOREIGN KEY (`umkm_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `fk_products_user` FOREIGN KEY (`umkm_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `fk_transactions_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_transactions_debt` FOREIGN KEY (`debt_id`) REFERENCES `debts` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_transactions_user` FOREIGN KEY (`umkm_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
