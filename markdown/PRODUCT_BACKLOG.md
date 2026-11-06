# Product Backlog & Sprint Planning (PPL)
**Aplikasi:** E-Commerce UMKM Terintegrasi API Pembayaran & Logistik Pengiriman  
**Product Owner:** Zaidan  
**Pendekatan:** Agile Scrum (4 Sprint: Pekan 9 – Pekan 15)  
**Aturan Kode Tugas:** Menggunakan prefix `PPL-xx` yang wajib konsisten di Board, Branch, Pesan Commit, dan Pull Request.

---

## 1. Definisi "Definition of Done" (DoD) Tim
Setiap User Story dinyatakan **DONE** apabila memenuhi seluruh kriteria berikut:
1. Kode branch dibuat dengan penamaan standar `feature/PPL-xx-[nama-fitur]`.
2. Commit pesan memuat ID tugas `[PPL-xx] [pesan perubahan]`.
3. Pull Request (PR) dibuat dengan judul `[PPL-xx] [nama-fitur]` dan telah di-review & disetujui minimal oleh 1 anggota lain sebelum di-merge ke branch `main`.
4. Kode tidak memiliki error syntax, lulus build, dan API key tidak bocor ke repositori (berada di `.env.local` / `.gitignore`).
5. Fitur telah diuji oleh QA/Tester (Tia) sesuai *Acceptance Criteria* dan tidak ditemukan *blocker bug*.
6. Tautan PR telah terhubung di kartu Agile Board (Integrasi I-2) dan notifikasi merge muncul di kanal Discord/Slack `#github-notif` (Integrasi I-1).

---

## 2. Ringkasan Pembagian Sprint (4 Sprint)

| Sprint | Pekan | Tema Utama Sprint | Target Output Utama |
|---|---|---|---|
| **Sprint 1** | Pekan 9 – 10 | *Core Catalog & Product Management* | Manajemen CRUD produk admin, etalase katalog pembeli, keranjang belanja (*cart*) |
| **Sprint 2** | Pekan 11 – 12 | *Shipping Calculation & Checkout Engine* | Integrasi API Pengiriman (RajaOngkir Sandbox), kalkulasi ongkir per kecamatan/kota, alur form checkout |
| **Sprint 3** | Pekan 13 | *Payment Gateway & Order Tracking* | Integrasi API Pembayaran (Midtrans Sandbox Snap/Core), webhook status pembayaran otomatis, manajemen status pesanan |
| **Sprint 4** | Pekan 14 – 15 | *Computational Component & Final Polish* | Fitur Komputasional (Moving Average estimasi stok / Rule-Based Alert), testing DoD menyeluruh, persiapan UAS |

---

## 3. Daftar Lengkap Product Backlog (User Story)

### SPRINT 1: Core Catalog & Product Management (Pekan 9 – 10)
Tujuan Sprint: Pembeli dapat melihat katalog dan memasukkan barang ke keranjang; Admin dapat mengelola produk toko.

#### [PPL-01] Manajemen Produk oleh Admin Toko (CRUD)
- **Role:** Backend Developer (Zaki) & UI/UX / Admin Frontend (Alin)
- **User Story:**
  > *Sebagai penjual/admin UMKM, saya ingin menambah, mengubah, melihat, dan menghapus data produk beserta foto, harga, deskripsi, dan jumlah stok, agar katalog dagangan saya selalu mutakhir.*
- **Kriteria Penerimaan (Acceptance Criteria):**
  - Admin dapat membuka form tambah produk baru (nama, kategori, harga, stok, berat dalam gram, foto).
  - Admin dapat memperbarui stok dan harga secara instan.
  - Produk yang dihapus/dinonaktifkan tidak akan tampil di katalog publik pembeli.
- **Prioritas:** Must Have (Paling Utama)

#### [PPL-02] Tampilan Katalog & Detail Produk Publik
- **Role:** Frontend Developer (Izzul) & UI/UX Designer (Alin)
- **User Story:**
  > *Sebagai calon pembeli, saya ingin melihat daftar produk toko UMKM dengan gambar jelas, harga, dan informasi sisa stok, agar saya dapat memilih barang yang ingin dibeli dengan mudah.*
- **Kriteria Penerimaan (Acceptance Criteria):**
  - Tampilan responsif mobile-friendly dengan grid kartu produk rapi.
  - Terdapat badge ketersediaan stok ("Tersedia" atau "Stok Habis").
  - Calon pembeli dapat mengklik produk untuk melihat rincian deskripsi dan berat produk.
- **Prioritas:** Must Have

