# Panduan Deployment Cloud Hosting & Pemasangan PWA — Wadira (TASK-82)

Dokumen ini menjadi panduan resmi **Deployment Cloud (Vercel)**, **Pemasangan Pintasan Aplikasi (PWA)** di HP/Laptop Tante Helwiyah, serta **Checklist Penyerahan Proyek** untuk Toko Wadira.

---

## 1. Spesifikasi PWA & Pintasan Mobile (Sudah Terpasang)

| Komponen | Lokasi File | Fungsi |
|---|---|---|
| **Web App Manifest** | [`src/app/manifest.ts`](src/app/manifest.ts) (`/manifest.webmanifest`) | Mengatur nama app (`Wadira`), tema olive (`#465427`), mode `standalone`, dan 4 *app shortcuts* (Kasir POS, Cek Stok, Kasbon, Etalase). |
| **Service Worker** | [`public/sw.js`](public/sw.js) | Cache aset statis & ikon + fallback otomatis ke halaman `/offline` jika internet warung terputus (API & sesi auth tetap *Network-First* real-time). |
| **Halaman Offline** | [`src/app/offline/page.tsx`](src/app/offline/page.tsx) | Tampilan ramah berbahasa Indonesia saat koneksi terputus dengan tombol muat ulang. |
| **Ikon Aplikasi** | `public/icons/` (`192x192`, `512x512`, `maskable`, `apple-touch-icon.png`) | Ikon resmi **Wadira** untuk Android, iOS, dan Desktop. |
| **Komponen Install PWA** | [`src/components/pwa/PwaRegistrar.tsx`](src/components/pwa/PwaRegistrar.tsx) & [`InstallPwaButton.tsx`](src/components/pwa/InstallPwaButton.tsx) | Mendaftarkan Service Worker, auto-redirect ke dashboard kasir saat dibuka dari ikon HP, dan menyediakan tombol **"Pasang App / Pintasan HP"**. |
| **Healthcheck Endpoint** | [`src/app/api/health/route.ts`](src/app/api/health/route.ts) (`/api/health`) | Mengecek status aplikasi dan koneksi database pasca-deploy. |

---

## 2. Langkah Deployment ke Cloud Hosting (Vercel)

1. **Push Branch ke GitHub (`Okansyailendra/PPL`)**:
   Pastikan seluruh perubahan terbaru sudah di-commit dan di-push ke branch `main` (atau merge PR sesuai alur tim).
2. **Import Project di Vercel (`https://vercel.com/new`)**:
   - Pilih repository **`Okansyailendra/PPL`**.
   - Pastikan **Root Directory** diatur ke root repo tempat `package.json` berada (jika `package.json` ada di root repo GitHub `Okansyailendra/PPL`, biarkan `.`; sesuaikan dengan struktur remote GitHub).
   - **Framework Preset**: `Next.js` (otomatis terdeteksi bersama [`vercel.json`](vercel.json)).
3. **Isi Environment Variables di Vercel Dashboard (*Project Settings → Environment Variables*)**:
   Salin nilai dari `.env.local` Anda (JANGAN pernah commit `.env.local` ke Git):
   - **Supabase:**
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
   - **Midtrans Sandbox:**
     - `MIDTRANS_SERVER_KEY`
     - `MIDTRANS_CLIENT_KEY`
     - `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`
     - `MIDTRANS_IS_PRODUCTION=false`
   - **SMTP Email (Reset Password):**
     - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
   - **App URL & Security Keys:**
     - `NEXT_PUBLIC_APP_URL=https://wadira-warung.vercel.app`
     - `SESSION_SECRET`
     - `RESET_TOKEN_SECRET`
   - **Google OAuth:**
     - `GOOGLE_CLIENT_ID`
     - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`
     - `GOOGLE_REDIRECT_URI=https://wadira-warung.vercel.app/api/auth/callback/google`
   - **Gemini AI:**
     - `GEMINI_API_KEY`
4. **Update Konsol Layanan Eksternal (Wajib untuk Domain Publik)**:
   - **Google Cloud Console (OAuth 2.0 Credentials):**
     Tambahkan Authorized Redirect URI:
     - `https://wadira-warung.vercel.app/api/auth/callback/google`
     - `https://wadira-warung.vercel.app/api/auth/callback/google.` (opsional jika masih memakai trailing dot)
   - **Midtrans Dashboard (Sandbox → Settings → Configuration → Payment Notification URL):**
     - `https://wadira-warung.vercel.app/api/payment/notification`

---

## 3. Cara Pasang Pintasan Aplikasi (PWA) di HP Tante Helwiyah

### A. Untuk HP Android (Google Chrome)
1. Buka alamat website publik **`https://wadira-warung.vercel.app`** di Chrome.
2. Login menggunakan akun admin/penjual warung (`adminwadira12@gmail.com` / Google) agar sesi tersimpan otomatis.
3. Ketuk tombol hijau limau **"Pasang App"** di bar atas Dashboard Penjual (atau ketuk menu titik tiga **⋮** di Chrome → **"Tambahkan ke layar utama"** / **"Instal aplikasi"**).
4. Konfirmasi **Instal**. Ikon **Wadira** akan muncul di layar utama HP dan langsung membuka portal warung tanpa bilah alamat browser.

### B. Untuk iPhone / iPad (Safari)
1. Buka alamat website publik di **Safari**.
2. Login ke akun penjual warung.
3. Ketuk tombol **Share (ikon kotak panah atas)** di bawah layar → pilih **"Tambahkan ke Layar Utama"** (*Add to Home Screen*) → **Tambah**.

---

## 4. Checklist Verifikasi & Penyerahan Proyek (UAT Ready)

- [ ] Akses `https://wadira-warung.vercel.app/api/health` mengembalikan `status: "ok"` dan `database: "connected"`.
- [ ] Akses `https://wadira-warung.vercel.app/manifest.webmanifest` dapat dibuka dengan status `200 OK`.
- [ ] Login admin/penjual (`adminwadira12@gmail.com`) berhasil & cookie sesi bertahan saat aplikasi PWA ditutup dan dibuka kembali.
- [ ] Pemindai barcode kamera di **Kasir & Transaksi** / **Stok** berfungsi (`Permissions-Policy: camera=(self)`).
- [ ] Transaksi Kasir (Tunai/QRIS/Kasbon), Cetak Struk, dan Checkout Pelanggan via Midtrans berjalan normal.
- [ ] Pintasan PWA **Wadira** sudah terpasang di layar utama ponsel & laptop warung Tante Helwiyah.
