# Software Requirements Specification (SRS) Standar IEEE
## E-Commerce UMKM Terintegrasi API Pembayaran Digital & Ekspedisi Pengiriman

**Mata Kuliah:** Proyek Perangkat Lunak (PPL) — Semester Ganjil 2026/2027  
**Dosen Pengampu:** Dra. Fifin Ayu Mufarroha, S.Kom., M.Kom.  
**Penyusun (Product Owner / System Analyst):** Zaidan  
**Nama Tim / Kelompok:** Tim PPL - E-Commerce UMKM  
**Anggota Tim:**
1. Zaidan (Product Owner & System Analyst)
2. Okan (Scrum Master & DevOps Integrator)
3. Zaki (Backend Developer & API Specialist)
4. Izzul (Frontend Developer)
5. Alin (UI/UX Designer & Frontend Support)
6. Tia (QA / Tester & Dokumentasi - Branding)

---

## Riwayat Revisi Dokumen (Revision History)

| Versi | Tanggal | Deskripsi Perubahan | Penulis / Penanggung Jawab |
|---|---|---|---|
| **1.0** | Pekan 9 (Awal Proyek) | Draf inisialisasi spesifikasi kebutuhan IEEE, user classes, external interfaces, fitur sistem dasar (REQ-1 s.d REQ-12), dan perencanaan lampiran manajemen proyek | Zaidan (Product Owner) |

---

## 1. Pendahuluan (Introduction)

### 1.1 Tujuan (Purpose)
Dokumen Spesifikasi Kebutuhan Perangkat Lunak (*Software Requirements Specification* - SRS) ini bertujuan untuk mendefinisikan secara lengkap dan terstruktur seluruh kebutuhan fungsional dan non-fungsional dari sistem aplikasi e-commerce untuk mitra UMKM. Dokumen ini menjadi pedoman utama bagi tim pengembang (Scrum Team), narasumber mitra UMKM, serta dosen pengampu dalam memvalidasi capaian luaran mata kuliah Proyek Perangkat Lunak (PPL).

### 1.2 Konvensi Dokumen (Document Conventions)
- Setiap kebutuhan fungsional diidentifikasi secara unik menggunakan format `REQ-xx` yang berkorespondensi langsung dengan kode tiket user story pada board Agile (`PPL-xx`).
- Tingkat prioritas kebutuhan diklasifikasikan menggunakan standar MoSCoW:
  - **High / Must Have:** Fitur inti wajib (syarat kelulusan spesifikasi proyek).
  - **Medium / Should Have:** Fitur penunjang penting.
  - **Low / Could Have:** Fitur nilai tambah (*nice-to-have*).

### 1.3 Pembaca yang Dituju (Intended Audience)
Dokumen ini ditujukan kepada:
1. **Dosen Pengampu & Penguji:** Sebagai dasar penilaian evaluasi requirement standar IEEE dan pengujian kesesuaian luaran proyek.
2. **Tim Pengembang (Developers & UI/UX):** Sebagai acuan arsitektur sistem, desain antarmuka, pembuatan API, dan integrasi pihak ketiga.
3. **QA / Tester:** Sebagai acuan perancangan skenario pengujian (*test cases*) dan validasi *Definition of Done (DoD)*.
4. **Mitra UMKM:** Sebagai representasi pemahaman kebutuhan bisnis yang ditranslasikan ke dalam sistem perangkat lunak.