#### [PPL-03] Keranjang Belanja Interaktif (Shopping Cart)
- **Role:** Frontend Developer (Izzul)
- **User Story:**
  > *Sebagai pembeli, saya ingin menambahkan beberapa produk ke dalam keranjang belanja, mengubah kuantitasnya, atau menghapusnya, agar saya dapat menghitung subtotal belanjaan sebelum checkout.*
- **Kriteria Penerimaan (Acceptance Criteria):**
  - Menekan tombol "+ Keranjang" menambah produk dengan validasi stok maksimum.
  - Pembeli dapat menambah (`+`) atau mengurangi (`-`) kuantitas langsung dari keranjang.
  - Subtotal harga belanja otomatis terhitung secara akurat tanpa perlu me-refresh halaman.
- **Prioritas:** Must Have

#### [PPL-04] Setup Webhook & 3 Integrasi Wajib Tim (I-1, I-2, I-3)
- **Role:** Scrum Master (Okan)
- **User Story:**
  > *Sebagai tim pengembang dan dosen penilai, saya ingin seluruh aktivitas board dan GitHub terhubung otomatis ke Discord/Slack, agar progres kolaborasi terekam transparan tanpa laporan manual.*
- **Kriteria Penerimaan (Acceptance Criteria):**
  - Notifikasi commit, push, PR baru, dan merge muncul di `#github-notif` (I-1).
  - Kartu di board tertaut dengan PR GitHub (I-2).
  - Perpindahan kartu ke kolom *Done* memicu notifikasi di `#board-notif` (I-3).
- **Prioritas:** Must Have

---

### SPRINT 2: Shipping Calculation & Checkout Engine (Pekan 11 – 12)
Tujuan Sprint: Pembeli dapat mengisi alamat tujuan dan melihat ongkos kirim real-time dari API logistik saat checkout.

#### [PPL-05] Formulir Data Pengiriman Checkout
- **Role:** Frontend Developer (Izzul) & UI/UX (Alin)
- **User Story:**
  > *Sebagai pembeli, saya ingin mengisi data penerima (nama, nomor WhatsApp/telepon, alamat lengkap, dan kota/kecamatan tujuan), agar pesanan saya dapat dikirim ke alamat yang benar.*
- **Kriteria Penerimaan (Acceptance Criteria):**
  - Form memiliki validasi input wajib (nama, telepon, alamat, provinsi, kota/kabupaten).
  - Input nomor WhatsApp tervalidasi agar dapat digunakan untuk notifikasi status pesanan.
  - Data tersimpan sementara pada sesi checkout sebelum memilih kurir.
- **Prioritas:** Must Have

#### [PPL-06] Integrasi API Pengiriman Real-Time (RajaOngkir/Biteship Sandbox)
- **Role:** Backend Developer (Zaki)
- **User Story:**
  > *Sebagai pembeli, saya ingin sistem menghitung total berat belanjaan dan menampilkan pilihan kurir (JNE, POS, TIKI) beserta tarif ongkos kirimnya secara otomatis, agar saya tahu biaya kirim yang pasti.*
- **Kriteria Penerimaan (Acceptance Criteria):**
  - Sistem menghitung total berat akumulatif seluruh barang di keranjang belanja.
  - API pengiriman sandbox dipanggil dengan parameter: kota asal UMKM, kota tujuan pembeli, dan total berat (gram).
  - Mengembalikan daftar opsi layanan kurir (misal: JNE REG, POS Kilat) beserta nominal tarif ongkir dan estimasi hari sampai.
- **Prioritas:** Must Have (Syarat Wajib Panduan 3.3)

#### [PPL-07] Kalkulasi Grand Total Checkout
- **Role:** Frontend Developer (Izzul) & Backend (Zaki)
- **User Story:**
  > *Sebagai pembeli, saya ingin melihat rincian ringkasan biaya (Subtotal Belanja + Ongkos Kirim terpilih - Potongan Diskon jika ada = Total Pembayaran), agar tidak ada biaya tersembunyi saat memesan.*
- **Kriteria Penerimaan (Acceptance Criteria):**
  - Memilih opsi kurir langsung memperbarui nilai ongkir dan grand total secara reaktif.
  - Tombol "Lanjut ke Pembayaran" hanya aktif jika opsi kurir sudah dipilih.
- **Prioritas:** Must Have

---

### SPRINT 3: Payment Gateway & Order Tracking (Pekan 13)
Tujuan Sprint: Transaksi pembayaran digital berhasil disimulasikan via Sandbox, dan pesanan memiliki status yang terlacak.

#### [PPL-08] Integrasi API Payment Gateway (Midtrans Snap / Xendit Sandbox)
- **Role:** Backend Developer (Zaki) & Frontend (Izzul)
- **User Story:**
  > *Sebagai pembeli, saya ingin membayar pesanan menggunakan metode pembayaran digital (QRIS, Virtual Account BCA/BNI/Mandiri, atau E-Wallet Sandbox), agar proses pembayaran praktis dan aman.*
