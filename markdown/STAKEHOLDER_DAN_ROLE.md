# Analisis Stakeholder & Pembagian Peran Tim (Scrum)
**Mata Kuliah:** Proyek Perangkat Lunak (PPL)  
**Dosen Pengampu:** Dra. Fifin Ayu Mufarroha, S.Kom., M.Kom.  
**Tema Proyek:** E-Commerce untuk UMKM dengan Integrasi API Pembayaran dan Pengiriman  
**Metodologi:** Agile (Scrum Sederhana) — 4 Sprint  

---

## 1. Identifikasi Stakeholder Proyek

Berdasarkan Panduan Spesifikasi Tugas Proyek PPL, stakeholder yang terlibat terbagi menjadi dua kategori:

### A. Stakeholder Eksternal
1. **Dosen Pengampu / Evaluator (Ibu Fifin AM & Tim Dosen PPL)**
   - **Peran:** Klien akademis, penguji, dan evaluator utama proyek.
   - **Kepentingan & Wewenang:**
     - Menilai keteraturan pelaksanaan seremoni Scrum (Sprint Planning, Stand-up mingguan, Review, Retrospektif).
     - Mengevaluasi keberfungsian 3 integrasi wajib (I-1, I-2, I-3) pada Monev UTS dan UAS.
     - Menilai kelayakan Laporan Kebutuhan Standar IEEE (termasuk Appendix D & E) serta Video Iklan/Branding produk.
     - Memantau keaktifan repositori GitHub dan Board Agile (diundang sebagai observer/member).

2. **Mitra UMKM (Pemilik Usaha Nyata)**
   - **Peran:** Klien industri / domain expert di lapangan.
   - **Kepentingan & Wewenang:**
     - Narasumber analisis proses bisnis dan kebutuhan produk riil (katalog barang, harga, stok, piutang/penjualan).
     - Pihak yang memvalidasi apakah solusi e-commerce dan fitur komputasional yang dibangun benar-benar membantu operasional bisnisnya.
     - Partisipan dalam evaluasi hasil pada sesi Sprint Review/Demo produk.

3. **Pelanggan / Pembeli Akhir (Customer / End-User)**
   - **Peran:** Pengguna akhir dari sisi publik/katalog.
   - **Kepentingan:** Kemudahan melihat katalog produk, kemudahan menambah produk ke keranjang belanja, transparansi perhitungan ongkir otomatis, dan kemudahan pembayaran digital via payment gateway.

4. **Penyedia Layanan Eksternal (Third-Party API Providers)**
   - **Payment Gateway (Midtrans / Xendit / Duitku - Sandbox Mode):** Penyedia infrastruktur pembayaran digital.
   - **Logistic / Shipping API (RajaOngkir / Komerce / Biteship - Sandbox Mode):** Penyedia layanan perhitungan ongkos kirim real-time.

---

### B. Stakeholder Internal (Scrum Team)
Tim pengembang mahasiswa yang bertanggung jawab merencanakan, mendesain, mengimplementasikan, menguji, dan mendokumentasikan aplikasi selama pekan 9 hingga pekan 15.

---

## 2. Struktur Tim & Pembagian Peran (6 Anggota)

Ketentuan Panduan:
- **Product Owner (PO)** dan **Scrum Master (SM)** wajib ada dan **tidak boleh dirangkap oleh orang yang sama**.
- Setiap anggota wajib memiliki minimal satu peran spesifik, memiliki penugasan kartu di Board Agile, serta memiliki kontribusi nyata di GitHub (commit, PR, code review, atau markdown documentation).