### 1.4 Ruang Lingkup Produk (Product Scope)
Aplikasi yang dibangun adalah platform e-commerce berbasis web yang dirancang khusus untuk memfasilitasi penjualan produk fisik UMKM ke konsumen secara daring. Ruang lingkup aplikasi mencakup:
- Pengelolaan katalog produk, stok, dan harga oleh pemilik/admin UMKM.
- Etalase belanja digital, keranjang belanja interaktif, dan kalkulasi otomatis grand total belanja bagi konsumen.
- Integrasi **API Pengiriman Sandbox** (RajaOngkir/Biteship) untuk kalkulasi tarif ongkir real-time berdasarkan total berat barang dan kota tujuan.
- Integrasi **API Pembayaran Sandbox** (Midtrans Snap / Xendit) untuk pembayaran digital aman (QRIS, VA Bank) dengan verifikasi otomatis via webhook.
- Modul pemrosesan pesanan dan status transaksi (*pending*, *dibayar*, *dikirim*, *selesai*).
- Komponen komputasional sederhana berbasis aturan (*Rule-Based Alert*) dan rata-rata bergerak (*Simple Moving Average*) guna membantu keputusan restock barang pemilik toko.

### 1.5 Referensi (References)
1. IEEE Std 830-1998, *IEEE Recommended Practice for Software Requirements Specifications*.
2. Dokumen Panduan Spesifikasi Tugas Proyek PPL Semester Ganjil 2026/2027 (Fifin Ayu Mufarroha).
3. Dokumentasi Resmi Midtrans Payment Gateway API Sandbox (`https://docs.midtrans.com`).
4. Dokumentasi Resmi RajaOngkir Shipping Cost API (`https://rajaongkir.com/dokumentasi`).

---

## 2. Deskripsi Umum (Overall Description)

### 2.1 Perspektif Produk (Product Perspective)
Aplikasi ini beroperasi sebagai sistem e-commerce mandiri (*standalone web application*) yang terhubung dengan layanan pihak ketiga melalui RESTful API. Sistem menghubungkan dua sisi antarmuka: sisi publik pembeli untuk berbelanja dan sisi internal dashboard admin untuk pemilik UMKM mengelola stok serta pesanan.

### 2.2 Fungsi Produk (Product Functions)
1. **Katalog & Etalase Digital:** Menampilkan produk aktif, foto, deskripsi, harga, dan ketersediaan stok secara responsif.
2. **Pengelolaan Keranjang Belanja:** Menyimpan pilihan barang, mengkalkulasi subtotal belanja, serta validasi kuantitas terhadap stok aktual.
3. **Kalkulasi Ongkos Kirim Otomatis:** Menghubungkan titik asal toko UMKM dengan kota/kecamatan pembeli menggunakan API logistik eksternal.
4. **Penyelesaian Transaksi (Checkout) & Pembayaran Digital:** Mengirim tagihan ke payment gateway sandbox dan menerima update status pembayaran secara *real-time* tanpa konfirmasi manual bukti transfer.
5. **Pelacakan Status Pesanan:** Memberikan informasi status pemrosesan pesanan kepada pembeli dan memfasilitasi input resi oleh penjual.
6. **Sistem Rekomendasi Restock & Komputasi Stok:** Memonitor batas aman stok produk dan menghitung tren rata-rata penjualan mingguan.

### 2.3 Golongan Pengguna dan Karakteristiknya (User Classes)
1. **Pembeli (Customer / Publik):**
   - Karakteristik: Masyarakat umum atau pelanggan UMKM yang berbelanja dari perangkat mobile/desktop. Membutuhkan alur belanja yang cepat, intuitif, transparan dalam ongkir, dan mudah dalam pembayaran.
2. **Penjual / Admin (Pemilik UMKM & Karyawan):**
   - Karakteristik: Pengelola toko fisik yang mengoperasikan aplikasi untuk memutakhirkan stok barang, memantau pembayaran masuk, memproses pengiriman, dan melihat peringatan stok menipis.

### 2.4 Lingkungan Operasi (Operating Environment)
- **Sisi Klien (Frontend):** Web browser modern (Google Chrome, Mozilla Firefox, Safari, Microsoft Edge) dengan dukungan tampilan responsif (Mobile, Tablet, Desktop).
- **Sisi Server (Backend):** Node.js / Next.js Runtime Environment, RESTful API engine, terintegrasi dengan database cloud.
- **Koneksi Jaringan:** Membutuhkan akses internet stabil untuk berkomunikasi dengan sandbox API payment gateway dan kurir pengiriman.

