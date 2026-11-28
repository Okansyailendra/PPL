'use client';

import React, { useState, useMemo, useEffect, use } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import CartDrawer from '@/components/pembeli/CartDrawer';
import Footer from '@/components/pembeli/Footer';
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
  AlertTriangle, 
  Ban, 
  Phone, 
  Zap, 
  Droplet, 
  ShieldCheck, 
  Receipt, 
  Info,
  Store,
  Tag,
  Truck,
  Sparkles,
  CreditCard
} from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

const PULSA_OPTIONS = [
  { nominal: 5000, price: 7000 },
  { nominal: 10000, price: 12000 },
  { nominal: 15000, price: 17000 },
  { nominal: 20000, price: 22000 },
  { nominal: 25000, price: 27000 },
  { nominal: 30000, price: 32000 },
  { nominal: 50000, price: 52000 },
  { nominal: 100000, price: 102000 },
];

const PLN_TOKEN_OPTIONS = [
  { nominal: 20000, price: 22000 },
  { nominal: 50000, price: 52000 },
  { nominal: 100000, price: 102000 },
  { nominal: 200000, price: 202000 },
  { nominal: 500000, price: 502000 },
];

function detectOperator(phone: string): { name: string; color: string; badge: string } {
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('0811') || clean.startsWith('0812') || clean.startsWith('0813') || clean.startsWith('0821') || clean.startsWith('0822') || clean.startsWith('0823') || clean.startsWith('0852') || clean.startsWith('0853')) {
    return { name: 'Telkomsel', color: 'bg-red-50 text-red-700 border-red-200', badge: 'Telkomsel' };
  }
  if (clean.startsWith('0814') || clean.startsWith('0815') || clean.startsWith('0816') || clean.startsWith('0855') || clean.startsWith('0856') || clean.startsWith('0857') || clean.startsWith('0858')) {
    return { name: 'Indosat Ooredoo', color: 'bg-amber-50 text-amber-700 border-amber-200', badge: 'Indosat' };
  }
  if (clean.startsWith('0817') || clean.startsWith('0818') || clean.startsWith('0819') || clean.startsWith('0859') || clean.startsWith('0877') || clean.startsWith('0878')) {
    return { name: 'XL Axiata', color: 'bg-blue-50 text-blue-700 border-blue-200', badge: 'XL' };
  }
  if (clean.startsWith('0831') || clean.startsWith('0832') || clean.startsWith('0833') || clean.startsWith('0838')) {
    return { name: 'Axis', color: 'bg-purple-50 text-purple-700 border-purple-200', badge: 'Axis' };
  }
  if (clean.startsWith('0895') || clean.startsWith('0896') || clean.startsWith('0897') || clean.startsWith('0898') || clean.startsWith('0899')) {
    return { name: 'Tri (3)', color: 'bg-orange-50 text-orange-700 border-orange-200', badge: 'Tri' };
  }
  if (clean.startsWith('0881') || clean.startsWith('0882') || clean.startsWith('0883') || clean.startsWith('0884') || clean.startsWith('0885') || clean.startsWith('0886') || clean.startsWith('0887') || clean.startsWith('0888') || clean.startsWith('0889')) {
    return { name: 'Smartfren', color: 'bg-rose-50 text-rose-700 border-rose-200', badge: 'Smartfren' };
  }
  return { name: 'All Operator', color: 'bg-slate-50 text-slate-700 border-slate-200', badge: 'Seluler' };
}