| No | Nama Anggota | Peran Utama | Peran Sekunder / Tambahan | Fokus Tanggung Jawab Utama |
|---|---|---|---|---|
| 1 | **Zaidan** | **Product Owner (PO)** | **System Analyst** | Penghubung mitra UMKM, Product Backlog, Laporan Requirement IEEE, Validasi DoD & Sprint Review |
| 2 | **Okan** | **Scrum Master (SM)** | **DevOps & Integrator Tools** | Fasilitator seremoni Scrum, pemantauan board, setup & pemeliharaan 3 Integrasi Otomatis (I-1, I-2, I-3), Rekap Rencana vs Realisasi |
| 3 | **Zaki** | **Backend Developer** | **API & Algorithm Specialist** | Database schema, REST API/server actions, integrasi sandbox Midtrans & RajaOngkir, implementasi Komponen Komputasional |
| 4 | **Izzul** | **Frontend Developer** | **Client-Side Integrator** | Halaman katalog, keranjang belanja, alur checkout, konsumsi API backend, integrasi UI pembayaran |
| 5 | **Alin** | **UI/UX Designer** | **Frontend Support (Admin/Dashboard)** | User flow, wireframe, High-Fidelity Prototype (Figma), Design System, slicing UI katalog & dashboard admin penjual |
| 6 | **Tia** | **QA / Tester** | **Dokumentasi & Video Branding** | Penyusunan skenario tes (DoD), pencatatan bug di board, dokumentasi catatan sprint (Appendix D & E), produksi Video Iklan/Branding YouTube |

---

## 3. Rincian Tanggung Jawab dan Kontribusi per Anggota

### 1. Zaidan — Product Owner & System Analyst
- **Tanggung Jawab:**
  - Menjadi narahubung utama dengan UMKM mitra untuk menggali proses bisnis dan kebutuhan riil.
  - Menyusun dan mengelola **Product Backlog** dalam bentuk User Story berformat standar (`PPL-xx`: *Sebagai [peran], saya ingin [kebutuhan], agar [manfaat]*).
  - Menetapkan prioritas backlog dan menyusun **Laporan Requirement Standar IEEE** (Bab 1–6).
  - Menetapkan kriteria penerimaan (*Acceptance Criteria*) dan memvalidasi penyelesaian fitur bersama tim.
  - Memimpin sesi Sprint Review / Demo di akhir tiap sprint.
- **Bukti Jejak Digital di GitHub / Board:**
  - Pembuatan dan pengelolaan kartu issue/user story di Agile Board.
  - Commit dan Pull Request untuk file dokumentasi IEEE SRS di folder repositori.
  - Approval dan review fungsionalitas PR fitur.

---

### 2. Okan — Scrum Master & DevOps Integrator
- **Tanggung Jawab:**
  - Memfasilitasi 4 seremoni Scrum di setiap sprint: **Sprint Planning**, **Stand-up mingguan** di kanal komunikasi, **Sprint Review**, dan **Sprint Retrospektif**.
  - Mengonfigurasi dan memastikan keberfungsian **3 Integrasi Wajib**:
    - **I-1:** GitHub → Discord/Slack (`#github-notif`)
    - **I-2:** Board ↔ GitHub (penautan kartu tugas `PPL-xx` dengan branch/commit/PR)
    - **I-3:** Board → Discord/Slack (`#board-notif` saat kartu bergeser)
  - Memastikan seluruh anggota memindahkan status kartu secara disiplin (*To Do -> In Progress -> Review -> Done*).
  - Menyusun rekap rencana vs realisasi sprint dan mendokumentasikan hambatan tim.
- **Bukti Jejak Digital di GitHub / Board:**
  - Pengaturan Webhook GitHub, integrasi bot Discord/Slack, dan Agile Board.
  - Commit catatan sprint (Sprint Notes) dan rangkuman retrospektif di repositori/Wiki.
  - Demonstrasi siklus kerja integrasi pada sesi Monev UTS dan presentasi UAS.

---

### 3. Zaki — Backend Developer & System Integrator
- **Tanggung Jawab:**
  - Merancang arsitektur database (tabel produk, varian, stok, keranjang, transaksi pesanan, status bayar/resi).
  - Membangun endpoint API / logika server untuk pengelolaan produk (CRUD admin), keranjang, dan transaksi.
  - Mengintegrasikan API pihak ketiga mode sandbox:
    - **Payment Gateway:** Midtrans / Xendit Sandbox (notifikasi webhook pembayaran lunas).
    - **Logistik:** RajaOngkir / Biteship Sandbox (perhitungan ongkos kirim saat checkout).
  - Mengimplementasikan minimal satu **Komponen Komputasional Sederhana** (misal: *Moving Average* untuk prediksi stok, atau *Rule-Based System* untuk peringatan restock dan diskon otomatis).
- **Bukti Jejak Digital di GitHub / Board:**
  - Branch kode `feature/PPL-xx-backend-...` dan pesan commit berformat `[PPL-xx] ...`.
  - Pull Request berkala untuk modul database, API routing, dan logika komputasional.