### 2.5 Batasan Desain dan Implementasi (Constraints)
1. Seluruh transaksi pembayaran dan kurir beroperasi dalam **mode sandbox/testing** (tidak menggunakan uang riil atau kurir fisik nyata).
2. Kode rahasia (API Server Key & Client Key) dilarang keras di-commit ke repositori git publik dan wajib disimpan dalam variabel lingkungan (`.env.local`).
3. Waktu siklus pengembangan dibatasi dalam 7 pekan (Pekan 9 s.d. Pekan 15) dengan 4 siklus sprint Agile.

### 2.6 Asumsi dan Ketergantungan (Assumptions & Dependencies)
1. Server API penyedia layanan (Midtrans Sandbox dan RajaOngkir) diasumsikan berada dalam kondisi *online* dan merespons permintaan payload dengan normal.
2. Data berat barang diinput dalam satuan gram oleh admin sebagai dasar penentuan ongkos kirim.

---

## 3. Kebutuhan Antarmuka Eksternal (External Interface Requirements)

### 3.1 Antarmuka Pengguna (User Interfaces)
- **Halaman Katalog Beranda:** Grid produk modern, bar pencarian, badge filter kategori, tombol tambah ke keranjang cepat, dan indikator jumlah item keranjang melayang.
- **Drawer / Halaman Keranjang:** Rincian item yang dibeli, pengubah kuantitas (`+` / `-`), subtotal dinamis, dan tombol checkout.
- **Halaman Checkout:** Formulir data pengiriman penerima, dropdown kota/kabupaten tujuan, daftar pilihan kurir beserta nominal ongkir, ringkasan grand total, dan tombol bayar.
- **Dashboard Admin Toko:** Tabel manajemen katalog produk (tambah, edit, hapus, update stok), daftar mutasi pesanan dengan status pembayaran, serta kartu peringatan restock komputasional.

### 3.2 Antarmuka Perangkat Lunak (Software Interfaces / APIs)
1. **Payment Gateway API (Midtrans Sandbox):**
   - *Protokol:* HTTPS REST API dengan format pertukaran data JSON.
   - *Autentikasi:* Basic Auth menggunakan Base64 Server Key.
   - *Endpoint Utama:* `POST /v2/charge` atau `POST /snap/v1/transactions` untuk pembuatan transaksi; dan Endpoint Webhook Handler untuk menerima HTTP POST notification status pembayaran (`settlement`, `pending`, `expire`).
2. **Logistics & Shipping Cost API (RajaOngkir / Biteship Sandbox):**
   - *Protokol:* HTTPS REST API.
   - *Autentikasi:* Header `key: [API_KEY]`.
   - *Endpoint Utama:* `POST /cost` dengan payload: `origin`, `destination`, `weight`, dan `courier` (jne, pos, tiki).

### 3.3 Antarmuka Komunikasi (Communications Interfaces)
- Seluruh komunikasi data antara frontend dan backend menggunakan enkripsi protokol HTTPS standar.
- Notifikasi pembaruan status sistem dan kolaborasi tim dikirimkan via integrasi Webhook ke kanal Discord/Slack (`#github-notif` dan `#board-notif`).

---

## 4. Fitur Sistem (System Features)

Setiap fitur fungsional dirinci beserta alur stimulus/respons dan relasinya terhadap tiket user story di Product Backlog.

### 4.1 Fitur Pengelolaan Produk oleh Penjual
- **Deskripsi:** Admin toko dapat mengelola katalog dagangan secara penuh.
- **Prioritas:** High (Must Have) — Terkait Tiket: `PPL-01`.
- **Alur Stimulus/Respons:**
  1. *Stimulus:* Admin mengisi form produk baru (nama, kategori, harga, stok, berat, deskripsi) dan mengklik "Simpan".
  2. *Respons:* Sistem memvalidasi kelengkapan data, menyimpan ke database, dan menampilkan notifikasi sukses.
