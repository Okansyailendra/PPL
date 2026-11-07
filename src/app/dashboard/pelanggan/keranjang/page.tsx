'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CartProvider, useCart } from '@/context/CartContext';
import Sidebar from '@/components/pembeli/Sidebar';
import TopHeader from '@/components/pembeli/TopHeader';
import Footer from '@/components/pembeli/Footer';
import CartDrawer from '@/components/pembeli/CartDrawer';
import { ProductVariant } from '@/types';
import { 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingBag, 
  ChevronRight, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Check, 
  Truck, 
  Store, 
  ShieldCheck, 
  RotateCcw, 
  Send, 
  User, 
  Phone, 
  MapPin, 
  Banknote, 
  CreditCard, 
  BookOpen, 
  FileText,
  X 
} from 'lucide-react';

function KeranjangContent() {
  const {
    cart,
    totalItems,
    totalPrice,
    updateQuantity,
    updateVariant,
    removeFromCart,
    clearCart,
    fulfillmentType,
    setFulfillmentType,
  } = useCart();

  // Active step in checkout workflow: 1: Keranjang, 2: Pengiriman & Identitas, 3: Tinjau & WhatsApp
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form data pemesan
  const [customerName, setCustomerName] = useState('Bu Siti');
  const [customerPhone, setCustomerPhone] = useState('089516201846');
  const [customerAddress, setCustomerAddress] = useState('Melati • Blok B No. 7');
  const [customerNote, setCustomerNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'kasbon'>('cash');
  const [validationError, setValidationError] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Toko WA
  // Nomor WhatsApp Toko Wadira Resmi
  const WARUNG_WA_NUMBER = '6289516201846';
  const WARUNG_NAME = 'Toko Wadira (Warung Madura)';

  // Load profile from LocalStorage if available
  useEffect(() => {
    try {
      const savedInfo = localStorage.getItem('warung_customer_profile');
      if (savedInfo) {
        const parsed = JSON.parse(savedInfo);
        if (parsed.name) setCustomerName(parsed.name);
        if (parsed.phone) setCustomerPhone(parsed.phone);
        if (parsed.address) setCustomerAddress(parsed.address);
      }
    } catch {
      // ignore
    }
  }, []);

  const totalKinds = cart.length;
  const deliveryFee = fulfillmentType === 'delivery' ? 5000 : 0;
  const grandTotal = totalPrice + deliveryFee;

  // Check if cart has galon
  const hasGalon = cart.some(
    (item) => item.product.name.toLowerCase().includes('galon') || item.product.unit === 'galon'
  );

  const handleCheckoutWA = () => {
    if (cart.length === 0) return;

    if (!customerName.trim()) {
      setValidationError('Silakan isi Nama Pemesan.');
      setCurrentStep(2);
      return;
    }

    // Save profile to LocalStorage
    try {
      localStorage.setItem(
        'warung_customer_profile',
        JSON.stringify({
          name: customerName.trim(),
          phone: customerPhone.trim(),
          address: customerAddress.trim(),
        })
      );
    } catch {
      // ignore
    }

    const now = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const formattedDate = `${days[now.getDay()]}, ${String(now.getDate()).padStart(2, '0')} ${months[now.getMonth()]} ${now.getFullYear()} - ${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')} WIB`;

    const orderItemsText = cart
      .map((item, index) => {
        const itemPrice = item.selectedVariant ? item.selectedVariant.price : item.product.price;
        const unit = item.selectedVariant ? item.selectedVariant.name : (item.product.unit || 'pcs');
        const subtotal = itemPrice * item.quantity;
        const variantSuffix = item.selectedVariant ? ` (${item.selectedVariant.name})` : '';
        return `${index + 1}. *${item.product.name}${variantSuffix}*\n   ${item.quantity} ${unit} x Rp ${itemPrice.toLocaleString('id-ID')} = *Rp ${subtotal.toLocaleString('id-ID')}*`;
      })
      .join('\n');

    const fulfillmentLabel =
      fulfillmentType === 'delivery'
        ? 'Antar ke Rumah / Kos (Ongkir Rp 5.000)'
        : 'Ambil Sendiri di Warung (Gratis)';

    const paymentLabel =
      paymentMethod === 'cash'
        ? 'Bayar Tunai (Cash / COD saat barang diterima)'
        : paymentMethod === 'qris'
        ? 'Transfer / QRIS'
        : 'Catat Kasbon (Pelanggan Langganan Warung)';

    const formattedMessage = `*PESANAN BELANJA BARU*
*Toko:* ${WARUNG_NAME}
----------------------------------------
_${formattedDate}_

*DATA PEMESAN:*
- *Nama:* ${customerName.trim()}
${customerPhone.trim() ? `- *No. HP/WA:* ${customerPhone.trim()}\n` : ''}- *Metode:* ${fulfillmentLabel}
${fulfillmentType === 'delivery' ? `- *Alamat Pengantaran:* ${customerAddress.trim() || 'Sesuai info chat'}\n` : ''}- *Pembayaran:* ${paymentLabel}
${customerNote.trim() ? `- *Catatan:* _"${customerNote.trim()}"_\n` : ''}
*RINCIAN BARANG:*
${orderItemsText}
----------------------------------------
*Subtotal Barang:* Rp ${totalPrice.toLocaleString('id-ID')}
${fulfillmentType === 'delivery' ? `*Ongkir Antar:* Rp 5.000\n` : ''}*TOTAL ESTIMASI: Rp ${grandTotal.toLocaleString('id-ID')}*
(${totalItems} unit dari ${totalKinds} jenis barang)

_Halo Kasir ${WARUNG_NAME}, saya mau order kebutuhan belanja di atas ya. Mohon dicek ketersediaan stoknya. Terima kasih!_`;

    const encodedMessage = encodeURIComponent(formattedMessage);

    // Smart Device Detection: Desktop -> WhatsApp Web, Mobile -> wa.me
    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const waUrl = isMobile
      ? `https://wa.me/${WARUNG_WA_NUMBER}?text=${encodedMessage}`
      : `https://web.whatsapp.com/send?phone=${WARUNG_WA_NUMBER}&text=${encodedMessage}`;

    window.open(waUrl, '_blank');
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
          {/* Page Heading & Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest block mb-1">
                PESANAN BARU
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Keranjang belanja saya
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Cek barang, satuan, dan jumlahnya dulu. Jangan sampai ada yang ketinggalan.
              </p>
            </div>

            <Link
              href="/dashboard/pelanggan"
              className="self-start sm:self-auto px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-emerald-700" />
              <span>Tambah belanjaan</span>
            </Link>
          </div>

          {/* Stepper Progress Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {/* Step 1 */}
              <button
                onClick={() => setCurrentStep(1)}
                className="flex items-center gap-2.5 group cursor-pointer"
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                    currentStep === 1
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : currentStep > 1
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {currentStep > 1 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '1'}
                </div>
                <span
                  className={`text-xs font-bold ${
                    currentStep === 1 ? 'text-slate-900' : 'text-slate-500'
                  }`}
                >
                  Keranjang
                </span>
              </button>

              <div
                className={`flex-1 h-0.5 mx-3 ${
                  currentStep >= 2 ? 'bg-emerald-600' : 'bg-slate-200'
                }`}
              />

              {/* Step 2 */}
              <button
                onClick={() => cart.length > 0 && setCurrentStep(2)}
                disabled={cart.length === 0}
                className="flex items-center gap-2.5 group cursor-pointer disabled:cursor-not-allowed"
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                    currentStep === 2
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : currentStep > 2
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {currentStep > 2 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '2'}
                </div>
                <span
                  className={`text-xs font-bold ${
                    currentStep === 2 ? 'text-slate-900' : 'text-slate-500'
                  }`}
                >
                  Pengiriman &amp; Identitas
                </span>
              </button>

              <div
                className={`flex-1 h-0.5 mx-3 ${
                  currentStep >= 3 ? 'bg-emerald-600' : 'bg-slate-200'
                }`}
              />

              {/* Step 3 */}
              <button
                onClick={() => cart.length > 0 && setCurrentStep(3)}
                disabled={cart.length === 0}
                className="flex items-center gap-2.5 group cursor-pointer disabled:cursor-not-allowed"
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                    currentStep === 3
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  3
                </div>
                <span
                  className={`text-xs font-bold ${
                    currentStep === 3 ? 'text-slate-900' : 'text-slate-500'
                  }`}
                >
                  Tinjau &amp; WhatsApp
                </span>
              </button>
            </div>
          </div>

          {/* Empty Cart State */}
          {cart.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-xl mx-auto space-y-4 shadow-xs">
              <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                <ShoppingBag className="w-10 h-10 stroke-1" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Keranjang belanja Anda masih kosong</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                  Belum ada barang kebutuhan yang dipilih. Yuk cek etalase warung dan pilih barang belanja harian Anda.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/dashboard/pelanggan"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Mulai Belanja di Etalase</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* ================= LEFT COLUMN ================= */}
              <div className="lg:col-span-8 space-y-5">
                {/* STEP 1: TABEL KERANJANG (Sesuai Figma 1:1) */}
                {currentStep === 1 && (
                  <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
                    {/* Header Card */}
                    <div className="p-5 md:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
                      <div className="flex items-center gap-2.5">
                        <ShoppingBag className="w-5 h-5 text-emerald-800" />
                        <h2 className="font-extrabold text-slate-900 text-base">
                          Barang pilihan Bu Siti
                        </h2>
                      </div>
                      <span className="text-xs px-3 py-1 rounded-full font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                        {totalKinds} jenis barang
                      </span>
                    </div>

                    {/* Table Header Bar */}
                    <div className="px-6 py-2.5 bg-slate-50/90 border-b border-slate-200/70 grid grid-cols-12 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <div className="col-span-6 sm:col-span-7">PRODUK &amp; SATUAN</div>
                      <div className="col-span-3 sm:col-span-2 text-center">JUMLAH</div>
                      <div className="col-span-3 sm:col-span-3 text-right">SUBTOTAL</div>
                    </div>

                    {/* Item Rows */}
                    <div className="divide-y divide-slate-100 px-4 md:px-6">
                      {cart.map((item) => {
                        const itemPrice = item.selectedVariant
                          ? item.selectedVariant.price
                          : item.product.price;
                        const subtotal = itemPrice * item.quantity;
                        const itemKey = `${item.product.id}-${item.selectedVariant?.id || 'default'}`;

                        // Available variants for this product
                        const availableVariants = item.product.variants || [
                          {
                            id: 'default',
                            name: item.product.unit || 'Satuan',
                            sublabel: `1 ${item.product.unit || 'pcs'}`,
                            price: item.product.price,
                            multiplier: 1,
                          },
                        ];

                        return (
                          <div
                            key={itemKey}
                            className="py-4 grid grid-cols-12 gap-3 items-center group"
                          >
                            {/* Product & Variant Selector */}
                            <div className="col-span-6 sm:col-span-7 flex items-center gap-3 min-w-0">
                              <div className="relative w-14 h-14 rounded-xl bg-slate-50 border border-slate-200/70 overflow-hidden shrink-0 flex items-center justify-center">
                                <Image
                                  src={item.product.image || '/assets/logo.png'}
                                  alt={item.product.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>

                              <div className="min-w-0 flex-1 space-y-1">
                                <Link
                                  href={`/dashboard/pelanggan/produk/${item.product.id}`}
                                  className="font-bold text-slate-900 text-sm leading-tight block truncate hover:text-emerald-800 transition"
                                >
                                  {item.product.name}
                                </Link>

                                {/* Dropdown Pilihan Satuan */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {item.product.variants && item.product.variants.length > 0 ? (
                                    <select
                                      value={item.selectedVariant?.id || item.product.variants[0]?.id}
                                      onChange={(e) => {
                                        const newV = item.product.variants?.find(
                                          (v) => v.id === e.target.value
                                        );
                                        if (newV) {
                                          updateVariant(
                                            item.product.id,
                                            item.selectedVariant?.id,
                                            newV
                                          );
                                        }
                                      }}
                                      className="text-xs font-semibold py-1 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                                    >
                                      {item.product.variants.map((v) => (
                                        <option key={v.id} value={v.id}>
                                          {v.name} • {v.sublabel} (Rp{v.price.toLocaleString('id-ID')})
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                                      {item.product.unit || 'Satuan'}
                                    </span>
                                  )}

                                  <span className="text-[11px] text-slate-400 font-medium">
                                    Rp{itemPrice.toLocaleString('id-ID')} / {item.selectedVariant?.name || item.product.unit || 'pcs'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Stepper Jumlah */}
                            <div className="col-span-3 sm:col-span-2 flex items-center justify-center">
                              <div className="flex items-center border border-slate-200 rounded-xl bg-white shadow-2xs p-0.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuantity(
                                      item.product.id,
                                      item.quantity - 1,
                                      item.selectedVariant?.id
                                    )
                                  }
                                  className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-lg transition active:scale-90"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-7 text-center text-xs font-extrabold text-slate-900">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuantity(
                                      item.product.id,
                                      item.quantity + 1,
                                      item.selectedVariant?.id
                                    )
                                  }
                                  className="w-7 h-7 flex items-center justify-center text-emerald-800 hover:bg-emerald-50 rounded-lg transition active:scale-90"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Subtotal & Delete */}
                            <div className="col-span-3 sm:col-span-3 flex items-center justify-end gap-2 text-right">
                              <span className="text-sm font-extrabold text-slate-900">
                                Rp{subtotal.toLocaleString('id-ID')}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  removeFromCart(item.product.id, item.selectedVariant?.id)
                                }
                                className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition"
                                title="Hapus dari keranjang"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Bottom Status Banner */}
                    <div className="px-6 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                        <CheckCircle2 className="w-4 h-4 fill-emerald-600 text-white" />
                        <span>Semua barang tersedia • Diperbarui 09.41 WIB</span>
                      </div>
                      <button
                        onClick={clearCart}
                        className="text-[11px] font-semibold text-slate-400 hover:text-red-600 transition"
                      >
                        Kosongkan keranjang
                      </button>
                    </div>
                  </div>
                )}

                {/* Callout Info Galon (Sesuai Figma) */}
                {currentStep === 1 && hasGalon && (
                  <div className="bg-[#EBF7F4] border border-emerald-200/70 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-slate-900">
                        Pesan galon? Siapkan galon kosongnya, ya.
                      </h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Harga Aqua Rp22.000 berlaku untuk tukar galon kosong berlabel Aqua. Beri tahu kasir jika belum punya galon atau membawa galon merek berbeda.
                      </p>
                    </div>
                  </div>
                )}

                {/* STEP 2: FORM PENGIRIMAN & IDENTITAS */}
                {currentStep === 2 && (
                  <div className="bg-white rounded-3xl border border-slate-200/90 p-6 md:p-8 shadow-xs space-y-6">
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900">
                        Langkah 2: Pilih Metode Pengiriman &amp; Identitas
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Tentukan cara menerima pesanan dan pastikan alamat serta nama sudah sesuai.
                      </p>
                    </div>

                    {validationError && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-600">
                        {validationError}
                      </div>
                    )}

                    {/* Radio Pilihan Ambil Sendiri vs Antar Rumah */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Metode Pengambilan
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div
                          onClick={() => setFulfillmentType('pickup')}
                          className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                            fulfillmentType === 'pickup'
                              ? 'border-2 border-emerald-600 bg-emerald-50/20 shadow-xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                            <Store className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">
                              Ambil Sendiri di Warung
                            </div>
                            <div className="text-xs font-bold text-emerald-700">Gratis</div>
                            <p className="text-[11px] text-slate-500 mt-1">
                              Kasir menyiapkan pesanan. Ambil setelah mendapat konfirmasi dari kasir Toko Wadira.
                            </p>
                          </div>
                        </div>

                        <div
                          onClick={() => setFulfillmentType('delivery')}
                          className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                            fulfillmentType === 'delivery'
                              ? 'border-2 border-emerald-600 bg-emerald-50/20 shadow-xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                            <Truck className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">
                              Antar ke Rumah / Kos
                            </div>
                            <div className="text-xs font-bold text-emerald-700">+ Rp5.000</div>
                            <p className="text-[11px] text-slate-500 mt-1">
                              Diantar pihak warung dalam radius 1 km. Estimasi 30–60 menit.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Form Identitas: Hanya Nama Pemesan (Nomor WA pengirim otomatis dari akun WhatsApp pembeli) */}
                    <div className="pt-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nama Pemesan <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Cth: Bu Rohmah / Pak Budi"
                          className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#d4f952] focus:border-neutral-900 bg-white"
                        />
                      </div>
                    </div>

                    {/* Alamat Pengantaran jika Antar */}
                    {fulfillmentType === 'delivery' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Alamat Pengantaran / Patokan Rumah
                        </label>
                        <div className="relative">
                          <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <textarea
                            rows={2}
                            value={customerAddress}
                            onChange={(e) => setCustomerAddress(e.target.value)}
                            placeholder="Cth: Melati • Blok B No. 7 (Pagar hitam samping musholla)"
                            className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white resize-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Pilihan Metode Bayar */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Metode Pembayaran
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('cash')}
                          className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                            paymentMethod === 'cash'
                              ? 'border-emerald-600 bg-emerald-50/25 font-bold text-slate-900 shadow-2xs'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Banknote className="w-4 h-4 text-emerald-700 shrink-0" />
                          <div className="text-xs">Tunai / COD</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMethod('qris')}
                          className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                            paymentMethod === 'qris'
                              ? 'border-emerald-600 bg-emerald-50/25 font-bold text-slate-900 shadow-2xs'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <CreditCard className="w-4 h-4 text-emerald-700 shrink-0" />
                          <div className="text-xs">Transfer / QRIS</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMethod('kasbon')}
                          className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                            paymentMethod === 'kasbon'
                              ? 'border-emerald-600 bg-emerald-50/25 font-bold text-slate-900 shadow-2xs'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <BookOpen className="w-4 h-4 text-amber-600 shrink-0" />
                          <div className="text-xs">Catat Kasbon</div>
                        </button>
                      </div>
                    </div>

                    {/* Catatan Tambahan */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Catatan Pesanan (Opsional)
                      </label>
                      <div className="relative">
                        <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={customerNote}
                          onChange={(e) => setCustomerNote(e.target.value)}
                          placeholder="Cth: Titip di teras jika rumah sepi, terima kasih"
                          className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                        />
                      </div>
                    </div>

                    {/* Tombol Navigasi Step 2 */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition flex items-center gap-1.5"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Kembali ke Keranjang</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!customerName.trim()) {
                            setValidationError('Nama Pemesan wajib diisi.');
                            return;
                          }
                          setValidationError('');
                          setCurrentStep(3);
                        }}
                        className="px-5 py-2.5 rounded-xl bg-[#d4f952] hover:bg-[#c4ec3e] text-neutral-950 font-bold text-xs border border-[#c4ec3e] shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Lanjut ke Tinjau &amp; WhatsApp</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: TINJAU & SIAP KIRIM KE WHATSAPP */}
                {currentStep === 3 && (
                  <div className="bg-white rounded-3xl border border-neutral-200/90 p-6 md:p-8 shadow-xs space-y-6">
                    <div>
                      <h2 className="text-lg font-black text-neutral-950">
                        Langkah 3: Tinjau &amp; Kirim Pesanan
                      </h2>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Pesanan Anda sudah siap dikirimkan langsung ke kasir WhatsApp Toko Wadira.
                      </p>
                    </div>

                    {/* Ringkasan Data Pemesan */}
                    <div className="p-4 rounded-2xl bg-[#f2f7ec] border border-[#e2edd8] space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Pemesan:</span>
                        <span className="font-bold text-neutral-950">{customerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Metode:</span>
                        <span className="font-bold text-neutral-950">
                          {fulfillmentType === 'delivery' ? '🛵 Antar ke Rumah (+Rp5.000)' : '🏪 Ambil di Warung (Gratis)'}
                        </span>
                      </div>
                      {fulfillmentType === 'delivery' && (
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Alamat:</span>
                          <span className="font-bold text-neutral-950 text-right">{customerAddress}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Pembayaran:</span>
                        <span className="font-bold text-neutral-950 capitalize">
                          {paymentMethod === 'cash' ? 'Tunai / COD' : paymentMethod === 'qris' ? 'Transfer / QRIS' : 'Catat Kasbon'}
                        </span>
                      </div>
                    </div>

                    {/* Preview Rekap Barang */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                        Rincian {totalKinds} Jenis Barang ({totalItems} unit):
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {cart.map((item, idx) => {
                          const itemPrice = item.selectedVariant ? item.selectedVariant.price : item.product.price;
                          const subtotal = itemPrice * item.quantity;
                          return (
                            <div key={idx} className="flex justify-between text-xs p-2 rounded-lg bg-neutral-50 border border-neutral-100">
                              <span className="text-neutral-800">
                                {idx + 1}. {item.product.name} {item.selectedVariant ? `(${item.selectedVariant.name})` : ''} x {item.quantity}
                              </span>
                              <span className="font-bold text-neutral-950">Rp{subtotal.toLocaleString('id-ID')}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tombol Kirim WhatsApp Utama */}
                    <div className="pt-3 border-t border-neutral-100 space-y-2">
                      <button
                        onClick={handleCheckoutWA}
                        className="w-full py-4 px-6 rounded-xl bg-[#d4f952] hover:bg-[#c4ec3e] text-neutral-950 font-black text-sm border border-[#c4ec3e] shadow-xs flex items-center justify-center gap-2.5 transition active:scale-[0.99] cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>Kirim Pesanan ke WhatsApp Toko Wadira</span>
                      </button>

                      <div className="flex justify-between items-center pt-2">
                        <button
                          type="button"
                          onClick={() => setCurrentStep(2)}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Ubah data pengiriman</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCurrentStep(1)}
                          className="text-xs font-semibold text-emerald-700 hover:underline"
                        >
                          Ubah rincian belanja
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ================= RIGHT COLUMN (Ringkasan Belanja) ================= */}
              <div className="lg:col-span-4 space-y-4">
                {/* Card 1: Ringkasan Belanja (Sesuai Figma 1:1) */}
                <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
                  <div className="space-y-0.5">
                    <h3 className="font-extrabold text-slate-900 text-base">
                      Ringkasan belanja
                    </h3>
                    <span className="text-[11px] font-bold text-emerald-800 block">
                      {totalKinds} jenis • {totalItems} unit pesanan
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs pt-1 border-t border-slate-100">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal barang</span>
                      <span className="font-bold text-slate-800">
                        Rp{totalPrice.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-600">
                      <span>Ongkos antar</span>
                      <span className="text-slate-500 font-medium">
                        {currentStep === 1
                          ? 'Pilih di langkah berikutnya'
                          : fulfillmentType === 'delivery'
                          ? 'Rp5.000'
                          : 'Gratis'}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Total belanja</span>
                      <span className="text-2xl font-black text-emerald-900 tracking-tight">
                        Rp{grandTotal.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* Action Button: Dynamic depending on Step */}
                  <div className="pt-1">
                    {currentStep === 1 ? (
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="w-full py-3.5 px-4 bg-[#0F4A3C] hover:bg-[#0c3c31] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99] cursor-pointer"
                      >
                        <span>Pilih ambil atau antar</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : currentStep === 2 ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!customerName.trim()) {
                            setValidationError('Nama Pemesan wajib diisi.');
                            return;
                          }
                          setValidationError('');
                          setCurrentStep(3);
                        }}
                        className="w-full py-3.5 px-4 bg-[#0F4A3C] hover:bg-[#0c3c31] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99] cursor-pointer"
                      >
                        <span>Tinjau Pesanan</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleCheckoutWA}
                        className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 transition active:scale-[0.99] cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>Kirim ke WhatsApp</span>
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                    Harga dan ketersediaan stok definitif masih dikonfirmasi kasir di WhatsApp.
                  </p>
                </div>

                {/* Card 2: Belanja sesuai kebutuhan (Sesuai Figma 1:1) */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-2">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">
                        Belanja sesuai kebutuhan
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                        Ubah satuan di tiap produk. Harga otomatis mengikuti eceran, renteng, atau dus yang dipilih.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                    Berikutnya: pilih cara menerima belanjaan dan lengkapi identitas singkat.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <Footer />
        </main>
      </div>

      {/* Slide-over Cart Drawer */}
      <CartDrawer />
    </div>
  );
}

export default function KeranjangPage() {
  return <KeranjangContent />;
}
