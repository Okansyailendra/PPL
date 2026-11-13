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
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris'>('cash');
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Nomor WhatsApp Warung Tujuan (Nomor pemilik Toko Wadira)
  const WARUNG_WA_NUMBER = '6289516201846';
  const WARUNG_NAME = 'Toko Wadira (Warung Madura)';

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

  const handleCheckoutWA = async () => {
    if (cart.length === 0 || isSubmitting) return;

    if (!customerName.trim()) {
      setValidationError('Silakan isi Nama Pemesan terlebih dahulu.');
      return;
    }

    setValidationError('');
    setIsSubmitting(true);

    // 1. Catat profil pemesan ke LocalStorage untuk kenyamanan belanja berikutnya
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

    let generatedOrderId = '';

    // 2. Kirim pesanan ke database penjual secara real-time
    try {
      const orderPayload = {
        customer: {
          name: customerName.trim(),
          phone: customerPhone.trim(),
          address: customerAddress.trim(),
          notes: customerNote.trim(),
        },
        items: cart.map((item) => ({
          productId: item.product.id,
          name: item.product.name + (item.selectedVariant ? ` (${item.selectedVariant.name})` : ''),
          quantity: item.quantity,
          price: item.selectedVariant ? item.selectedVariant.price : item.product.price,
          unit: item.selectedVariant ? item.selectedVariant.name : (item.product.unit || 'pcs'),
        })),
        fulfillmentType,
        paymentMethod,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || 'Gagal menyimpan pesanan');
      }

      generatedOrderId = resJson.orderId || '';
    } catch (err: any) {
      console.warn('Pencatatan order ke database gagal, tetap membuka WhatsApp:', err);
    }

    // 3. Susun Tanggal dan waktu pesanan
    const now = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const formattedDate = `${days[now.getDay()]}, ${String(now.getDate()).padStart(2, '0')} ${months[now.getMonth()]} ${now.getFullYear()} - ${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')} WIB`;

    // Susun Rincian Belanja
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
        : 'Transfer / QRIS';

    // 4. FORMAT TEMPLATE PESAN WHATSAPP
    const formattedMessage = `*PESANAN BELANJA BARU*
*Toko:* ${WARUNG_NAME}
${generatedOrderId ? `*No. Pesanan:* \`#${generatedOrderId}\`\n` : ''}----------------------------------------
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

${generatedOrderId ? `✅ _Pesanan sudah tercatat di sistem kasir Toko Wadira (\`#${generatedOrderId}\`)._\n` : ''}_Halo Kasir ${WARUNG_NAME}, saya mau pesan barang di atas ya. Mohon segera diproses. Terima kasih!_`;

    const encodedMessage = encodeURIComponent(formattedMessage);

    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const waUrl = isMobile
      ? `https://wa.me/${WARUNG_WA_NUMBER}?text=${encodedMessage}`
      : `https://web.whatsapp.com/send?phone=${WARUNG_WA_NUMBER}&text=${encodedMessage}`;

    setIsSubmitting(false);
    clearCart();
    setIsCartOpen(false);

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

                {/* Nama Pemesan */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    Nama Pemesan <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cth: Bu Siti / Pak Budi"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        if (validationError) setValidationError('');
                      }}
                      className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-neutral-200 focus:outline-hidden focus:ring-2 focus:ring-[#d4f952] focus:border-neutral-900 bg-white"
                    />
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
                      className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        fulfillmentType === 'pickup'
                          ? 'bg-neutral-950 text-white border-neutral-950 shadow-xs'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      <Store className="w-3.5 h-3.5 text-[#d4f952]" />
                      <span>Ambil Sendiri</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFulfillmentType('delivery')}
                      className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        fulfillmentType === 'delivery'
                          ? 'bg-neutral-950 text-white border-neutral-950 shadow-xs'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      <Truck className="w-3.5 h-3.5 text-[#d4f952]" />
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
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] font-bold border transition text-center cursor-pointer ${
                        paymentMethod === 'cash'
                          ? 'bg-[#d4f952] border-[#c4ec3e] text-neutral-950 shadow-xs'
                          : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      <Banknote className="w-4 h-4 mb-0.5 text-neutral-900" />
                      <span>Tunai / COD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('qris')}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] font-bold border transition text-center cursor-pointer ${
                        paymentMethod === 'qris'
                          ? 'bg-[#d4f952] border-[#c4ec3e] text-neutral-950 shadow-xs'
                          : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 mb-0.5 text-neutral-900" />
                      <span>QRIS / TF</span>
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
          <div className="p-4 border-t border-neutral-200/80 bg-[#fbfbf9] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-neutral-500 block font-medium">Total Pembayaran ({totalItems} item)</span>
                <span className="text-xl font-black text-neutral-950">
                  Rp {totalPrice.toLocaleString('id-ID')}
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-[#f2f7ec] border border-[#e2edd8] px-2.5 py-1 rounded-full">
                {fulfillmentType === 'delivery' ? '🛵 Antar ke Rumah' : '🏪 Ambil di Warung'}
              </span>
            </div>

            <button
              onClick={handleCheckoutWA}
              type="button"
              disabled={isSubmitting}
              className="w-full py-4 px-4 bg-[#d4f952] hover:bg-[#c4ec3e] border border-[#c4ec3e] text-neutral-950 font-black text-sm rounded-xl flex items-center justify-center gap-2.5 shadow-xs active:scale-[0.99] transition cursor-pointer disabled:opacity-60"
            >
              <Send className={`w-4 h-4 ${isSubmitting ? 'animate-pulse' : ''}`} />
              <span>{isSubmitting ? 'Mencatat Pesanan & Menyiapkan WhatsApp...' : 'Kirim Pesanan ke WhatsApp Toko Wadira'}</span>
            </button>
            <p className="text-[11px] text-center text-neutral-400">
              Format rincian belanja otomatis disiapkan untuk dikirim ke chat WhatsApp kasir Wadira.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