- **Kebutuhan Fungsional:**
  - `REQ-01`: Sistem harus menyediakan antarmuka CRUD (Create, Read, Update, Delete) produk bagi admin toko.
  - `REQ-02`: Sistem wajib menyimpan atribut berat produk (dalam gram) guna keperluan perhitungan ongkos kirim.
  - `REQ-03`: Sistem harus mencegah nilai stok bernilai negatif.

### 4.2 Fitur Katalog Publik & Keranjang Belanja
- **Deskripsi:** Calon pembeli dapat melihat produk dan mengumpulkan barang belanjaan.
- **Prioritas:** High (Must Have) — Terkait Tiket: `PPL-02` & `PPL-03`.
- **Alur Stimulus/Respons:**
  1. *Stimulus:* Pembeli memilih barang dan menekan tombol "+ Keranjang".
  2. *Respons:* Keranjang belanja bertambah, ikon badge terupdate, dan subtotal dikalkulasi ulang secara reaktif.
- **Kebutuhan Fungsional:**
  - `REQ-04`: Sistem harus menampilkan etalase produk yang responsif beserta indikator sisa stok.
  - `REQ-05`: Sistem harus menyediakan keranjang belanja dinamis yang membatasi kuantitas belanja tidak melebihi stok yang tersedia.

### 4.3 Fitur Perhitungan Ongkos Kirim Real-Time
- **Deskripsi:** Menghitung biaya pengiriman saat proses checkout menggunakan API ekspedisi.
- **Prioritas:** High (Must Have) — Terkait Tiket: `PPL-05`, `PPL-06`, `PPL-07`.
- **Alur Stimulus/Respons:**
  1. *Stimulus:* Pembeli memilih kota/kabupaten tujuan dan memilih jenis kurir pada halaman checkout.
  2. *Respons:* Sistem memanggil API pengiriman eksternal dan menampilkan daftar paket layanan beserta nominal ongkos kirim serta mengupdate Grand Total.
- **Kebutuhan Fungsional:**
  - `REQ-06`: Sistem harus menghitung total berat akumulatif seluruh barang di dalam keranjang belanja.
  - `REQ-07`: Sistem harus mengintegrasikan API Pengiriman Sandbox untuk menampilkan opsi tarif logistik secara otomatis berdasarkan tujuan pengiriman.

### 4.4 Fitur Pembayaran Digital & Notifikasi Webhook
- **Deskripsi:** Pembayaran transaksi pesanan secara daring menggunakan payment gateway sandbox.
- **Prioritas:** High (Must Have) — Terkait Tiket: `PPL-08`, `PPL-09`.
- **Alur Stimulus/Respons:**
  1. *Stimulus:* Pembeli mengklik tombol "Bayar Sekarang".
  2. *Respons:* Sistem memicu munculnya antarmuka Snap Payment (QRIS / Virtual Account sandbox).
  3. *Stimulus Lanjutan:* Pembeli menyelesaikan simulasi pembayaran pada simulator payment gateway.
  4. *Respons Lanjutan:* Server payment gateway mengirimkan HTTP POST notifikasi ke Webhook server aplikasi; status pesanan langsung berubah otomatis menjadi "Dibayar" (*settlement*).
- **Kebutuhan Fungsional:**
  - `REQ-08`: Sistem wajib mengintegrasikan API Pembayaran Sandbox dan memunculkan token transaksi pembayaran yang valid.
  - `REQ-09`: Sistem harus menyediakan endpoint Webhook untuk menerima dan memverifikasi notifikasi status transaksi dari payment gateway.
  - `REQ-10`: Sistem harus secara otomatis memperbarui status transaksi menjadi "Dibayar" dan memotong stok produk saat pembayaran dinyatakan sukses.