- **Kriteria Penerimaan (Acceptance Criteria):**
  - Backend membuat Snap Token transaksi ke server Midtrans Sandbox dengan `order_id` unik dan total tagihan.
  - Frontend memunculkan popup pembayaran Midtrans Snap secara mulus.
  - Tersedia instruksi dan simulator pembayaran sandbox untuk uji coba transaksi.
- **Prioritas:** Must Have (Syarat Wajib Panduan 3.3)

#### [PPL-09] Webhook Notifikasi Pembayaran & Perubahan Status Pesanan
- **Role:** Backend Developer (Zaki)
- **User Story:**
  > *Sebagai sistem dan penjual, saya ingin sistem menerima notifikasi webhook dari payment gateway secara instan saat pembeli telah membayar, agar status pesanan otomatis berubah menjadi "Dibayar" (*settlement*).*
- **Kriteria Penerimaan (Acceptance Criteria):**
  - Endpoint Webhook `/api/payment/notification` menerima payload status transaksi dari payment gateway.
  - Verifikasi signature hash agar aman dan tidak dapat dimanipulasi pihak luar.
  - Jika pembayaran sukses (`settlement` / `capture`), status pesanan di database otomatis berubah dari `menunggu_pembayaran` menjadi `dibayar`.
  - Stok produk otomatis berkurang secara konsisten.
- **Prioritas:** Must Have

#### [PPL-10] Halaman Daftar Pesanan & Detail Status Pembeli
- **Role:** Frontend Developer (Izzul)
- **User Story:**
  > *Sebagai pembeli, saya ingin melihat daftar riwayat pesanan saya beserta statusnya (Menunggu Pembayaran, Dibayar, Dikemas, Dikirim, Selesai), agar saya bisa memantau perkembangan pesanan saya.*
- **Kriteria Penerimaan (Acceptance Criteria):**
  - Pembeli dapat melihat invoice ringkas pesanan berdasarkan ID pesanan atau nomor telepon.
  - Menampilkan rincian barang yang dibeli, nomor resi (jika sudah diinput penjual), dan rincian pembayaran.
- **Prioritas:** Must Have

#### [PPL-11] Manajemen Pemrosesan Pesanan oleh Penjual (Admin Order Dashboard)
- **Role:** Backend Developer (Zaki) & UI/UX Support (Alin)
- **User Story:**
  > *Sebagai admin UMKM, saya ingin melihat pesanan masuk yang sudah lunas, memperbarui status menjadi "Dikemas", menginput nomor resi pengiriman, dan menandai "Dikirim", agar operasional pengiriman teratur.*
- **Kriteria Penerimaan (Acceptance Criteria):**
  - Admin memiliki tabel daftar pesanan yang dapat difilter berdasarkan status.
  - Admin dapat memasukkan nomor resi ekspedisi pada pesanan yang sudah dibayar.
  - Status pesanan terupdate dan tercatat waktu perubahannya.
- **Prioritas:** Should Have

---

### SPRINT 4: Computational Component & Final Polish (Pekan 14 – 15)
Tujuan Sprint: Implementasi komponen komputasional penunjang keputusan UMKM, pengujian menyeluruh (DoD), serta finalisasi berkas laporan IEEE dan video branding.

#### [PPL-12] Implementasi Komponen Komputasional Sederhana (Rule-Based & Moving Average)
- **Role:** Backend Developer (Zaki) & Frontend (Izzul)
- **User Story:**
  > *Sebagai pemilik UMKM, saya ingin sistem memberikan rekomendasi komputasional otomatis berupa Peringatan Restock Cerdas (*Rule-Based*) dan Estimasi Kebutuhan Stok Mingguan (*Simple Moving Average 3 Periode*), agar saya terhindar dari stok habis atau penumpukan modal mati.*
- **Kriteria Penerimaan (Acceptance Criteria):**
  - **Aturan Rule-Based:** JIKA sisa stok produk $\le 5$ unit, MAKA tampilkan badge merah *"Peringatan: Stok Kritis - Segera Restock!"*.
  - **Moving Average 3 Periode:** Menghitung rata-rata penjualan produk selama 3 periode waktu terakhir:
    $$\text{Estimasi Kebutuhan} = \frac{P_1 + P_2 + P_3}{3}$$
  - Hasil perhitungan tampil jelas di dashboard admin sebagai rujukan pengadaan barang.
- **Prioritas:** Must Have (Syarat Wajib Panduan 3.4)

