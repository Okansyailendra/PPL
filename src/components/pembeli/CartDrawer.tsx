'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import MidtransPaymentModal, { type MidtransChargeData } from '@/components/pembeli/MidtransPaymentModal';
import type { PaymentChannel } from '@/lib/midtrans';
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
  FileText,
  Lock,
  Clock,
  Calendar,
  BookOpen,
  CheckCircle2
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
  const [kasbonDueDate, setKasbonDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPayChannel, setSelectedPayChannel] = useState<PaymentChannel>('qris');
  const [activeCharge, setActiveCharge] = useState<MidtransChargeData | null>(null);
  const [paidSuccessInfo, setPaidSuccessInfo] = useState<{
    orderId: string;
    totalAmount: number;
    waUrl: string;
  } | null>(null);

  // Nomor WhatsApp Warung Tujuan (Nomor pemilik Toko Wadira)
  const WARUNG_WA_NUMBER = '6289516201846';
  const WARUNG_NAME = 'Toko Wadira (Warung Madura)';

  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Muat data pemesan dari LocalStorage jika pernah belanja sebelumnya & cek login
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

    async function checkSession() {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        const data = await res.json();
        if (data?.success && data?.user) {
          setIsLoggedIn(true);
          if (data.user.owner_name) {
            setCustomerName((prev) => prev || data.user.owner_name);
          }
          if (data.user.phone_number) {
            setCustomerPhone((prev) => prev || data.user.phone_number);
          }
        } else {
          setIsLoggedIn(false);
        }
      } catch {
        // ignore
      }
    }
    if (isCartOpen) {
      checkSession();
    }
  }, [isCartOpen]);

  // Jika opsi kirim dipilih, otomatis ubah metode bayar ke non-tunai (Transfer / QRIS)
  useEffect(() => {
    if (fulfillmentType === 'delivery' && paymentMethod === 'cash') {
      setPaymentMethod('qris');
    }
  }, [fulfillmentType, paymentMethod]);

  // Reset layar sukses bayar ketika barang baru ditambahkan lagi ke keranjang
  useEffect(() => {
    if (cart.length > 0 && paidSuccessInfo) {
      setPaidSuccessInfo(null);
    }
  }, [cart.length, paidSuccessInfo]);

  if (!isCartOpen && !activeCharge) return null;

  const buildWaUrl = (message: string) => {
    const encoded = encodeURIComponent(message);
    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    return isMobile
      ? `https://wa.me/${WARUNG_WA_NUMBER}?text=${encoded}`
      : `https://web.whatsapp.com/send?phone=${WARUNG_WA_NUMBER}&text=${encoded}`;
  };

  const handlePayWithMidtrans = async () => {
    if (cart.length === 0 || isSubmitting) return;

    if (!isLoggedIn) {
      setIsCartOpen(false);
      router.push('/login?redirect=/dashboard/pelanggan/keranjang');
      return;
    }

    if (!customerName.trim()) {
      setValidationError('Silakan isi Nama Pemesan terlebih dahulu.');
      return;
    }

    if (fulfillmentType === 'delivery' && !customerAddress.trim()) {
      setValidationError('Alamat pengiriman wajib diisi.');
      return;
    }

    setValidationError('');
    setIsSubmitting(true);

    const finalName = customerName.trim();
    const finalPhone = customerPhone.trim() || '08123456789';

    try {
      localStorage.setItem(
        'warung_customer_profile',
        JSON.stringify({
          name: finalName,
          phone: customerPhone.trim(),
          address: customerAddress.trim(),
        })
      );
    } catch {
      // ignore
    }

    try {
      const res = await fetch('/api/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentChannel: selectedPayChannel,
          items: cart.map((it) => ({
            productId: it.product.id,
            name: `${it.product.name}${it.selectedVariant ? ` (${it.selectedVariant.name})` : ''}`,
            price: it.selectedVariant ? it.selectedVariant.price : it.product.price,
            quantity: it.quantity,
            unit: it.selectedVariant ? it.selectedVariant.name : (it.product.unit || 'pcs'),
          })),
          customer: {
            name: finalName,
            phone: finalPhone,
            address: customerAddress.trim() || 'Alamat warung',
          },
          shipping: {
            courier: fulfillmentType === 'delivery' ? 'Kurir Toko' : 'Ambil di Toko',
            service: fulfillmentType === 'delivery' ? 'Antar Cepat' : 'Self-Pickup',
            cost: 0,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.orderId) {
        throw new Error(data.error || 'Gagal membuat tagihan pembayaran');
      }

      const itemsSnapshot = cart.map((it, idx) => {
        const price = it.selectedVariant ? it.selectedVariant.price : it.product.price;
        const unit = it.selectedVariant ? it.selectedVariant.name : (it.product.unit || 'pcs');
        const variantSuffix = it.selectedVariant ? ` (${it.selectedVariant.name})` : '';
        return `${idx + 1}. ${it.product.name}${variantSuffix} (${it.quantity} ${unit} = Rp ${(price * it.quantity).toLocaleString('id-ID')})`;
      });
      const paidTotal = Number(data.grossAmount || totalPrice);
      const paidWaMsg = `Halo Kasir ${WARUNG_NAME}, saya atas nama *${finalName}* (${finalPhone}) sudah *MEMBAYAR LUNAS via ${data.channelLabel || 'QRIS/Transfer'}* untuk pesanan *#${data.orderId}*:\n\n${itemsSnapshot.join('\n')}\n\nTotal Dibayar: *Rp ${paidTotal.toLocaleString('id-ID')}*\nPengambilan: ${fulfillmentType === 'delivery' ? `Dikirim (${customerAddress.trim() || 'Sesuai alamat'})` : 'Ambil Sendiri di Warung'}${customerNote.trim() ? `\nCatatan: ${customerNote.trim()}` : ''}\n\nMohon diproses ya. Terima kasih!`;

      setActiveCharge({
        orderId: data.orderId,
        grossAmount: paidTotal,
        paymentChannel: data.paymentChannel || selectedPayChannel,
        channelLabel: data.channelLabel || 'QRIS / Virtual Account',
        qrImageUrl: data.qrImageUrl || null,
        qrString: data.qrString || null,
        vaNumber: data.vaNumber || null,
        bank: data.bank || null,
        expiryTime: data.expiryTime || null,
        waUrl: buildWaUrl(paidWaMsg),
      });
    } catch (err: any) {
      setValidationError(err?.message || 'Gagal memproses pembayaran online.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckoutWA = async () => {
    if (paymentMethod === 'qris') {
      await handlePayWithMidtrans();
      return;
    }
    if (cart.length === 0 || isSubmitting) return;

    if (!isLoggedIn) {
      setIsCartOpen(false);
      router.push('/login?redirect=/dashboard/pelanggan/keranjang');
      return;
    }

    if (!customerName.trim()) {
      setValidationError('Silakan isi Nama Pemesan terlebih dahulu.');
      return;
    }

    if (paymentMethod === 'kasbon') {
      if (!customerPhone.trim()) {
        setValidationError('Nomor WhatsApp / HP wajib diisi untuk pengajuan kasbon.');
        return;
      }
      if (fulfillmentType === 'delivery' && !customerAddress.trim()) {
        setValidationError('Alamat pengiriman wajib diisi.');
        return;
      }
      if (!kasbonDueDate) {
        setValidationError('Rencana tanggal pelunasan wajib diisi.');
        return;
      }
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
        dueDate: paymentMethod === 'kasbon' ? kasbonDueDate : undefined,
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

      if (paymentMethod === 'kasbon') {
        setIsSubmitting(false);
        clearCart();
        setIsCartOpen(false);
        router.push('/dashboard/pelanggan/kasbon');
        return;
      }
    } catch (err: any) {
      if (paymentMethod === 'kasbon') {
        setValidationError(err?.message || 'Gagal mengajukan kasbon pesanan.');
        setIsSubmitting(false);
        return;
      }
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
        ? 'Dikirim ke Rumah / Kos (Kurir / Ojol Lokal)'
        : 'Ambil Sendiri di Warung (Gratis)';

    // Label Metode Pembayaran
    const paymentLabel =
      fulfillmentType === 'delivery'
        ? 'Transfer / QRIS (Menunggu info total + ongkir dari penjual)'
        : paymentMethod === 'cash'
        ? 'Bayar Tunai di Warung'
        : 'Transfer / QRIS';

    // 4. FORMAT TEMPLATE PESAN WHATSAPP
    const formattedMessage = `*PESANAN BELANJA BARU*
*Toko:* ${WARUNG_NAME}
${generatedOrderId ? `*No. Pesanan:* \`#${generatedOrderId}\`\n` : ''}----------------------------------------
_${formattedDate}_

*DATA PEMESAN:*
- *Nama:* ${customerName.trim()}
${customerPhone.trim() ? `- *No. HP/WA:* ${customerPhone.trim()}\n` : ''}- *Metode Pengambilan:* ${fulfillmentLabel}
${fulfillmentType === 'delivery' ? `- *Alamat Pengantaran:* ${customerAddress.trim() || 'Sesuai info chat'}\n` : ''}- *Metode Pembayaran:* ${paymentLabel}
${customerNote.trim() ? `- *Catatan:* _"${customerNote.trim()}"_\n` : ''}
*RINCIAN BARANG:*
${orderItemsText}
----------------------------------------
*Subtotal Barang:* Rp ${totalPrice.toLocaleString('id-ID')}
${fulfillmentType === 'delivery' ? `*Ongkos Kirim:* _Akan dicek oleh penjual via ojol lokal_\n*TOTAL BELANJA:* Rp ${totalPrice.toLocaleString('id-ID')} *(+ ongkir ojol)*\n` : `*TOTAL BELANJA:* Rp ${totalPrice.toLocaleString('id-ID')}\n`}(${totalItems} barang)

${generatedOrderId ? `✅ _Pesanan sudah tercatat di sistem kasir Toko Wadira (\`#${generatedOrderId}\`)._\n` : ''}${fulfillmentType === 'delivery' 
  ? `_Halo Kasir ${WARUNG_NAME}, saya mau pesan barang di atas untuk dikirim. Mohon dicek ketersediaan stok dan konfirmasi total belanja + tarif ojol ke alamat saya agar bisa langsung saya transfer. Terima kasih!_`
  : `_Halo Kasir ${WARUNG_NAME}, saya mau pesan barang di atas untuk diambil di warung. Mohon segera diproses. Terima kasih!_`}`;

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

  const closeDrawer = () => {
    setPaidSuccessInfo(null);
    setIsCartOpen(false);
  };

  return (
    <>
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          {/* Backdrop click to close */}
          <div className="flex-1" onClick={closeDrawer} />

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
              <div className="flex items-center gap-1.5">
                <Link
                  href="/dashboard/pelanggan/keranjang"
                  onClick={closeDrawer}
                  className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition"
                >
                  Halaman Keranjang &rarr;
                </Link>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-[11px] font-semibold text-slate-400 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 transition"
                    title="Kosongkan Keranjang"
                  >
                    Kosongkan
                  </button>
                )}
                <button
                  onClick={closeDrawer}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                  aria-label="Tutup Keranjang"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {paidSuccessInfo ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <div className="space-y-1.5 max-w-sm">
                    <span className="inline-block px-3 py-0.5 rounded-full bg-[#cbf14e]/50 text-[#1c240d] text-[11px] font-extrabold uppercase tracking-wider">
                      Pembayaran Terkonfirmasi
                    </span>
                    <h4 className="text-lg font-black text-slate-900">
                      Pembayaran Berhasil Dilunasi!
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Pesanan <span className="font-mono font-bold text-slate-700">#{paidSuccessInfo.orderId}</span> sebesar{' '}
                      <span className="font-bold text-slate-800">
                        Rp {paidSuccessInfo.totalAmount.toLocaleString('id-ID')}
                      </span>{' '}
                      sudah lunas. Sekarang Anda dapat mengirim rincian pesanan ke WhatsApp kasir.
                    </p>
                  </div>

                  <div className="w-full max-w-sm space-y-2.5 pt-2">
                    <a
                      href={paidSuccessInfo.waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 px-4 bg-[#d4f952] hover:bg-[#c4ec3e] border border-[#c4ec3e] text-neutral-950 font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-xs transition"
                    >
                      <Send className="w-4 h-4" />
                      <span>Kirim Pesanan ke WhatsApp Toko Wadira</span>
                    </a>
                    <Link
                      href={`/dashboard/pelanggan/struk?search=${encodeURIComponent(paidSuccessInfo.orderId)}`}
                      onClick={closeDrawer}
                      className="w-full py-2.5 px-4 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center transition"
                    >
                      Lihat Struk Transaksi
                    </Link>
                    <button
                      type="button"
                      onClick={closeDrawer}
                      className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                    >
                      Tutup &amp; Belanja Lagi
                    </button>
                  </div>
                </div>
              ) : cart.length === 0 ? (
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

                      {item.product.category === 'Tagihan & Pulsa' ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            1x transaksi
                          </span>
                          <button
                            onClick={() => removeFromCart(item.product.id, item.selectedVariant?.id)}
                            className="text-slate-300 hover:text-red-500 transition p-1.5 rounded-md hover:bg-red-50"
                            title="Hapus layanan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
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
                      )}
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

                {/* Nama & No HP Pemesan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                      Nama Pemesan <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Cth: Pak Budi"
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          if (validationError) setValidationError('');
                        }}
                        className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-neutral-200 focus:outline-hidden focus:ring-2 focus:ring-[#d4f952] focus:border-neutral-900 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                      No. WhatsApp / HP {paymentMethod === 'kasbon' && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        placeholder="08xxxxxxxxxx"
                        value={customerPhone}
                        onChange={(e) => {
                          setCustomerPhone(e.target.value);
                          if (validationError) setValidationError('');
                        }}
                        className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-neutral-200 focus:outline-hidden focus:ring-2 focus:ring-[#d4f952] focus:border-neutral-900 bg-white"
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
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        fulfillmentType === 'pickup'
                          ? 'bg-neutral-950 text-white border-neutral-950 shadow-xs'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-[#d4f952]" />
                        <span>Ambil Sendiri</span>
                      </div>
                      <span className="text-[10px] font-normal opacity-80 mt-0.5">Gratis di Warung</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFulfillmentType('delivery');
                        if (paymentMethod === 'cash') setPaymentMethod('qris');
                      }}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        fulfillmentType === 'delivery'
                          ? 'bg-neutral-950 text-white border-neutral-950 shadow-xs'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-[#d4f952]" />
                        <span>Dikirim (Ojol)</span>
                      </div>
                      <span className="text-[10px] font-normal opacity-80 mt-0.5">Ongkir dicek penjual</span>
                    </button>
                  </div>
                </div>

                {/* Input Alamat jika pilih Antar */}
                {fulfillmentType === 'delivery' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Alamat / Patokan Rumah <span className="text-red-500">*</span>
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
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Alamat digunakan penjual untuk mengecek tarif kurir / ojol lokal.
                    </p>
                  </div>
                )}

                {/* Pilihan Metode Bayar */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-600">
                    Metode Pembayaran
                  </label>
                  {fulfillmentType === 'delivery' ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
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
                          <span>Transfer / QRIS</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('kasbon')}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] font-bold border transition text-center cursor-pointer ${
                            paymentMethod === 'kasbon'
                              ? 'bg-[#d4f952] border-[#c4ec3e] text-neutral-950 shadow-xs'
                              : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                          }`}
                        >
                          <BookOpen className="w-4 h-4 mb-0.5 text-neutral-900" />
                          <span>Kasbon (Izin)</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        Tunai/COD ditiadakan untuk pengiriman ojol lokal. Ongkir dikonfirmasi via WA.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
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
                        <span>Tunai</span>
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
                        <span>QRIS</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('kasbon')}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] font-bold border transition text-center cursor-pointer ${
                          paymentMethod === 'kasbon'
                            ? 'bg-[#d4f952] border-[#c4ec3e] text-neutral-950 shadow-xs'
                            : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                        }`}
                      >
                        <BookOpen className="w-4 h-4 mb-0.5 text-neutral-900" />
                        <span>Kasbon (Izin)</span>
                      </button>
                    </div>
                  )}

                  {paymentMethod === 'qris' && (
                    <div className="p-2.5 rounded-xl bg-[#f4f8ed] border border-[#d6e5c5] space-y-2">
                      <div className="text-[11px] font-bold text-[#2b3617]">
                        Pilih Metode Pembayaran Online
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(
                          [
                            { id: 'qris', title: 'QRIS', sub: 'E-Wallet / Mobile' },
                            { id: 'bca_va', title: 'BCA VA', sub: 'Virtual Account' },
                            { id: 'bni_va', title: 'BNI VA', sub: 'Virtual Account' },
                            { id: 'bri_va', title: 'BRI VA', sub: 'Virtual Account' },
                          ] as { id: PaymentChannel; title: string; sub: string }[]
                        ).map((ch) => {
                          const active = selectedPayChannel === ch.id;
                          return (
                            <button
                              key={ch.id}
                              type="button"
                              onClick={() => setSelectedPayChannel(ch.id)}
                              className={`p-2 rounded-lg text-left border transition cursor-pointer ${
                                active
                                  ? 'bg-[#465427] border-[#465427] text-white shadow-2xs'
                                  : 'bg-white border-neutral-200 text-neutral-800 hover:border-[#465427]/50'
                              }`}
                            >
                              <div className="text-[11px] font-extrabold leading-tight">{ch.title}</div>
                              <div className={`text-[9px] mt-0.5 ${active ? 'text-white/80' : 'text-neutral-500'}`}>
                                {ch.sub}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-[#354614] leading-relaxed">
                        Pembayaran harus dilunasi terlebih dahulu sebelum pesanan dapat dikirim ke WhatsApp kasir.
                      </p>
                    </div>
                  )}

                  {paymentMethod === 'kasbon' && (
                    <div className="p-2.5 rounded-xl bg-[#eef5db] border border-[#d6e5b4] space-y-2 text-[11px]">
                      <div className="text-[#354614] font-medium leading-relaxed">
                        Pengajuan kasbon belanja ini membutuhkan persetujuan kasir warung terlebih dahulu.
                      </div>
                      <div>
                        <label className="block font-bold text-[#2b3617] mb-1">
                          Rencana Pelunasan *
                        </label>
                        <div className="relative">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="date"
                            min={new Date().toISOString().split('T')[0]}
                            value={kasbonDueDate}
                            onChange={(e) => setKasbonDueDate(e.target.value)}
                            className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-lg border border-[#c9dcb0] bg-white focus:outline-hidden"
                          />
                        </div>
                      </div>
                    </div>
                  )}
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
                <span className="text-xs text-neutral-500 block font-medium">Total Belanja ({totalItems} item)</span>
                <span className="text-xl font-black text-neutral-950">
                  Rp {totalPrice.toLocaleString('id-ID')}
                </span>
                {fulfillmentType === 'delivery' && (
                  <span className="text-[10px] text-amber-700 block font-medium">
                    (+ ongkir ojol dikonfirmasi via WA)
                  </span>
                )}
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-[#f2f7ec] border border-[#e2edd8] px-2.5 py-1 rounded-full">
                {fulfillmentType === 'delivery' ? (
                  <>
                    <Truck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Dikirim (Ojol Lokal)</span>
                  </>
                ) : (
                  <>
                    <Store className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Ambil di Warung</span>
                  </>
                )}
              </span>
            </div>

            {!isLoggedIn && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-center gap-1.5 font-medium text-center">
                <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Wajib masuk dengan Google untuk checkout pesanan.</span>
              </div>
            )}

            <button
              onClick={paymentMethod === 'qris' ? handlePayWithMidtrans : handleCheckoutWA}
              type="button"
              disabled={isSubmitting}
              className={`w-full py-4 px-4 font-black text-sm rounded-xl flex items-center justify-center gap-2.5 shadow-xs active:scale-[0.99] transition cursor-pointer disabled:opacity-60 ${
                paymentMethod === 'qris'
                  ? 'bg-[#0F4A3C] hover:bg-[#0b392e] border border-[#0F4A3C] text-white'
                  : 'bg-[#d4f952] hover:bg-[#c4ec3e] border border-[#c4ec3e] text-neutral-950'
              }`}
            >
              {paymentMethod === 'kasbon' ? (
                <>
                  <Clock className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
                  <span>{isSubmitting ? 'Mengirim Pengajuan Kasbon...' : 'Ajukan Kasbon Pesanan Ini'}</span>
                </>
              ) : paymentMethod === 'qris' ? (
                <>
                  <CreditCard className={`w-4 h-4 ${isSubmitting ? 'animate-pulse' : ''}`} />
                  <span>
                    {isSubmitting
                      ? 'Membuat Tagihan Pembayaran...'
                      : selectedPayChannel === 'qris'
                        ? 'Bayar Sekarang via QRIS'
                        : `Bayar Sekarang via ${selectedPayChannel.replace('_va', '').toUpperCase()} VA`}
                  </span>
                </>
              ) : (
                <>
                  <Send className={`w-4 h-4 ${isSubmitting ? 'animate-pulse' : ''}`} />
                  <span>{isSubmitting ? 'Mencatat Pesanan & Menyiapkan WhatsApp...' : 'Kirim Pesanan ke WhatsApp Toko Wadira'}</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-neutral-400">
              {paymentMethod === 'kasbon'
                ? 'Pengajuan kasbon tercatat di Buku Piutang kasir dan statusnya dapat dipantau di halaman Kasbon.'
                : paymentMethod === 'qris'
                  ? 'Selesaikan pembayaran lebih dulu. Tombol kirim ke WhatsApp muncul otomatis setelah lunas.'
                  : 'Format rincian belanja otomatis disiapkan untuk dikirim ke chat WhatsApp kasir Wadira.'}
            </p>
          </div>
        )}
          </div>
        </div>
      )}

      {activeCharge && (
        <MidtransPaymentModal
          charge={activeCharge}
          onClose={() => setActiveCharge(null)}
          onPaidSuccess={(paidCharge) => {
            setActiveCharge(null);
            clearCart();
            setPaidSuccessInfo({
              orderId: paidCharge.orderId,
              totalAmount: paidCharge.grossAmount,
              waUrl: paidCharge.waUrl,
            });
          }}
        />
      )}
    </>
  );
}