### 4.5 Fitur Pelacakan Riwayat Pesanan
- **Deskripsi:** Halaman status pesanan bagi pembeli dan penjual.
- **Prioritas:** High (Must Have) — Terkait Tiket: `PPL-10`, `PPL-11`.
- **Kebutuhan Fungsional:**
  - `REQ-11`: Sistem harus menampilkan daftar pesanan beserta status terkininya (*Menunggu Pembayaran*, *Dibayar*, *Dikirim*, *Selesai*).
  - `REQ-12`: Admin toko dapat memasukkan nomor resi ekspedisi dan mengubah status pesanan menjadi "Dikirim".

### 4.6 Fitur Komponen Komputasional Sederhana
- **Deskripsi:** Perhitungan berbasis algoritma sederhana untuk mendukung keputusan operasional pemilik UMKM.
- **Prioritas:** High (Must Have - Panduan 3.4) — Terkait Tiket: `PPL-12`.
- **Kebutuhan Fungsional:**
  - `REQ-13 (Rule-Based Alert System):` JIKA sisa stok produk tertentu $\le 5$ unit, MAKA sistem wajib menampilkan notifikasi status *"Stok Kritis / Perlu Restock Segera"* pada dashboard admin.
  - `REQ-14 (Simple Moving Average Kebutuhan Stok):` Sistem menghitung perkiraan kebutuhan stok minggu berikutnya menggunakan rumus rata-rata penjualan 3 periode waktu terakhir:
    $$\text{SMA}_3 = \frac{S_{t-1} + S_{t-2} + S_{t-3}}{3}$$
    Hasil estimasi ditampilkan di dashboard admin sebagai dasar pengambilan keputusan kulakan/pengadaan produk.

---

## 5. Kebutuhan Non-Fungsional (Other Nonfunctional Requirements)

### 5.1 Kebutuhan Performa (Performance Requirements)
- Waktu muat halaman katalog tidak boleh melebihi 2.5 detik pada koneksi internet broadband standar.
- Pemanggilan API pihak ketiga (ongkir dan payment token) dirancang dengan batas toleransi waktu henti (*timeout*) maksimal 5 detik.

### 5.2 Kebutuhan Keamanan (Security Requirements)
- Seluruh kunci rahasia (API Secret Key / Server Key Midtrans dan RajaOngkir) wajib tersimpan di file variabel lingkungan (`.env.local`) yang tercantum dalam `.gitignore` dan tidak boleh di-hardcode di kode sumber publik.
- Endpoint webhook wajib melakukan verifikasi *signature key* dari payment gateway untuk mencegah *fraud* pemalsuan status pembayaran.

### 5.3 Atribut Kualitas Perangkat Lunak (Software Quality Attributes)
- **Usability:** Antarmuka responsif ramah perangkat bergerak (*mobile-friendly*), teks jelas, dan navigasi belanja dapat diselesaikan dalam kurang dari 4 langkah.
- **Reliability:** Data pesanan dan mutasi stok tersimpan secara konsisten (menggunakan transaksi atomik database).
- **Maintainability:** Struktur kode tersusun modular dengan pemisahan komponen UI, API handler, dan modul layanan pihak ketiga.

### 5.4 Aturan Bisnis (Business Rules)
- Pesanan yang tidak diselesaikan pembayarannya dalam batas waktu simulator (misal 24 jam) akan otomatis dinyatakan kedaluwarsa (*expired*).
- Ongkos kirim dihitung berdasarkan berat pembulatan ke atas per 1.000 gram sesuai ketentuan standar kurir logistik.

---

## 6. Lampiran (Appendices)

### Appendix A: Glosarium Istilah (Glossary)
- **Scrum:** Kerangka kerja manajemen proyek tangkas (Agile) berbasis sprint dan seremoni rutin.
- **Sandbox Mode:** Lingkungan pengujian terisolasi yang meniru fungsi sistem produksi pihak ketiga tanpa melibatkan uang nyata atau armada fisik.
- **DoD (Definition of Done):** Kesepakatan kriteria kualitas yang harus dipenuhi sebelum sebuah tugas dianggap selesai.
- **Webhook:** Mekanisme komunikasi otomatis antar-server berbasis HTTP callback event.