#### [PPL-13] Pengujian Akhir Komprehensif & Bug Bashing (QA)
- **Role:** QA / Tester (Tia) & Seluruh Developer
- **User Story:**
  > *Sebagai tim penjamin mutu, saya ingin melakukan pengujian menyeluruh (alur checkout lengkap, validasi form, kegagalan sandbox, hingga komputasi stok), agar aplikasi siap didemokan tanpa kendala saat penilaian dosen.*
- **Kriteria Penerimaan (Acceptance Criteria):**
  - Skenario pengujian ditulis rapi dan seluruh bug kritis ditutup.
  - Verifikasi bahwa seluruh API key aman di `.env.local` dan tidak ada kredensial bocor ke git history.
  - Pengujian responsivitas UI di layar ponsel dan desktop.
- **Prioritas:** Must Have

#### [PPL-14] Penyusunan Laporan Requirement Standar IEEE (Bab 1–6 + Appendix D & E)
- **Role:** Product Owner (Zaidan) didukung seluruh anggota
- **User Story:**
  > *Sebagai Product Owner dan representasi tim, saya ingin menyusun dokumen Software Requirements Specification (SRS) standar IEEE yang lengkap dan valid, agar seluruh spesifikasi teknis dan bukti kolaborasi siap dinilai dosen.*
- **Kriteria Penerimaan (Acceptance Criteria):**
  - Struktur mengikuti format IEEE 830: Bab 1 s.d. Bab 6.
  - Appendix D memuat: Peran tim, screenshot backlog, rekap rencana vs realisasi 4 sprint, bukti integrasi I-1 s.d. I-3, dan ringkasan kontribusi anggota.
  - Appendix E memuat tabel tautan aktif: repositori GitHub, board Agile, workspace Discord/Slack, catatan sprint, web aplikasi, dan link video YouTube.
- **Prioritas:** Must Have (Bobot Penilaian 20%)

#### [PPL-15] Produksi Video Iklan & Branding Aplikasi (YouTube 16:9)
- **Role:** Dokumentasi & Branding (Tia) didukung Product Owner (Zaidan)
- **User Story:**
  > *Sebagai representasi branding UMKM, saya ingin membuat video iklan dan pengenalan aplikasi berdurasi 1–2 menit, agar solusi yang kami buat dapat dipahami publik dan memenuhi luaran wajib mata kuliah.*
- **Kriteria Penerimaan (Acceptance Criteria):**
  - Format landscape (16:9), durasi 1–2 menit, resolusi minimal 720p/1080p.
  - Memuat: Logo aplikasi, problem statement UMKM, cuplikan fitur utama (katalog, cek ongkir, bayar sandbox, fitur komputasi), ajakan menggunakan aplikasi, serta outro identitas tim dan dosen.
  - Menggunakan backsound bebas hak cipta dan diunggah ke YouTube (status Public/Unlisted).
- **Prioritas:** Must Have (Bobot Penilaian 10%)

#### [PPL-16] Simulasi & Persiapan Demonstrasi Siklus Integrasi UAS
- **Role:** Scrum Master (Okan) bersama Product Owner (Zaidan)
- **User Story:**
  > *Sebagai tim presenter UAS, kami ingin melakukan gladi bersih simulasi demonstrasi langsung siklus kerja integrasi (Board ↔ GitHub ↔ Discord) selama 5 menit di depan dosen, agar saat presentasi berjalan lancar.*
- **Kriteria Penerimaan (Acceptance Criteria):**
  - Tiga jendela siap: Agile Board, repositori GitHub, dan kanal Discord/Slack.
  - Mendemokan alur: Kartu dibuat → Branch dibuat → Commit pesan dengan kode tiket → PR dibuat → Review & Merge → Notifikasi muncul otomatis → Kartu berpindah ke Done.
- **Prioritas:** Must Have (Bobot Penilaian 15% + 5% Presentasi)

---

## 4. Panduan Eksekusi untuk Zaidan (Product Owner)
Sebagai PO, langkah operasional Anda berikutnya adalah:
1. **Memasukkan Kartu Tugas:** Salin kode tiket `PPL-01` s.d. `PPL-16` ke board Agile tim Anda (Jira/Trello/GitHub Projects) di kolom **Product Backlog**.
2. **Memimpin Sprint Planning bersama Okan:** Saat memulai tiap sprint, tentukan kartu yang masuk ke *To Do (Sprint)* bersama Scrum Master.
3. **Mengawal Dokumen IEEE:** Gunakan draf SRS IEEE yang telah disiapkan di file [markdown/SRS_IEEE_REQUIREMENTS.md](file:///c:/laragon/www/ExplorAItion_hackathon/markdown/SRS_IEEE_REQUIREMENTS.md).
