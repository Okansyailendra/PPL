"use client";

/**
 * Toko Wadira - Storefront Resmi & Profil Warung Madura Modern
 *
 * Implementasi 1:1 sesuai desain Figma:
 * - Brand: Wadira. (Modern grotesk wordmark)
 * - Palet: Pure White (#ffffff), Warm Off-White (#fbfbf9), Soft Sage (#f2f7ec), & Electric Lime (#d4f952)
 * - Tipografi: Plus Jakarta Sans / Bold Grotesk dengan tracking rapat & hierarki editorial bersih
 * - Struktur seksi:
 *   1. Header / Navbar dengan status buka tegas & tombol Katalog Belanja
 *   2. Hero "Dari beras sampai bayar listrik." dengan kartu etalase foto & banner siap antar
 *   3. Trust Ticker 4 poin keunggulan
 *   4. Seksi Sembako "Stok dapur aman. Hari pun lebih tenang." & kartu foto cerita bahan
 *   5. Seksi PPOB "Belanja iya. Bayar tagihan juga." berlatar soft sage mint
 *   6. Seksi Keunggulan "Kenal kebutuhan. Dekat keseharian." dengan foto toko riil
 *   7. Seksi 3 Langkah Pesan "Mau pesan? Begini caranya."
 *   8. Seksi Lokasi & Jam Operasional "Dekat rumah. Dekat kebutuhan."
 *   9. Banner CTA Lime "Ada yang habis di rumah? Wadira siap bantu."
 *   10. Footer Modern Editorial dengan wordmark raksasa "Wadira."
 */

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock,
  Coffee,
  CreditCard,
  Droplets,
  Flame,
  MapPin,
  Menu,
  MessageCircle,
  Package,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  Wallet,
  X,
  Zap,
} from "lucide-react";

/* =========================================================
 * DATA IDENTITAS TOKO WADIRA
 * ======================================================= */

const NAV_LINKS = [
  { id: "produk", label: "Belanja Sembako" },
  { id: "layanan", label: "Bayar & Beli Pulsa" },
  { id: "tentang", label: "Tentang Wadira" },
  { id: "lokasi", label: "Kunjungi Kami" },
];

const TRUST_POINTS = [
  "Toko dekat & kebutuhan lengkap",
  "Resmi PLN, PDAM & Agen Pulsa",
  "Bersih, Nyaman & Kualitas Terjaga",
  "Tunai, QRIS & Transfer",
];

const PRODUCT_CATEGORIES = [
  {
    id: "sembako",
    title: "Sembako & Dapur",
    desc: "Beras, minyak goreng, telur, gula, tepung & bumbu lengkap",
    icon: ShoppingBag,
  },
  {
    id: "minuman",
    title: "Minuman & Kopi",
    desc: "Minuman dingin, kopi seduh panas/es, air mineral segar",
    icon: Coffee,
  },
  {
    id: "gas_galon",
    title: "Gas LPG & Air Galon",
    desc: "Isi ulang Aqua/Le Minerale & tabung melon 3kg bersubsidi",
    icon: Flame,
  },
  {
    id: "jajan",
    title: "Camilan & Mi Instan",
    desc: "Berbagai merk mi instan, keripik, roti & jajanan harian",
    icon: Package,
  },
  {
    id: "rumah",
    title: "Kebutuhan Rumah",
    desc: "Deterjen pakaian, sabun mandi, sampo, pembersih lantai",
    icon: Sparkles,
  },
  {
    id: "warung",
    title: "Kebutuhan Warung",
    desc: "Rokok filter/kretek resmi, korek gas, obat ringan warung",
    icon: Store,
  },
];

