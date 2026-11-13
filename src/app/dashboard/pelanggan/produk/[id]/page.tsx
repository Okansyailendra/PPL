'use client';

import React, { useState, useMemo, useEffect, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import Sidebar from '@/components/pembeli/Sidebar';
import TopHeader from '@/components/pembeli/TopHeader';
import CartDrawer from '@/components/pembeli/CartDrawer';
import Footer from '@/components/pembeli/Footer';
import { PRODUCTS as FALLBACK_PRODUCTS } from '@/data/mockProducts';
import { Product, ProductVariant } from '@/types';
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
  X,
  AlertTriangle,
  Ban,
  RefreshCw
} from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

function ProductDetailContent({ productId }: { productId: string }) {
  const { addToCart, setIsCartOpen } = useCart();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch product data dari database via API catalog
  useEffect(() => {
    let isMounted = true;
    async function fetchDetail() {
      try {
        setLoading(true);
        const res = await fetch(`/api/catalog/${productId}`);
        const json = await res.json();
        if (json?.success && json?.data && isMounted) {
          setProduct(json.data);
          return;
        }
      } catch (err) {
        console.warn('Gagal memuat detail produk dari database, fallback ke mock:', err);
      }
      if (isMounted) {
        const fallback = FALLBACK_PRODUCTS.find((p) => p.id === productId) || FALLBACK_PRODUCTS[0];
        setProduct(fallback);
      }
      setLoading(false);
    }
    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [productId]);

  const activeProduct = product || FALLBACK_PRODUCTS[0];
  const stock = typeof activeProduct.stock === 'number' ? activeProduct.stock : 0;
  const isOutOfStock = stock <= 0;
  const isLowStock = !isOutOfStock && (activeProduct.isLowStock || stock <= (activeProduct.min_stock || 5));

  // Default variants if product doesn't define custom variants
  const variants: ProductVariant[] = useMemo(() => {
    if (activeProduct.variants && activeProduct.variants.length > 0) {
      return activeProduct.variants;
    }
    return [
      {
        id: 'var-1',
        name: 'Satuan',
        sublabel: `1 ${activeProduct.unit || 'pcs'}`,
        price: activeProduct.price,
        multiplier: 1,
      },
      {
        id: 'var-2',
        name: 'Paket 5x',
        sublabel: `5 ${activeProduct.unit || 'pcs'}`,
        price: Math.round(activeProduct.price * 5 * 0.95),
        savingsNote: 'Paket 5x lebih hemat 5%',
        multiplier: 5,
      },
      {
        id: 'var-3',
        name: 'Dus / Grosir',
        sublabel: `Kemasan grosir`,
        price: Math.round(activeProduct.price * 20 * 0.9),
        multiplier: 20,
      },
    ];
  }, [activeProduct]);

  // Selected variant state
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(variants[0]);

  useEffect(() => {
    if (variants.length > 0) {
      setSelectedVariant(variants[0]);
    }
  }, [variants]);

  // Quantity state
  const [quantity, setQuantity] = useState(1);

  const subtotal = (selectedVariant?.price || activeProduct.price) * quantity;

  // Cek apakah quantity * multiplier melebihi stok
  const totalItemCount = quantity * (selectedVariant?.multiplier || 1);
  const exceedsStock = totalItemCount > stock;

  const handleAddToCart = () => {
    if (isOutOfStock || exceedsStock) return;
    addToCart(activeProduct, selectedVariant, quantity);
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
                {activeProduct.categoryLabel || activeProduct.category || 'Katalog'}
              </span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="text-slate-900 font-semibold truncate">
                {activeProduct.name}
              </span>
            </nav>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
              <div>
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest block mb-1">
                  DETAIL PRODUK &amp; STOK REAL-TIME
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
                      src={activeProduct.image || '/assets/logo.png'}
                      alt={activeProduct.name}
                      fill
                      priority
                      className={`object-contain p-4 transition-transform duration-300 ${
                        isOutOfStock ? 'grayscale' : 'group-hover:scale-105'
                      }`}
                    />
                  </div>

                  {/* Stock Information Overlay Bar */}
                  <div className={`mt-4 p-3 rounded-xl border flex items-center justify-between shadow-2xs ${
                    isOutOfStock 
                      ? 'bg-rose-50 border-rose-200 text-rose-900' 
                      : isLowStock 
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-white/90 backdrop-blur-xs border-slate-200/80'
                  }`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isOutOfStock
                          ? 'bg-rose-100 text-rose-700'
                          : isLowStock
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {isOutOfStock ? <Ban className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold">
                          {isOutOfStock
                            ? 'Stok fisik saat ini habis'
                            : `${stock} ${activeProduct.unit || 'pcs'} tersedia di warung`}
                        </div>
                        <div className="text-[11px] opacity-75 truncate">
                          {isOutOfStock 
                            ? 'Sedang dalam proses kulakan ulang'
                            : isLowStock 
                              ? 'Stok menipis, segera pesan' 
                              : 'Stok warung siap dikirim / diambil'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold bg-white/80 border border-slate-200/60 px-2 py-0.5 rounded-full shrink-0">
                      Sinkron Riil
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 text-center sm:text-left">
                  Foto sebagai referensi kemasan. Stok barang tersinkronisasi langsung dengan sistem kasir fisik Toko Wadira.
                </p>
              </div>

              {/* Right Column: Title, Variant Radio Cards, Quantity & CTA */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60 mb-2.5">
                    {activeProduct.categoryLabel || activeProduct.category || 'Kebutuhan Harian'}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {activeProduct.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                    {activeProduct.description || 'Pilihan tepat untuk kebutuhan harian keluarga dan dapur Anda.'}
                  </p>
                </div>

                {/* Variant Selection Section */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Pilih satuan belanja
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {variants.map((v) => {
                      const isSelected = selectedVariant?.id === v.id;
                      return (
                        <div
                          key={v.id}
                          onClick={() => setSelectedVariant(v)}
                          className={`relative p-3.5 rounded-2xl cursor-pointer transition-all duration-150 flex flex-col justify-between ${
                            isSelected
                              ? 'border-2 border-emerald-600 bg-[#f2f7ec] shadow-xs'
                              : 'border border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/50'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-2.5 right-2.5 text-emerald-700">
                              <CheckCircle2 className="w-4 h-4 fill-emerald-600 text-white" />
                            </div>
                          )}

                          <div>
                            <div className="font-bold text-neutral-900 text-sm">
                              {v.name}
                            </div>
                            <div className="text-[11px] text-neutral-500 mt-0.5">
                              {v.sublabel}
                            </div>
                          </div>

                          <div className="mt-4 pt-2 border-t border-neutral-200/60">
                            <span className="text-base font-black text-neutral-950">
                              Rp{v.price.toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

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
                        disabled={quantity <= 1 || isOutOfStock}
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
                        disabled={isOutOfStock || exceedsStock}
                        className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center hover:bg-emerald-100 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
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

                {exceedsStock && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Jumlah yang dipilih ({totalItemCount} {activeProduct.unit || 'pcs'}) melebihi sisa stok yang tersedia ({stock} {activeProduct.unit || 'pcs'}).</span>
                  </div>
                )}

                {/* Action CTA Button */}
                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleAddToCart}
                    type="button"
                    disabled={isOutOfStock || exceedsStock}
                    className={`w-full py-4 px-6 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-xs transition active:scale-[0.99] ${
                      isOutOfStock || exceedsStock
                        ? 'bg-neutral-200 text-neutral-400 border border-neutral-300 cursor-not-allowed'
                        : justAdded
                          ? 'bg-[#d4f952] text-neutral-950 border border-[#c4ec3e] cursor-pointer'
                          : 'bg-[#d4f952] hover:bg-[#c4ec3e] text-neutral-950 border border-[#c4ec3e] cursor-pointer'
                    }`}
                  >
                    {isOutOfStock ? (
                      <>
                        <Ban className="w-4 h-4 text-neutral-400" />
                        <span>Stok Barang Sedang Habis</span>
                      </>
                    ) : exceedsStock ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-neutral-400" />
                        <span>Melebihi Stok Tersedia</span>
                      </>
                    ) : justAdded ? (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
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
                    {isOutOfStock 
                      ? 'Barang ini sedang kosong di kasir fisik Toko Wadira.'
                      : `Stok fisik terverifikasi: ${stock} ${activeProduct.unit || 'pcs'}.`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Footer />
        </main>
      </div>

      <CartDrawer />
    </div>
  );
}

export default function ProductDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  return <ProductDetailContent productId={resolvedParams.id} />;
}
