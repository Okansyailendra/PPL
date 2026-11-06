'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  Send, 
  ShoppingBag, 
  Truck, 
  Store, 
  CreditCard, 
  Banknote, 
  BookOpen, 
  MapPin, 
  Phone, 
  User, 
  FileText 
} from 'lucide-react';

export default function CartDrawer() {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    clearCart,
    totalPrice,
    totalItems,
    fulfillmentType,
    setFulfillmentType,
  } = useCart();

  // State form pemesan
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'kasbon'>('cash');
  const [validationError, setValidationError] = useState('');

  // Nomor WhatsApp Warung Tujuan (Bisa disesuaikan dengan nomor pemilik toko)
  const WARUNG_WA_NUMBER = '6289516201846';
  const WARUNG_NAME = 'AlinStore (Warung Sembako)';

  // Muat data pemesan dari LocalStorage jika pernah belanja sebelumnya
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

  if (!isCartOpen) return null;

  const handleCheckoutWA = () => {
    if (cart.length === 0) return;

    if (!customerName.trim()) {
      setValidationError('Silakan isi Nama Pemesan terlebih dahulu.');
      return;
    }

    setValidationError('');

    // Simpan profil pemesan ke LocalStorage untuk kenyamanan belanja berikutnya
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

    // Tanggal dan waktu pesanan
    const now = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const formattedDate = `${days[now.getDay()]}, ${String(now.getDate()).padStart(2, '0')} ${months[now.getMonth()]} ${now.getFullYear()} - ${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')} WIB`;

    // Susun Rincian Belanja (Gunakan teks standar tanpa simbol aneh agar tidak jadi tanda tanya)
    const orderItemsText = cart
      .map((item, index) => {
        const itemPrice = item.selectedVariant ? item.selectedVariant.price : item.product.price;
        const unit = item.selectedVariant ? item.selectedVariant.name : (item.product.unit || 'pcs');
        const subtotal = itemPrice * item.quantity;
        const variantSuffix = item.selectedVariant ? ` (${item.selectedVariant.name})` : '';
        return `${index + 1}. *${item.product.name}${variantSuffix}*\n   ${item.quantity} ${unit} x Rp ${itemPrice.toLocaleString('id-ID')} = *Rp ${subtotal.toLocaleString('id-ID')}*`;
      })
      .join('\n');

    // Label Metode Pengiriman
    const fulfillmentLabel =
      fulfillmentType === 'delivery'
        ? 'Antar ke Rumah / Kos'
        : 'Ambil Sendiri di Warung';

    // Label Metode Pembayaran
    const paymentLabel =
      paymentMethod === 'cash'
        ? 'Bayar Tunai (Cash / COD saat barang diterima)'
        : paymentMethod === 'qris'
        ? 'Transfer / QRIS'
        : 'Catat Kasbon (Pelanggan Langganan Warung)';

    // FORMAT TEMPLATE PESAN WHATSAPP (Bersih, rapi, bebas tanda tanya)
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
*TOTAL ESTIMASI: Rp ${totalPrice.toLocaleString('id-ID')}*
(${totalItems} barang)

_Halo Kasir ${WARUNG_NAME}, saya mau order kebutuhan belanja di atas ya. Mohon dicek ketersediaan stoknya. Terima kasih!_`;

    const encodedMessage = encodeURIComponent(formattedMessage);

    // Deteksi perangkat: Jika di HP buka aplikasi WA (wa.me), jika di Laptop/Desktop langsung buka WhatsApp Web (web.whatsapp.com) agar tidak muncul pop-up 'Choose Application' di Linux
    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const waUrl = isMobile
      ? `https://wa.me/${WARUNG_WA_NUMBER}?text=${encodedMessage}`
      : `https://web.whatsapp.com/send?phone=${WARUNG_WA_NUMBER}&text=${encodedMessage}`;

    // Buka WhatsApp di tab baru
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div className="flex-1" onClick={() => setIsCartOpen(false)} />

      {/* Cart Drawer Panel */}
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shadow-2xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base leading-tight">Keranjang Belanja</h3>
              <p className="text-xs text-slate-500">{totalItems} barang dipilih</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[11px] font-semibold text-slate-400 hover:text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition"
                title="Kosongkan Keranjang"
              >
                Kosongkan
              </button>
            )}
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              aria-label="Tutup Keranjang"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 mb-3">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <p className="font-bold text-slate-700 text-base">Keranjang Anda Kosong</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Pilih sembako dan kebutuhan harian dari etalase, lalu klik tombol tambah (+) untuk mulai belanja.
              </p>
            </div>
          ) : (
            <>
              {/* Daftar Barang */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                  <span>Daftar Barang</span>
                  <span>{totalItems} item</span>
                </div>
                {cart.map((item) => {
                  const itemPrice = item.selectedVariant ? item.selectedVariant.price : item.product.price;
                  const itemKey = `${item.product.id}-${item.selectedVariant?.id || 'default'}`;
                  return (
                    <div
                      key={itemKey}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-white shadow-2xs gap-3 hover:border-emerald-200 transition"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-slate-800 truncate">
                          {item.product.name}
                        </h4>
                        {item.selectedVariant && (
                          <span className="inline-block text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 my-0.5">
                            {item.selectedVariant.name} ({item.selectedVariant.sublabel})
                          </span>
                        )}
                        <p className="text-xs text-emerald-700 font-bold">
                          Rp {itemPrice.toLocaleString('id-ID')}
                          <span className="text-[11px] text-slate-400 font-normal"> / {item.selectedVariant?.name || item.product.unit || 'pcs'}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedVariant?.id)}
                          className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95 transition"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 text-center text-sm font-bold text-slate-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedVariant?.id)}
                          className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center hover:bg-emerald-100 active:scale-95 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id, item.selectedVariant?.id)}
                          className="ml-1 text-slate-300 hover:text-red-500 transition p-1.5 rounded-md hover:bg-red-50"
                          title="Hapus barang"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Form Data Pemesan */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 pt-3">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Informasi Pemesan</span>
                </div>

                {validationError && (
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-600">
                    {validationError}
                  </div>
                )}

                {/* Nama & No. HP */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Nama Pemesan <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Cth: Bu Siti"
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          if (validationError) setValidationError('');
                        }}
                        className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      No. WhatsApp / HP
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        placeholder="0812xxxxxxx"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Pilihan Metode Ambil / Antar */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Metode Pengambilan
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFulfillmentType('pickup')}
                      className={`flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-semibold border transition ${
                        fulfillmentType === 'pickup'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Store className="w-3.5 h-3.5" />
                      <span>Ambil Sendiri</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFulfillmentType('delivery')}
                      className={`flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-semibold border transition ${
                        fulfillmentType === 'delivery'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Antar ke Rumah</span>
                    </button>
                  </div>
                </div>

                {/* Input Alamat jika pilih Antar */}
                {fulfillmentType === 'delivery' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Alamat / Patokan Rumah
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                      <textarea
                        rows={2}
                        placeholder="Cth: Jl. Melati No. 12, RT 02 (Pagar hitam depan pos)"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Pilihan Metode Bayar */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Metode Pembayaran
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg text-[11px] font-semibold border transition text-center ${
                        paymentMethod === 'cash'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Banknote className="w-4 h-4 mb-0.5 text-emerald-700" />
                      <span>Tunai / COD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('qris')}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg text-[11px] font-semibold border transition text-center ${
                        paymentMethod === 'qris'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 mb-0.5 text-emerald-700" />
                      <span>QRIS / TF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('kasbon')}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg text-[11px] font-semibold border transition text-center ${
                        paymentMethod === 'kasbon'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                      title="Khusus warga langganan tetap warung"
                    >
                      <BookOpen className="w-4 h-4 mb-0.5 text-amber-600" />
                      <span>Catat Bon</span>
                    </button>
                  </div>
                </div>

                {/* Catatan Khusus */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Catatan Pesanan (Opsional)
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cth: Telurnya pilih yang besar, jangan pecah"
                      value={customerNote}
                      onChange={(e) => setCustomerNote(e.target.value)}
                      className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Checkout Bar */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block">Total Pembayaran ({totalItems} item)</span>
                <span className="text-xl font-extrabold text-slate-900">
                  Rp {totalPrice.toLocaleString('id-ID')}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full">
                {fulfillmentType === 'delivery' ? '🛵 Antar ke Rumah' : '🏪 Ambil di Warung'}
              </span>
            </div>

            <button
              onClick={handleCheckoutWA}
              className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2.5 shadow-md shadow-emerald-700/20 active:scale-[0.99] transition cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Kirim Pesanan ke WhatsApp Warung</span>
            </button>
            <p className="text-[11px] text-center text-slate-400">
              Format rincian belanja otomatis disiapkan untuk dikirim ke chat WhatsApp warung.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