---

### 4. Izzul — Frontend Developer
- **Tanggung Jawab:**
  - Mengimplementasikan antarmuka interaktif aplikasi web e-commerce berbasis komponen responsif.
  - Membangun alur belanja pembeli: tampilan katalog produk, detail produk, pengelolaan keranjang belanja (*cart*), dan halaman *checkout*.
  - Mengintegrasikan frontend dengan endpoint backend dan modul pembayaran (menampilkan pop-up Snap Midtrans / instruksi pembayaran).
  - Memastikan antarmuka bebas error di konsol browser dan berjalan cepat di perangkat mobile/desktop.
- **Bukti Jejak Digital di GitHub / Board:**
  - Branch kode `feature/PPL-xx-frontend-...` dengan pesan commit berformat `[PPL-xx] ...`.
  - Pull Request berkala untuk komponen UI interaktif dan konsumsi API.

---

### 5. Alin — UI/UX Designer & Frontend Support
- **Tanggung Jawab:**
  - Merancang arsitektur informasi, alur pengguna (*User Flow*), dan wireframe aplikasi.
  - Membuat desain antarmuka High-Fidelity di Figma dengan prinsip estetika modern, konsistensi warna, dan kenyamanan pengguna (*finger-friendly mobile design*).
  - Menyusun Design System / UI Token (komponen tombol, kartu produk, badge status pesanan).
  - Membantu *slicing* desain ke dalam komponen antarmuka web, khususnya modul dashboard/manajemen produk untuk admin UMKM.
- **Bukti Jejak Digital di GitHub / Board:**
  - Tautan Figma yang dicantumkan pada README dan Laporan IEEE.
  - Commit aset visual/gambar serta slicing antarmuka frontend admin.
  - Review tampilan PR frontend untuk memastikan kesesuaian dengan mockup.

---

### 6. Tia — QA / Tester & Dokumentasi - Branding
- **Tanggung Jawab:**
  - Menyusun skenario pengujian (*test cases*) berdasarkan kriteria penerimaan dan *Definition of Done (DoD)*.
  - Melakukan pengujian fungsionalitas (alur checkout, simulasi bayar sandbox, hitung ongkir, CRUD admin).
  - Melaporkan temuan bug langsung ke Agile Board sebagai kartu issue tugas agar dapat ditindaklanjuti developer.
  - Membantu Product Owner dan Scrum Master merapikan lampiran laporan (Appendix D & E).
  - Memproduksi **Video Iklan / Branding Aplikasi** (format landscape 16:9, durasi 1–2 menit, voice-over/teks, bebas hak cipta, diunggah ke YouTube) sesuai ketentuan Bagian 6.2 panduan.
- **Bukti Jejak Digital di GitHub / Board:**
  - Pembuatan kartu tiket bug di Agile Board dengan label `bug`.
  - Commit dokumen test log/laporan pengujian di repositori.
  - Berkas video branding dan tautan YouTube di Appendix E.

---

## 4. Siklus Alur Kolaborasi Tim (Mapping ke Integrasi I-1 s.d. I-3)

1. **Product Owner (Zaidan)** membuat User Story `PPL-xx` di kolom *Product Backlog*.
2. Pada **Sprint Planning** yang difasilitasi **Scrum Master (Okan)**, kartu `PPL-xx` dipindahkan ke kolom *To Do (Sprint)* dan di-assign ke developer (**Zaki** / **Izzul** / **Alin**).
   *(Notifikasi otomatis terkirim ke Discord/Slack `#board-notif` via Integrasi I-3)*.
3. Developer membuat branch baru `feature/PPL-xx-...`, melakukan coding, commit dengan pesan `[PPL-xx] deskripsi`, lalu membuat Pull Request (PR) ke branch `main`.
   *(Notifikasi PR masuk ke `#github-notif` via I-1, dan tautan PR otomatis muncul di kartu tugas via I-2)*.
4. **Scrum Master / Rekan Dev** melakukan *Code Review*, dan **Tester (Tia)** menguji fungsi terhadap DoD.
5. Setelah disetujui, PR di-*merge* ke `main`, kartu digeser ke kolom *Done*.
   *(Notifikasi merge masuk ke `#github-notif`, dan perpindahan ke Done masuk ke `#board-notif`)*.