const PPOB_SERVICES = [
  {
    id: "pln",
    title: "Listrik PLN",
    desc: "Beli token meteran & bayar tagihan listrik pascabayar.",
    icon: Zap,
  },
  {
    id: "pdam",
    title: "Air PDAM",
    desc: "Pelunasan tagihan air bulanan semua wilayah terdaftar.",
    icon: Droplets,
  },
  {
    id: "pulsa",
    title: "Pulsa & Paket Data",
    desc: "Isi ulang kuota internet & pulsa semua operator seluler.",
    icon: Smartphone,
  },
  {
    id: "ewallet",
    title: "Saldo Dompet Digital",
    desc: "Top-up DANA, GoPay, OVO, ShopeePay & LinkAja bebas antre.",
    icon: Wallet,
  },
  {
    id: "bpjs",
    title: "BPJS Kesehatan",
    desc: "Bayar premi BPJS Kesehatan keluarga tepat waktu tanpa denda.",
    icon: ShieldCheck,
  },
  {
    id: "voucher",
    title: "Voucher & Cicilan",
    desc: "Voucher game favorit & pembayaran tagihan cicilan motor.",
    icon: CreditCard,
  },
];

const ORDER_STEPS = [
  {
    num: "01",
    title: "Pilih kebutuhan",
    desc: "Lihat produk di katalog online atau chat WhatsApp kasir.",
  },
  {
    num: "02",
    title: "Konfirmasi Wadira",
    desc: "Kasir mengecek stok dan menghitung total belanjaan Anda.",
  },
  {
    num: "03",
    title: "Ambil atau diantar",
    desc: "Pesanan siap diambil di kasir atau diantarkan ke rumah Anda.",
  },
];

