'use client';

import React, { useState, useMemo, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CartProvider, useCart } from '@/context/CartContext';
import Sidebar from '@/components/pembeli/Sidebar';
import TopHeader from '@/components/pembeli/TopHeader';
import CartDrawer from '@/components/pembeli/CartDrawer';
import Footer from '@/components/pembeli/Footer';
import { PRODUCTS } from '@/data/mockProducts';
import { ProductVariant } from '@/types';
import { 
  ChevronRight, 
  ArrowLeft, 
  Minus, 
  Plus, 
  ShoppingCart, 
  Check, 
  CheckCircle2, 
  Package, 
  Store, 
  Truck, 
  MessageCircle, 
  HelpCircle,
  X 
} from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

function ProductDetailContent({ productId }: { productId: string }) {
  const { addToCart, setIsCartOpen } = useCart();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  // Find product from PRODUCTS mock list
  const product = useMemo(() => {
    return PRODUCTS.find((p) => p.id === productId) || PRODUCTS[2]; // Default to Indomie Mi Goreng if not found
  }, [productId]);

  // Default variants if product doesn't define custom variants
  const variants: ProductVariant[] = useMemo(() => {
    if (product.variants && product.variants.length > 0) {
      return product.variants;
    }
    // Fallback dynamic variants
    return [
      {
        id: 'var-1',
        name: 'Satuan',
        sublabel: `1 ${product.unit}`,
        price: product.price,
        multiplier: 1,
      },
      {
        id: 'var-2',
        name: 'Paket 5x',
        sublabel: `5 ${product.unit}`,
        price: Math.round(product.price * 5 * 0.95),
        savingsNote: 'Paket 5x lebih hemat 5%',
        multiplier: 5,
      },
      {
        id: 'var-3',
        name: 'Dus / Grosir',
        sublabel: `1 kardus besar`,
        price: Math.round(product.price * 20 * 0.9),
        multiplier: 20,
      },
    ];
  }, [product]);

  // Selected variant state (default to second variant like Renteng in Figma, or first if only 1)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(
    variants[1] || variants[0]
  );

  // Quantity state
  const [quantity, setQuantity] = useState(1);

  const subtotal = (selectedVariant?.price || product.price) * quantity;

  const handleAddToCart = () => {
    addToCart(product, selectedVariant, quantity);
    setJustAdded(true);
    setTimeout(() => {
      setJustAdded(false);
      setIsCartOpen(true);
    }, 600);
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Backdrop & Drawer */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative z-10 w-72 bg-white h-full shadow-2xl flex flex-col">
            <div className="p-3 flex justify-end">
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Sidebar />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)} />

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Breadcrumb & Action Header */}
          <div className="space-y-2">
            <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Link 
                href="/dashboard/pelanggan" 
                className="hover:text-emerald-700 transition"
              >
                Etalase warung
              </Link>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="text-slate-600">
                {product.categoryLabel || 'Sembako & Dapur'}
              </span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="text-slate-900 font-semibold truncate">
                {product.name}
              </span>
            </nav>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
              <div>
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest block mb-1">
                  DETAIL PRODUK
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Pilih satuan sesuai kebutuhan.
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Belanja sedikit atau sekalian stok di rumah, harganya jelas sebelum masuk keranjang.
                </p>
              </div>

              <Link
                href="/dashboard/pelanggan"
                className="self-start sm:self-auto px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke etalase</span>
              </Link>
            </div>
          </div>

          {/* Main Product & Variant Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 md:p-8 shadow-xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Image Box & Stock Note */}
              <div className="lg:col-span-5 space-y-2.5">
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 sm:p-6 flex flex-col justify-between overflow-hidden relative group">
                  <div className="relative w-full aspect-square max-h-[340px] flex items-center justify-center mx-auto">
                    <Image
                      src={product.image || '/assets/logo.png'}
                      alt={product.name}
                      fill
                      priority
                      className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Stock Information Overlay Bar */}
                  <div className="mt-4 p-3 rounded-xl bg-white/90 backdrop-blur-xs border border-slate-200/80 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800">
                          {product.stock} {product.unit} tersedia
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {product.equivalentNote || `Stok warung siap dikirim / diambil`}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                      09.41 WIB
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 text-center sm:text-left">
                  Foto sebagai referensi. Kemasan dapat berubah mengikuti stok warung.
                </p>
              </div>

              {/* Right Column: Title, Variant Radio Cards, Quantity & CTA */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60 mb-2.5">
                    {product.categoryLabel || 'Sembako & Dapur'}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {product.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                    {product.description || 'Pilihan tepat untuk kebutuhan harian keluarga dan dapur Anda.'}
                  </p>
                </div>

                {/* Variant Selection Section */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Pilih satuan belanja
                  </div>

                  {/* 3 Variant Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {variants.map((v) => {
                      const isSelected = selectedVariant?.id === v.id;
                      return (
                        <div
                          key={v.id}
                          onClick={() => setSelectedVariant(v)}
                          className={`relative p-3.5 rounded-2xl cursor-pointer transition-all duration-150 flex flex-col justify-between ${
                            isSelected
                              ? 'border-2 border-emerald-600 bg-emerald-50/25 shadow-xs ring-2 ring-emerald-500/10'
                              : 'border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-2.5 right-2.5 text-emerald-600">
                              <CheckCircle2 className="w-4 h-4 fill-emerald-600 text-white" />
                            </div>
                          )}

                          <div>
                            <div className="font-bold text-slate-800 text-sm">
                              {v.name}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {v.sublabel}
                            </div>
                          </div>

                          <div className="mt-4 pt-2 border-t border-slate-100/80">
                            <span className="text-base font-extrabold text-emerald-800">
                              Rp{v.price.toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Savings / Helper Note */}
                  {selectedVariant?.savingsNote && (
                    <p className="text-xs font-semibold text-emerald-700">
                      {selectedVariant.savingsNote}
                    </p>
                  )}
                </div>

                {/* Quantity Stepper & Subtotal Row */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 capitalize">
                      Jumlah {selectedVariant?.name.toLowerCase() || 'barang'}
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                        disabled={quantity <= 1}
                        className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-extrabold text-slate-900">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity((prev) => prev + 1)}
                        className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center hover:bg-emerald-100 active:scale-95 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-medium">
                      {quantity} {selectedVariant?.name.toLowerCase()} x Rp{selectedVariant?.price.toLocaleString('id-ID')}
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-emerald-900 tracking-tight">
                      Rp{subtotal.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {/* Action CTA Button */}
                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleAddToCart}
                    type="button"
                    className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99] cursor-pointer ${
                      justAdded
                        ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                        : 'bg-[#0F4A3C] hover:bg-[#0c3c31] text-white shadow-emerald-950/20'
                    }`}
                  >
                    {justAdded ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Pilihan berhasil ditambahkan!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        <span>Simpan pilihan ke keranjang</span>
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-slate-500 text-center">
                    Pilihan saat ini: {quantity} {selectedVariant?.name.toLowerCase()} ({selectedVariant?.sublabel}) di keranjang. Stok belum berkurang sebelum dikonfirmasi kasir.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Information Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Card 1: Dua cara menerima belanjaan */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
              <h3 className="font-bold text-slate-900 text-sm">
                Dua cara menerima belanjaan
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Ambil sendiri • Gratis
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      Kasir menyiapkan pesanan. Ambil setelah mendapat kabar dari Alin.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Antar rumah • Rp5.000
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      Diantar pihak warung dalam radius 1 km. Estimasi 30–60 menit.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Pesanan diteruskan ke WA & Butuh satuan lain */}
            <div className="space-y-3">
              {/* Card 2: Pesanan diteruskan ke WhatsApp */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Pesanan diteruskan ke WhatsApp AlinStore
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                    Cek lagi belanjaan, isi identitas, lalu buka WhatsApp dengan rekap yang sudah disiapkan. Kasir akan memastikan stok dan waktu layanan.
                  </p>
                </div>
              </div>

              {/* Card 3: Butuh satuan lain? */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Butuh satuan lain?
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                    Tuliskan kebutuhan khusus di catatan pesanan. Untuk rokok tersedia pilihan batang, bungkus, dan slop: hanya untuk pelanggan usia 21 tahun ke atas.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <Footer />
        </main>
      </div>

      {/* Slide-over Cart Drawer */}
      <CartDrawer />
    </div>
  );
}

export default function ProductDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);

  return <ProductDetailContent productId={resolvedParams.id} />;
}