function ProductDetailSkeleton() {
  return (
    <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-pulse">
      {/* Breadcrumb Skeleton */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-24 bg-slate-200 rounded-md" />
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <div className="h-3.5 w-20 bg-slate-200 rounded-md" />
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <div className="h-3.5 w-36 bg-slate-200 rounded-md" />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div className="space-y-2">
            <div className="h-3 w-36 bg-slate-200 rounded-md" />
            <div className="h-8 w-72 bg-slate-200 rounded-xl" />
            <div className="h-4 w-96 max-w-full bg-slate-100 rounded-md" />
          </div>
          <div className="h-9 w-36 bg-slate-200 rounded-xl self-start sm:self-auto" />
        </div>
      </div>

      {/* Main Card Skeleton (Single Detail Card Layout) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="h-6 w-40 bg-slate-200 rounded-full" />
          <div className="h-7 w-32 bg-slate-200 rounded-xl" />
        </div>
        <div className="h-8 w-3/4 bg-slate-200 rounded-xl" />
        <div className="h-4 w-full bg-slate-100 rounded-md" />
        <div className="h-24 w-full bg-slate-100 rounded-2xl mt-2" />
        <div className="h-14 w-full bg-slate-200 rounded-2xl mt-4" />
      </div>

      <Footer />
    </div>
  );
}

function ProductDetailContent({ productId }: { productId: string }) {
  const { addToCart, setIsCartOpen } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  // State khusus PPOB / Tagihan & Pulsa
  const [pulsaPhone, setPulsaPhone] = useState('');
  const [selectedPulsaNominal, setSelectedPulsaNominal] = useState(50000);

  const [plnType, setPlnType] = useState<'token' | 'tagihan'>('token');
  const [plnMeter, setPlnMeter] = useState('');
  const [plnName, setPlnName] = useState('');
  const [selectedPlnToken, setSelectedPlnToken] = useState(50000);

  const [pdamNumber, setPdamNumber] = useState('');
  const [pdamArea, setPdamArea] = useState('PDAM Kab. Bangkalan');
  const [pdamName, setPdamName] = useState('');

  // Default single variant untuk produk fisik (langsung satuan produk eceran)
  const defaultVariant: ProductVariant = useMemo(() => {
    return {
      id: 'satuan',
      name: 'Satuan',
      sublabel: `1 ${product?.unit || 'pcs'}`,
      price: product?.price || 0,
      multiplier: 1,
    };
  }, [product]);

  // Quantity state
  const [quantity, setQuantity] = useState(1);

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
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Gagal memuat detail produk dari database:', err);
      }
      if (isMounted) {
        setProduct(null);
        setLoading(false);
      }
    }
    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [productId]);

  // Loading skeleton state
  if (loading) {
    return <ProductDetailSkeleton />;
  }

  // Not found state jika produk tidak ada di database
  if (!product) {
    return (
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <Ban className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Produk Tidak Ditemukan</h2>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          Produk yang Anda tuju tidak ditemukan di database atau tautan tidak valid.
        </p>
        <Link
          href="/dashboard/pelanggan"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#d4f952] hover:bg-[#c4ec3e] text-neutral-950 font-bold text-xs transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Etalase</span>
        </Link>
      </div>
    );
  }

  const activeProduct = product;
  const stock = typeof activeProduct.stock === 'number' ? activeProduct.stock : 0;
  const isOutOfStock = stock <= 0;
  const isLowStock = !isOutOfStock && (activeProduct.isLowStock || stock <= (activeProduct.min_stock || 5));

  // Deteksi PPOB
  const isPPOB = activeProduct.category === 'Tagihan & Pulsa' || activeProduct.categoryLabel === 'Tagihan & Pulsa';
  const isPulsa = isPPOB && activeProduct.name.toLowerCase().includes('pulsa');
  const isListrik = isPPOB && (activeProduct.name.toLowerCase().includes('listrik') || activeProduct.name.toLowerCase().includes('token'));
  const isPDAM = isPPOB && (activeProduct.name.toLowerCase().includes('pdam') || activeProduct.name.toLowerCase().includes('air'));

  // Perhitungan Subtotal
  let ppobTotal = 0;
  let isPpobValid = false;
  let ppobVariant: ProductVariant | null = null;

  if (isPulsa) {
    const chosen = PULSA_OPTIONS.find((p) => p.nominal === selectedPulsaNominal) || PULSA_OPTIONS[6];
    ppobTotal = chosen.price;
    const cleanPhone = pulsaPhone.replace(/[^0-9]/g, '');
    isPpobValid = cleanPhone.length >= 10;
    const op = detectOperator(pulsaPhone);
    ppobVariant = {
      id: `pulsa-${chosen.nominal}-${cleanPhone}`,
      name: `Pulsa ${chosen.nominal.toLocaleString('id-ID')} (${op.name})`,
      sublabel: `No: ${cleanPhone} (Admin Rp2.000)`,
      price: chosen.price,
      multiplier: 1,
    };
  } else if (isListrik) {
    const cleanMeter = plnMeter.replace(/[^0-9]/g, '');
    isPpobValid = cleanMeter.length >= 10;
    if (plnType === 'token') {
      const chosen = PLN_TOKEN_OPTIONS.find((t) => t.nominal === selectedPlnToken) || PLN_TOKEN_OPTIONS[1];
      ppobTotal = chosen.price;
      ppobVariant = {
        id: `pln-token-${chosen.nominal}-${cleanMeter}`,
        name: `Token Listrik ${chosen.nominal.toLocaleString('id-ID')}`,
        sublabel: `No. Meter: ${cleanMeter} (Admin Rp2.000)`,
        price: chosen.price,
        multiplier: 1,
      };
    } else {
      ppobTotal = 2500;
      ppobVariant = {
        id: `pln-tagihan-${cleanMeter}`,
        name: `Tagihan Listrik PLN Pascabayar`,
        sublabel: `ID Pel: ${cleanMeter}${plnName ? ` a.n. ${plnName.trim()}` : ''} (Admin Rp2.500)`,
        price: 2500,
        multiplier: 1,
      };
    }
  } else if (isPDAM) {
    const cleanPdam = pdamNumber.trim();
    isPpobValid = cleanPdam.length >= 4;
    ppobTotal = 2500;
    ppobVariant = {
      id: `pdam-${cleanPdam}`,
      name: `Tagihan Air PDAM Bulanan`,
      sublabel: `No: ${cleanPdam} (${pdamArea})${pdamName ? ` a.n. ${pdamName.trim()}` : ''} (Admin Rp2.500)`,
      price: 2500,
      multiplier: 1,
    };
  }

  const subtotal = isPPOB ? ppobTotal : activeProduct.price * quantity;
  const totalItemCount = isPPOB ? 1 : quantity;
  const exceedsStock = !isPPOB && totalItemCount > stock;

  const handleAddToCart = () => {
    if (isOutOfStock && !isPPOB) return;

    if (isPPOB) {
      if (!isPpobValid || !ppobVariant) return;
      addToCart(activeProduct, ppobVariant, 1);
      setJustAdded(true);
      setTimeout(() => {
        setJustAdded(false);
        setIsCartOpen(true);
      }, 600);
      return;
    }

    if (exceedsStock) return;
    addToCart(activeProduct, defaultVariant, quantity);
    setJustAdded(true);
    setTimeout(() => {
      setJustAdded(false);
      setIsCartOpen(true);
    }, 600);
  };

  const detectedOp = detectOperator(pulsaPhone);

  return (
    <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
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
              {isPPOB ? 'LAYANAN DIGITAL PPOB WADIRA' : 'DETAIL PRODUK & PEMBELIAN'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {isPPOB ? 'Pembayaran & Pengisian Digital' : activeProduct.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {isPPOB 
                ? 'Layanan pulsa elektrik, token listrik & tagihan resmi diproses instan oleh kasir fisik warung.'
                : 'Cek stok fisik di warung, sesuaikan jumlah belanja, dan masukkan ke keranjang belanja.'}
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

      {/* ======================================================== */}
      {/* KHUSUS LAYANAN DIGITAL PPOB                             */}
      {/* ======================================================== */}
      {isPPOB && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 md:p-10 shadow-xs space-y-6">
          {/* Top Header Badge & Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                {activeProduct.categoryLabel || activeProduct.category || 'Layanan Digital'}
              </span>
              <span className="text-xs font-medium text-slate-400">
                PPOB Resmi
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold bg-emerald-50/80 border-emerald-200 text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Layanan Digital Siap Diproses (Online)</span>
            </div>
          </div>

          {/* Product Title & Description */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {activeProduct.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
              {activeProduct.description || 'Isi pulsa, token listrik, atau bayar tagihan air bulanan secara mudah dan cepat.'}
            </p>
          </div>

          {/* KHUSUS PPOB 1: PULSA ALL OPERATOR */}
          {isPulsa && (
            <div className="space-y-5 pt-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Nomor Handphone Tujuan
                  </label>
                  {pulsaPhone.trim().length >= 4 && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${detectedOp.color}`}>
                      {detectedOp.name}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={pulsaPhone}
                    onChange={(e) => setPulsaPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm font-semibold tracking-wide text-slate-900 transition"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Mendukung semua operator: Telkomsel, Indosat, XL, Axis, Tri, dan Smartfren.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Pilih Nominal Pulsa</span>
                  <span className="text-[11px] font-semibold text-emerald-700">
                    + Biaya Admin Rp2.000
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {PULSA_OPTIONS.map((opt) => {
                    const isSelected = selectedPulsaNominal === opt.nominal;
                    return (
                      <div
                        key={opt.nominal}
                        onClick={() => setSelectedPulsaNominal(opt.nominal)}
                        className={`relative p-3.5 rounded-2xl cursor-pointer transition-all duration-150 flex flex-col justify-between ${
                          isSelected
                            ? 'border-2 border-emerald-600 bg-[#f2f7ec] shadow-xs'
                            : 'border border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/50'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-600 text-white" />
                          </div>
                        )}
                        <div className="font-extrabold text-neutral-900 text-sm">
                          {(opt.nominal / 1000).toLocaleString('id-ID')} rb
                        </div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">
                          Rp{opt.nominal.toLocaleString('id-ID')}
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-neutral-200/60">
                          <span className="text-xs font-black text-emerald-800">
                            Rp{opt.price.toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Nominal Pulsa</span>
                  <span className="font-semibold text-slate-900">
                    Rp{selectedPulsaNominal.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Biaya Layanan Admin</span>
                  <span className="font-semibold text-slate-900">Rp2.000</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Total Pembayaran</span>
                  <span className="text-xl font-black text-emerald-900">
                    Rp{ppobTotal.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* KHUSUS PPOB 2: LISTRIK PLN */}
          {isListrik && (
            <div className="space-y-5 pt-2">
              <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPlnType('token')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    plnType === 'token'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>Token Listrik (Prabayar)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlnType('tagihan')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    plnType === 'tagihan'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Tagihan Listrik Bulanan</span>
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  {plnType === 'token' ? 'Nomor Meter / ID Pelanggan PLN' : 'ID Pelanggan Listrik Pascabayar'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={plnMeter}
                    onChange={(e) => setPlnMeter(e.target.value)}
                    placeholder="Masukkan 11-12 digit No. Meter PLN"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm font-semibold tracking-wide text-slate-900 transition"
                  />
                </div>
              </div>

              {plnType === 'token' ? (
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Pilih Nominal Token</span>
                    <span className="text-[11px] font-semibold text-emerald-700">+ Admin Rp2.000</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {PLN_TOKEN_OPTIONS.map((opt) => {
                      const isSelected = selectedPlnToken === opt.nominal;
                      return (
                        <div
                          key={opt.nominal}
                          onClick={() => setSelectedPlnToken(opt.nominal)}
                          className={`relative p-3 rounded-2xl cursor-pointer transition-all duration-150 flex flex-col justify-between ${
                            isSelected
                              ? 'border-2 border-emerald-600 bg-[#f2f7ec] shadow-xs'
                              : 'border border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/50'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2 text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-600 text-white" />
                            </div>
                          )}
                          <div className="font-extrabold text-neutral-900 text-sm">
                            Rp{opt.nominal.toLocaleString('id-ID')}
                          </div>
                          <div className="text-[11px] text-neutral-500 mt-0.5">
                            Stroom Token 20 Digit
                          </div>
                          <div className="mt-2 pt-1.5 border-t border-neutral-200/60">
                            <span className="text-xs font-black text-emerald-800">
                              Rp{opt.price.toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Nama Pemilik Rekening (Opsional)
                    </label>
                    <input
                      type="text"
                      value={plnName}
                      onChange={(e) => setPlnName(e.target.value)}
                      placeholder="Contoh: Bpk. Bambang"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 text-sm font-medium text-slate-900"
                    />
                  </div>
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>
                      Tagihan rekening bulanan akan dicek jumlah kwh pemakaiannya oleh kasir warung. Masukkan ID pelanggan untuk proses verifikasi.
                    </span>
                  </div>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Jenis Transaksi</span>
                  <span className="font-semibold text-slate-900">
                    {plnType === 'token' ? `Token Listrik Rp${selectedPlnToken.toLocaleString('id-ID')}` : 'Tagihan Listrik Bulanan'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Biaya Admin Loket</span>
                  <span className="font-semibold text-slate-900">
                    {plnType === 'token' ? 'Rp2.000' : 'Rp2.500'}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Total Pembayaran</span>
                  <span className="text-xl font-black text-emerald-900">
                    Rp{ppobTotal.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* KHUSUS PPOB 3: PDAM */}
          {isPDAM && (
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Nomor Sambungan / ID Pelanggan PDAM
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Droplet className="w-4 h-4 text-cyan-600" />
                  </div>
                  <input
                    type="text"
                    value={pdamNumber}
                    onChange={(e) => setPdamNumber(e.target.value)}
                    placeholder="Masukkan No. Pelanggan PDAM"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm font-semibold tracking-wide text-slate-900 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Wilayah PDAM
                  </label>
                  <select
                    value={pdamArea}
                    onChange={(e) => setPdamArea(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 text-xs font-semibold text-slate-800 bg-white"
                  >
                    <option value="PDAM Kab. Bangkalan">PDAM Kab. Bangkalan / Kamal</option>
                    <option value="PDAM Kota Surabaya">PDAM Kota Surabaya</option>
                    <option value="PDAM Kab. Sampang">PDAM Kab. Sampang</option>
                    <option value="PDAM Kab. Pamekasan">PDAM Kab. Pamekasan</option>
                    <option value="PDAM Kab. Sumenep">PDAM Kab. Sumenep</option>
                    <option value="PDAM Wilayah Lainnya">PDAM Wilayah Lainnya</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Nama Pemilik Rekening Air
                  </label>
                  <input
                    type="text"
                    value={pdamName}
                    onChange={(e) => setPdamName(e.target.value)}
                    placeholder="Contoh: Bpk. Supardi"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 text-xs font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-950 text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
                <span>
                  Jumlah pemakaian air bulanan akan diverifikasi secara daring oleh kasir fisik Toko Wadira sebelum status lunas dicatat.
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Layanan</span>
                  <span className="font-semibold text-slate-900">Pembayaran Tagihan Air PDAM</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Biaya Admin Loket</span>
                  <span className="font-semibold text-slate-900">Rp2.500</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Total Pembayaran Awal</span>
                  <span className="text-xl font-black text-emerald-900">
                    Rp{ppobTotal.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action CTA Button PPOB */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <button
              onClick={handleAddToCart}
              type="button"
              disabled={!isPpobValid}
              className={`w-full py-4 px-6 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-xs transition active:scale-[0.99] ${
                !isPpobValid
                  ? 'bg-neutral-200 text-neutral-400 border border-neutral-300 cursor-not-allowed'
                  : justAdded
                    ? 'bg-[#d4f952] text-neutral-950 border border-[#c4ec3e] cursor-pointer'
                    : 'bg-[#d4f952] hover:bg-[#c4ec3e] text-neutral-950 border border-[#c4ec3e] cursor-pointer'
              }`}
            >
              {justAdded ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Berhasil dimasukkan ke keranjang!</span>
                </>
              ) : !isPpobValid ? (
                <span>
                  {isPulsa 
                    ? 'Masukkan Nomor Handphone Terlebih Dahulu' 
                    : isListrik 
                      ? 'Masukkan Nomor Meter / ID PLN Terlebih Dahulu' 
                      : 'Masukkan Nomor Sambungan PDAM Terlebih Dahulu'}
                </span>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  <span>Lanjut Pesan {isPulsa ? 'Pulsa' : isListrik ? 'Listrik' : 'Tagihan PDAM'}</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-slate-500 text-center">
              Setelah pesanan dibuat, kasir Toko Wadira akan langsung memproses pengisian secara digital.
            </p>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* KHUSUS PRODUK KELONTONG FISIK (Layout Detail Fokus)      */}
      {/* ======================================================== */}
      {!isPPOB && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            {/* Top Metadata & Stock Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#f6fbe9] text-emerald-900 border border-[#d6ecb3]">
                  <Tag className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{activeProduct.categoryLabel || activeProduct.category || 'Katalog Warung'}</span>
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                  Satuan: {activeProduct.unit || 'pcs'}
                </span>
                {activeProduct.brand && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                    Merek: {activeProduct.brand}
                  </span>
                )}
              </div>

              <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold ${
                isOutOfStock
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : isLowStock
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
              }`}>
                {isOutOfStock ? (
                  <>
                    <Ban className="w-3.5 h-3.5 text-rose-600" />
                    <span>Stok Habis</span>
                  </>
                ) : isLowStock ? (
                  <>
                    <Package className="w-3.5 h-3.5 text-amber-600" />
                    <span>Tersisa {stock} {activeProduct.unit || 'pcs'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Stok Tersedia: {stock} {activeProduct.unit || 'pcs'}</span>
                  </>
                )}
              </div>
            </div>

            {/* Title, Desc & Store Info */}
            <div className="space-y-2.5">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {activeProduct.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                {activeProduct.description || 'Pilihan tepat untuk kebutuhan harian keluarga dan dapur Anda.'}
              </p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600 pt-1">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Store className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Tersedia langsung di Toko Wadira</span>
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Produk original &amp; berkualitas</span>
                </span>
              </div>
            </div>

              {/* Price Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#f8faf4] to-white border border-[#e2edd4] flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Harga Satuan
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      Rp {activeProduct.price.toLocaleString('id-ID')}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      / {activeProduct.unit || 'pcs'}
                    </span>
                  </div>
                </div>
                <div className="hidden sm:block text-right">
                  <span className="inline-block px-3 py-1 rounded-full bg-[#cbf14e]/40 border border-[#cbf14e] text-[#1c240d] text-xs font-bold">
                    Harga Resmi Warung
                  </span>
                </div>
              </div>

              {/* Quantity Stepper & Quick Pills */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Atur Jumlah Belanja
                  </label>
                  <span className="text-xs text-slate-400">
                    Maks: {stock} {activeProduct.unit || 'pcs'}
                  </span>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
                  {/* Stepper */}
                  <div className="flex items-center border border-slate-200 rounded-2xl bg-slate-50/50 p-1">
                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                      disabled={quantity <= 1 || isOutOfStock}
                      className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={stock}
                      value={quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 1) {
                          setQuantity(Math.min(val, Math.max(1, stock)));
                        }
                      }}
                      disabled={isOutOfStock}
                      className="w-16 text-center text-base font-black text-slate-900 bg-transparent focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => Math.min(stock, prev + 1))}
                      disabled={isOutOfStock || quantity >= stock}
                      className="w-10 h-10 rounded-xl bg-[#cbf14e] hover:bg-[#bef03b] text-[#1c240d] font-bold shadow-2xs flex items-center justify-center active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quick Quantity Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[1, 2, 5, 10].map((num) => {
                      if (stock > 0 && num > stock && num !== 1) return null;
                      const isCurrent = quantity === num;
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setQuantity(num)}
                          disabled={isOutOfStock || num > stock}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                            isCurrent
                              ? 'bg-[#1c240d] text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {num} {activeProduct.unit || 'pcs'}
                        </button>
                      );
                    })}
                    {stock > 5 && (
                      <button
                        type="button"
                        onClick={() => setQuantity(stock)}
                        disabled={isOutOfStock}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                          quantity === stock
                            ? 'bg-[#1c240d] text-white shadow-xs'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        Semua ({stock})
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Total Calculation Display */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 block">
                    Subtotal Pembelian
                  </span>
                  <span className="text-xs text-slate-400">
                    {quantity} {activeProduct.unit || 'pcs'} &times; Rp {activeProduct.price.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight">
                    Rp {subtotal.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {exceedsStock && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Jumlah ({quantity} {activeProduct.unit || 'pcs'}) melebihi stok yang tersedia ({stock} {activeProduct.unit || 'pcs'}).</span>
                </div>
              )}
            </div>

            {/* CTA Button & Guarantees */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <button
                onClick={handleAddToCart}
                type="button"
                disabled={isOutOfStock || exceedsStock}
                className={`w-full py-4 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xs transition active:scale-[0.99] ${
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

              {/* 3 Trust Badges */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                  <Truck className="w-4 h-4 mx-auto text-emerald-800 mb-1" />
                  <p className="text-[10px] font-bold text-slate-700">Ambil / Antar</p>
                  <p className="text-[9px] text-slate-400">Langsung di warung</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                  <CreditCard className="w-4 h-4 mx-auto text-emerald-800 mb-1" />
                  <p className="text-[10px] font-bold text-slate-700">Bayar Mudah</p>
                  <p className="text-[9px] text-slate-400">Tunai, QRIS, Kasbon</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                  <ShieldCheck className="w-4 h-4 mx-auto text-emerald-800 mb-1" />
                  <p className="text-[10px] font-bold text-slate-700">Stok Valid</p>
                  <p className="text-[9px] text-slate-400">Tersinkron kasir</p>
                </div>
              </div>
            </div>
          </div>
      )}

      <Footer />
      <CartDrawer />
    </div>
  );
}

export default function ProductDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  return <ProductDetailContent productId={resolvedParams.id} />;
}