---

### Appendix D: Dokumentasi Manajemen Proyek Agile (Template Bukti Evaluasi UAS)

1. **Struktur Pembagian Peran Kelompok:**
   - Product Owner & System Analyst: Zaidan
   - Scrum Master & Integrasi Tools: Okan
   - Backend Developer: Zaki
   - Frontend Developer: Izzul
   - UI/UX Designer: Alin
   - QA / Tester & Branding: Tia

2. **Rekap Rencana vs Realisasi per Sprint (Sesuai Tabel 7 Panduan Dosen):**

| Sprint | Pekan | Tujuan Sprint | User Story Direncanakan | User Story Selesai (Done) | Tindakan Perbaikan dari Retrospektif |
|---|---|---|---|---|---|
| **Sprint 1** | Pekan 9–10 | Fondasi etalase produk, CRUD admin toko, dan keranjang belanja | PPL-01, PPL-02, PPL-03, PPL-04 | *(Terisi saat sprint berjalan)* | PR wajib di-review maksimal 1x24 jam sebelum merge |
| **Sprint 2** | Pekan 11–12 | Form checkout & kalkulasi ongkos kirim API RajaOngkir Sandbox | PPL-05, PPL-06, PPL-07 | *(Terisi saat sprint berjalan)* | Validasi format nomor WhatsApp dan pemilihan kurir default |
| **Sprint 3** | Pekan 13 | Integrasi Midtrans Snap Sandbox, webhook, dan pelacakan pesanan | PPL-08, PPL-09, PPL-10, PPL-11 | *(Terisi saat sprint berjalan)* | Simulasi test case webhook gagal & handling timeout |
| **Sprint 4** | Pekan 14–15 | Komponen komputasional, QA komprehensif, video branding, dan laporan | PPL-12, PPL-13, PPL-14, PPL-15, PPL-16 | *(Terisi saat sprint berjalan)* | Gladi bersih demo integrasi 3 jendela untuk presentasi UAS |

3. **Status Bukti Tiga Integrasi Wajib:**
   - **I-1 (GitHub → Discord/Slack):** Notifikasi otomatis commit, push, PR, dan merge di kanal `#github-notif`.
   - **I-2 (Board ↔ GitHub):** Penautan otomatis issue ticket `PPL-xx` di kartu dengan branch dan Pull Request.
   - **I-3 (Board → Discord/Slack):** Notifikasi otomatis pergeseran kartu ke kolom *Done* di kanal `#board-notif`.

---

### Appendix E: Daftar Tautan Artefak Proyek (Tabel 12 Panduan Dosen)

*Seluruh tautan berikut wajib dapat diakses publik atau telah mengundang email dosen:*

| No | Artefak Proyek | Keterangan Artefak | Tautan (URL) |
|---|---|---|---|
| 1 | **Repositori Kode** | GitHub Repository berisi README, source code, dan riwayat commit/PR teratur | `https://github.com/RifqiRafii/ExplorAItion_hackathon` |
| 2 | **Board Agile** | GitHub Projects / Jira / Trello (Dosen sebagai Observer / Member) | `[Diisi Tautan Board Tim]` |
| 3 | **Workspace Komunikasi** | Discord / Slack Server (Kanal `#diskusi`, `#github-notif`, `#board-notif`) | `[Diisi Tautan Undangan Discord/Slack]` |
| 4 | **Catatan Sprint** | Catatan Sprint Planning, Stand-up, Review, dan Retrospektif tiap sprint | `[Diisi Tautan Google Drive / Wiki GitHub]` |
| 5 | **Aplikasi Web** | URL Deployment Web Aplikasi atau Video Demo Interaktif | `[Diisi Tautan Web Deploy / Demo]` |
| 6 | **Video Iklan / Branding** | Video Iklan 1–2 menit format landscape 16:9 di YouTube (Public/Unlisted) | `[Diisi Tautan YouTube Video]` |