/* =========================================================
 * 1. NAVBAR (BERSIH, MINIMALIS, SESUAI FIGMA)
 * ======================================================= */

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 15);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const checkStoreStatus = () => {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const wib = new Date(utc + 3600000 * 7);
      const hour = wib.getHours();
      setIsOpen(hour >= 6 && hour < 24);
    };
    checkStoreStatus();
    const interval = setInterval(checkStoreStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      className={`fixed left-0 top-0 z-50 w-full transition-all duration-200 ${
        scrolled
          ? "border-b border-neutral-200/80 bg-white/95 backdrop-blur-md shadow-xs py-3.5"
          : "border-b border-neutral-100 bg-white py-4 sm:py-5"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 lg:px-8">
        {/* Kiri: Logo Wadira. & Status Buka/Tutup Pojok Kiri Atas */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-baseline gap-1 group">
            <span className="font-sans text-2xl sm:text-[26px] font-black tracking-tight text-neutral-950">
              Wadira
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-600 inline-block mb-0.5" />
          </Link>

          {/* Status Toko: Tegas tanpa titik dot acak */}
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              isOpen
                ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                : "bg-red-50 text-red-700 border border-red-300"
            }`}
          >
            {isOpen ? "Buka" : "Tutup"}
          </span>
        </div>

        {/* Tengah: Navigasi Desktop */}
        <nav className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              className="text-[14px] font-medium text-neutral-600 transition-colors hover:text-neutral-950"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Kanan: Tombol Katalog Belanja Figma (Pill Lime Green) */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/pelanggan"
            className="inline-flex items-center gap-2 rounded-full bg-[#d4f952] px-5 py-2.5 text-xs sm:text-sm font-bold text-neutral-950 shadow-xs transition-all duration-200 hover:bg-[#c4ec3e] hover:shadow"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Katalog Belanja</span>
          </Link>

          {/* Hamburger Mobile */}
          <button
            type="button"
            className="rounded-lg p-2 text-neutral-700 hover:bg-neutral-100 lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Tutup menu" : "Buka menu"}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {open && (
        <div className="border-t border-neutral-200 bg-white px-6 py-5 shadow-lg lg:hidden">
          <nav className="flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={() => setOpen(false)}
                className="py-1.5 text-sm font-medium text-neutral-700 hover:text-neutral-950"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

/* =========================================================
 * 2. HERO SECTION (SESUAI GAMBAR FIGMA 1:1)
 * ======================================================= */

function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#ffffff] pt-24 pb-14 sm:pt-32 sm:pb-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          {/* Kolom Kiri: Headline & CTA */}
          <div className="lg:col-span-6 xl:col-span-7">
            {/* Eyebrow Label */}
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-neutral-500">
              <span className="h-[1px] w-6 bg-neutral-400" />
              <span>Sembako & Pulsa • Lebih Dekat Lebih Pas</span>
            </div>

            {/* Heading Utama */}
            <h1 className="mb-6 font-sans text-4xl sm:text-5xl lg:text-[58px] font-black tracking-tight text-neutral-950 leading-[1.08]">
              Dari beras <br />
              sampai <br />
              bayar <span className="text-emerald-700">listrik.</span>
            </h1>

            {/* Paragraf Pengantar */}
            <p className="mb-8 max-w-xl text-base sm:text-lg text-neutral-600 leading-relaxed font-normal">
              Belanja kebutuhan pokok harian murah, lengkap, cepat. Bisa pesan online atau bayar langsung di Wadira.
            </p>

            {/* Tombol CTA Hero */}
            <div className="mb-8 flex flex-wrap items-center gap-3 sm:gap-4">
              <Link
                href="/dashboard/pelanggan"
                className="inline-flex items-center gap-2 rounded-xl bg-[#d4f952] px-6 py-3.5 text-sm font-bold text-neutral-950 shadow-xs transition-all duration-200 hover:bg-[#c4ec3e] hover:shadow"
              >
                <span>Mulai Belanja</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>

              <a
                href="https://wa.me/6289516201846?text=Halo%20Toko%20Wadira,%20saya%20mau%20pesan%20belanjaan"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-6 py-3.5 text-sm font-semibold text-neutral-800 shadow-2xs transition-all duration-200 hover:border-neutral-400 hover:bg-neutral-50"
              >
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                <span>Chat WhatsApp</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-neutral-400" />
              </a>
            </div>

            {/* Status Jam Buka di bawah tombol */}
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
              <Clock className="h-3.5 w-3.5 text-emerald-600" />
              <span>Buka setiap hari • 06.00 – 24.00 WIB</span>
            </div>
          </div>

          {/* Kolom Kanan: Foto Tas Belanjaan & Callout Siap Antar */}
          <div className="lg:col-span-6 xl:col-span-5">
            <div className="relative overflow-hidden rounded-3xl border border-neutral-200/90 bg-neutral-100 shadow-md">
              {/* Gambar Tas Belanjaan Bahan Segar */}
              <div className="relative h-[380px] sm:h-[430px] w-full overflow-hidden">
                <img
                  src="/images/hero_groceries.jpg"
                  alt="Belanjaan Sembako Toko Wadira"
                  className="h-full w-full object-cover object-center"
                />

                {/* Badge Lokasi di Pojok Kiri Atas Foto */}
                <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-neutral-900 shadow-sm backdrop-blur-xs">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                  <span>TOKO WADIRA (WARUNG MADURA)</span>
                </div>
              </div>

              {/* Floating Lime Callout Banner di Bawah Gambar */}
              <div className="m-3 sm:m-4 rounded-2xl bg-[#d4f952] p-5 text-neutral-950 shadow-xs">
                <h3 className="font-sans text-base font-extrabold mb-1">
                  Tak sempat mampir?
                </h3>
                <p className="text-xs sm:text-sm text-neutral-800 leading-snug">
                  Beli via WhatsApp atau di katalog, pesanan siap kami antar.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
 * 3. TRUST TICKER / BAR 4 POIN KEUNGGULAN
 * ======================================================= */

function TrustTicker() {
  return (
    <div className="border-y border-neutral-200/80 bg-[#fafafa] py-3.5">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
          {TRUST_POINTS.map((pt, i) => (
            <div key={i} className="flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="text-xs sm:text-[13px] font-semibold text-neutral-700">
                {pt}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
 * 4. SEKSI SEMBAKO (STOK DAPUR AMAN & KARTU CERITA)
 * ======================================================= */

function GrocerySection() {
  return (
    <section id="produk" className="scroll-mt-20 bg-white py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header Seksi Sembako */}
        <div className="mb-14 grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-neutral-500">
              <span className="h-[1px] w-6 bg-neutral-400" />
              <span>Apa Saja Yang Ada di Toko Wadira</span>
            </div>
            <h2 className="font-sans text-3xl sm:text-4xl lg:text-[42px] font-black tracking-tight text-neutral-950 leading-tight">
              Stok dapur aman, <br />
              Hari pun lebih tenang.
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
              Dari beras pulen sampai bumbu dapur kecil yang suka bikin lupa, semua ada dalam satu toko tanpa harus pergi jauh ke pasar.
            </p>
          </div>
        </div>

        {/* Konten: Grid 6 Kategori (Kiri) + Foto Cerita Bahan (Kanan) */}
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
          {/* Kolom Kiri: Daftar 6 Kategori Kebutuhan */}
          <div className="lg:col-span-7">
            <div className="grid gap-6 sm:grid-cols-2">
              {PRODUCT_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <div key={cat.id} className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-sans text-base font-bold text-neutral-950 mb-1">
                        {cat.title}
                      </h3>
                      <p className="text-xs text-neutral-600 leading-relaxed">
                        {cat.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Link ke Katalog Belanja */}
            <div className="mt-8 pt-4 border-t border-neutral-100">
              <Link
                href="/dashboard/pelanggan"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-neutral-900 transition-colors hover:text-emerald-700"
              >
                <span>Lihat semua produk di katalog</span>
                <ArrowRight className="h-4 w-4 text-emerald-600" />
              </Link>
            </div>
          </div>

          {/* Kolom Kanan: Foto Story Ingredients */}
          <div className="lg:col-span-5">
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 shadow-sm">
              <div className="relative h-60 w-full overflow-hidden">
                <img
                  src="/images/story_ingredients.jpg"
                  alt="Bahan dapur Toko Wadira"
                  className="h-full w-full object-cover object-center"
                />
              </div>
              <div className="p-5">
                <h3 className="font-sans text-sm font-bold text-neutral-950">
                  Bahan sederhana, banyak cerita.
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Kualitas terjaga, expired selalu dicek berkala.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
 * 5. SEKSI PPOB / LAYANAN DIGITAL (SOFT SAGE BACKGROUND)
 * ======================================================= */

function DigitalServicesSection() {
  return (
    <section id="layanan" className="scroll-mt-20 border-y border-[#e2edd8] bg-[#f2f7ec] py-20 text-neutral-900">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
          {/* Kolom Kiri: Headline & CTA Kasir */}
          <div className="lg:col-span-5 space-y-5">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-neutral-500">
              <span className="h-[1px] w-6 bg-neutral-400" />
              <span>Loket Resmi & Digital</span>
            </div>

            <h2 className="font-sans text-3xl sm:text-4xl lg:text-[42px] font-black tracking-tight text-neutral-950 leading-tight">
              Belanja iya. <br />
              Bayar tagihan <br />
              juga.
            </h2>

            <p className="text-sm sm:text-base text-neutral-700 leading-relaxed">
              Tak perlu repot pindah tempat. Sambil beli beras atau belanja harian, selesaikan tagihan rumah tangga dalam hitungan menit di kasir Wadira.
            </p>

            <div className="pt-2">
              <a
                href="https://wa.me/6289516201846?text=Halo%20Kasir%20Wadira,%20saya%20mau%20bayar%20tagihan"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#d4f952] px-6 py-3.5 text-sm font-bold text-neutral-950 shadow-xs transition-all hover:bg-[#c4ec3e]"
              >
                <span>Tanya Layanan ke Kasir</span>
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>

            <p className="text-xs text-neutral-500 pt-1 leading-relaxed">
              Bisa bayar langsung di kasir (tunai / QRIS) atau titip bayar via WhatsApp tanpa antre.
            </p>
          </div>

          {/* Kolom Kanan: Grid 6 Layanan Digital PPOB */}
          <div className="lg:col-span-7">
            <div className="grid gap-6 sm:grid-cols-2">
              {PPOB_SERVICES.map((srv) => {
                const Icon = srv.icon;
                return (
                  <div
                    key={srv.id}
                    className="rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-2xs transition-shadow hover:shadow-xs"
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#f2f7ec] text-emerald-800">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-sans text-base font-bold text-neutral-950 mb-1">
                      {srv.title}
                    </h3>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      {srv.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-neutral-600">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>Semua transaksi langsung terverifikasi resmi dengan bukti struk sah.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
 * 6. SEKSI KEUNGGULAN (KENAL KEBUTUHAN & FOTO RIIL)
 * ======================================================= */

function StoreStorySection() {
  return (
    <section id="tentang" className="scroll-mt-20 bg-white py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          {/* Kolom Kiri: Foto Toko Asli Toko Wadira */}
          <div className="lg:col-span-5">
            <div className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-900 shadow-md">
              <div className="relative h-[420px] w-full">
                <img
                  src="/images/foto_warung.jpeg"
                  alt="Suasana Pelayanan Toko Wadira"
                  className="h-full w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 text-white">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white">
                    <MapPin className="h-3 w-3 text-emerald-400" />
                    <span>Melayani sepenuh hati setiap hari</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: 3 Keunggulan Toko */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-neutral-500">
                <span className="h-[1px] w-6 bg-neutral-400" />
                <span>Kenapa Memilih Toko Wadira</span>
              </div>
              <h2 className="font-sans text-3xl sm:text-4xl lg:text-[42px] font-black tracking-tight text-neutral-950 leading-tight">
                Kenal kebutuhan. <br />
                Dekat keseharian.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-neutral-600 leading-relaxed">
                Wadira bukan sekadar toko sembako biasa. Kami hadir sebagai tetangga andalan Anda yang selalu buka saat butuh, ramah melayani, dan jujur dalam harga.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800">
                  <Check className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-sans text-base font-bold text-neutral-950">
                    Apa yang dicari, ada
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 mt-0.5">
                    Stok sembako lengkap dan terjaga kebersihannya.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800">
                  <Clock className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-sans text-base font-bold text-neutral-950">
                    Buka lebih pagi & larut malam
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 mt-0.5">
                    Melayani setiap hari dari pukul 06.00 hingga 24.00 malam.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800">
                  <Store className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-sans text-base font-bold text-neutral-950">
                    Ramah, jujur & dekat
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 mt-0.5">
                    Pelayanan hangat khas warung tetangga yang mengerti Anda.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
 * 7. SEKSI 3 LANGKAH PESAN (BEGINI CARANYA)
 * ======================================================= */

function HowToOrderSection() {
  return (
    <section className="border-t border-neutral-200/80 bg-[#fbfbf9] py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-4">
            <h2 className="font-sans text-2xl sm:text-3xl font-black tracking-tight text-neutral-950 leading-snug">
              Mau pesan? <br />
              Begini caranya.
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-3 lg:col-span-8">
            {ORDER_STEPS.map((step) => (
              <div key={step.num} className="space-y-2">
                <span className="text-xs font-mono font-bold text-neutral-400">
                  — {step.num}
                </span>
                <h3 className="font-sans text-base font-bold text-neutral-950">
                  {step.title}
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
 * 8. SEKSI LOKASI & JAM OPERASIONAL
 * ======================================================= */

function StoreLocationSection() {
  return (
    <section id="lokasi" className="scroll-mt-20 border-t border-neutral-200/80 bg-white py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3 md:items-start">
          {/* Kolom 1: Heading */}
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-neutral-500">
              <span className="h-[1px] w-6 bg-neutral-400" />
              <span>Lokasi & Jam Buka</span>
            </div>
            <h2 className="font-sans text-2xl sm:text-3xl font-black tracking-tight text-neutral-950 leading-tight">
              Dekat rumah. <br />
              Dekat kebutuhan.
            </h2>
          </div>

          {/* Kolom 2: Alamat */}
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800">
              <MapPin className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Alamat Toko
              </span>
              <p className="font-sans text-sm font-bold text-neutral-950 mt-1">
                Jl. Lingkungan Pemukiman Warga No. 12 (Toko Madura Wadira)
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Patokan: Depan pos RT / gapura hijau, plang Wadira
              </p>
            </div>
          </div>

          {/* Kolom 3: Jam Operasional */}
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800">
              <Clock className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Jam Operasional
              </span>
              <p className="font-sans text-base font-black text-neutral-950 mt-1">
                06.00 – 24.00 WIB
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Senin – Minggu, tanpa libur (Tetap melayani saat tanggal merah)
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
 * 9. BANNER CTA LIME (ADA YANG HABIS DI RUMAH?)
 * ======================================================= */

function BigLimeBanner() {
  return (
    <section className="bg-white px-6 lg:px-8 py-6">
      <div className="mx-auto max-w-7xl rounded-3xl bg-[#d4f952] p-8 sm:p-12 lg:p-14 shadow-sm text-neutral-950">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-8">
            <h2 className="font-sans text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Ada yang habis di rumah? <br />
              Wadira siap bantu.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-neutral-800 font-medium">
              Beras, minyak goreng, gas LPG 3kg, token listrik, atau pulsa darurat malam hari.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-start sm:items-center gap-3 lg:col-span-4 lg:justify-end">
            <Link
              href="/dashboard/pelanggan"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-neutral-950 shadow-xs transition-transform hover:scale-105"
            >
              <span>Buka Katalog Belanja</span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>

            <a
              href="https://wa.me/6289516201846?text=Halo%20Toko%20Wadira,%20saya%20mau%20pesan"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-neutral-900 transition-colors hover:underline"
            >
              <MessageCircle className="h-4 w-4 text-emerald-700" />
              <span>Chat WhatsApp Kasir</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
 * 10. FOOTER EDITORIAL DENGAN WORDMARK RAKSASA "Wadira."
 * ======================================================= */

function Footer() {
  return (
    <footer className="bg-[#d4f952] pt-14 pb-12 text-neutral-950">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end pb-12 border-b border-neutral-950/20">
          {/* Logo Raksasa Wadira. */}
          <div className="lg:col-span-7">
            <span className="font-sans text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter block leading-none">
              Wadira.
            </span>
          </div>

          {/* Navigasi Footer */}
          <div className="lg:col-span-5 flex flex-wrap gap-x-6 gap-y-2 text-xs sm:text-sm font-bold text-neutral-900 lg:justify-end">
            <a href="#produk" className="hover:underline">
              Belanja Sembako
            </a>
            <a href="#layanan" className="hover:underline">
              Layanan PPOB
            </a>
            <Link href="/dashboard/pelanggan" className="hover:underline">
              Katalog Belanja
            </Link>
            <a href="#lokasi" className="hover:underline">
              Kontak Kasir
            </a>
            <a
              href="https://wa.me/6289516201846"
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
            >
              WhatsApp
            </a>
          </div>
        </div>

        {/* Baris Hak Cipta */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-800 font-medium">
          <p>© {new Date().getFullYear()} Toko Wadira. Seluruh hak cipta dilindungi.</p>
          <p>Warung Madura &amp; Loket Pembayaran Digital</p>
        </div>
      </div>
    </footer>
  );
}

/* =========================================================
 * HALAMAN UTAMA (LANDING PAGE EXPORT)
 * ======================================================= */

export default function TokoWadiraLandingPage() {
  return (
    <main className="min-h-screen bg-white font-sans text-neutral-900 antialiased selection:bg-[#d4f952] selection:text-neutral-950">
      <Navbar />
      <Hero />
      <TrustTicker />
      <GrocerySection />
      <DigitalServicesSection />
      <StoreStorySection />
      <HowToOrderSection />
      <StoreLocationSection />
      <BigLimeBanner />
      <Footer />
    </main>
  );
}
