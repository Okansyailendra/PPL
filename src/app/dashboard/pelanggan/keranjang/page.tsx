'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CartProvider, useCart } from '@/context/CartContext';
import Footer from '@/components/pembeli/Footer';
import CartDrawer from '@/components/pembeli/CartDrawer';
import MidtransPaymentModal, { type MidtransChargeData } from '@/components/pembeli/MidtransPaymentModal';
import type { PaymentChannel } from '@/lib/midtrans';
import { ProductVariant, UserSession } from '@/types';
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
  FileText,
  Lock,
  LogIn,
  Clock,
  Calendar,
  BookOpen,
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

  // Alur checkout ringkas: 1: Keranjang, 2: Pengiriman & Identitas
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Status User & Modal Login
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Status Pesanan Berhasil
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Form data pemesan
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'kasbon'>('cash');
  const [selectedPayChannel, setSelectedPayChannel] = useState<PaymentChannel>('qris');
  const [activeCharge, setActiveCharge] = useState<MidtransChargeData | null>(null);
  const [kasbonDueDate, setKasbonDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [kasbonSuccessInfo, setKasbonSuccessInfo] = useState<{
    orderId: string;
    totalAmount: number;
    waUrl: string;
  } | null>(null);
  const [midtransSuccessInfo, setMidtransSuccessInfo] = useState<{
    orderId: string;
    totalAmount: number;
    waUrl: string;
  } | null>(null);
  const [validationError, setValidationError] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{ status: 'success' | 'pending' | 'error'; message: string; orderId?: string } | null>(null);

  // Cek sesi user yang sedang aktif
  useEffect(() => {
    async function checkAuthSession() {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        const data = await res.json();
        if (data?.success && data?.user) {
          setCurrentUser(data.user);
          if (data.user.owner_name) {
            setCustomerName((prev) => prev || data.user.owner_name);
          }
          if (data.user.phone_number) {
            setCustomerPhone((prev) => prev || data.user.phone_number);
          } else {
            setCustomerPhone((prev) => prev || '08123456789');
          }
        }
      } catch {
        // ignore
      }
    }
    checkAuthSession();
  }, []);

  // Jika opsi antar dipilih, paksa metode pembayaran menjadi Transfer / QRIS (non-tunai)
  useEffect(() => {
    if (fulfillmentType === 'delivery' && paymentMethod === 'cash') {
      setPaymentMethod('qris');
    }
  }, [fulfillmentType, paymentMethod]);

  // Toko WA
  // Nomor WhatsApp Toko Wadira Resmi
  const WARUNG_WA_NUMBER = '6289516201846';
  const WARUNG_NAME = 'Toko Wadira (Warung Madura)';

  const buildWaUrl = (message: string): string => {
    const encoded = encodeURIComponent(message);
    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    return isMobile
      ? `https://wa.me/${WARUNG_WA_NUMBER}?text=${encoded}`
      : `https://web.whatsapp.com/send?phone=${WARUNG_WA_NUMBER}&text=${encoded}`;
  };

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
  // Ongkos kirim tidak ditentukan di web, melainkan dikonfirmasi oleh penjual via ojol lokal
  const deliveryFee = 0;
  const grandTotal = totalPrice;

  // Check if cart has galon
  const hasGalon = cart.some(
    (item) => item.product.name.toLowerCase().includes('galon') || item.product.unit === 'galon'
  );

  const handleCheckoutWA = () => {
    if (cart.length === 0) return;

    if (!customerName.trim()) {
      setValidationError('Silakan isi Nama Pemesan.');
      return;
    }
    setValidationError('');

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
        ? 'Dikirim ke Rumah / Kos (Kurir / Ojol Lokal)'
        : 'Ambil Sendiri di Warung (Gratis)';

    const paymentLabel =
      fulfillmentType === 'delivery'
        ? 'Transfer / QRIS (Menunggu info total + ongkir dari penjual)'
        : paymentMethod === 'cash'
        ? 'Bayar Tunai di Warung'
        : 'Transfer / QRIS';

    const formattedMessage = `*PESANAN BELANJA BARU*
*Toko:* ${WARUNG_NAME}
----------------------------------------
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
${fulfillmentType === 'delivery' ? `*Ongkos Kirim:* _Akan dicek oleh penjual via ojol lokal_\n*TOTAL BELANJA:* Rp ${grandTotal.toLocaleString('id-ID')} *(+ ongkir ojol)*\n` : `*TOTAL BELANJA:* Rp ${grandTotal.toLocaleString('id-ID')}\n`}(${totalItems} unit dari ${totalKinds} jenis barang)

${fulfillmentType === 'delivery'
  ? `_Halo Kasir ${WARUNG_NAME}, saya mau pesan belanjaan di atas untuk dikirim. Mohon infokan ketersediaan stok beserta ongkos kirim ojol ke alamat saya agar bisa langsung saya transfer totalnya. Terima kasih!_`
  : `_Halo Kasir ${WARUNG_NAME}, saya mau order kebutuhan belanja di atas untuk diambil di warung. Mohon dicek ketersediaan stoknya. Terima kasih!_`}`;

    const waUrl = buildWaUrl(formattedMessage);

    window.open(waUrl, '_blank');

    // Kosongkan keranjang belanja agar saat belanja berikutnya keranjang bersih
    setKasbonSuccessInfo(null);
    setMidtransSuccessInfo(null);
    clearCart();
    setOrderSuccess(true);
    setCurrentStep(1);
  };

  const handleCheckoutKasbon = async () => {
    if (cart.length === 0 || isProcessingPayment) return;

    if (!customerName.trim()) {
      setValidationError('Nama Pemesan wajib diisi.');
      return;
    }
    if (!customerPhone.trim()) {
      setValidationError('Nomor WhatsApp / HP wajib diisi untuk pengajuan kasbon.');
      return;
    }
    if (fulfillmentType === 'delivery' && !customerAddress.trim()) {
      setValidationError('Alamat Pengantaran wajib diisi untuk pengiriman ke rumah.');
      return;
    }
    if (!kasbonDueDate) {
      setValidationError('Rencana tanggal pelunasan kasbon wajib dipilih.');
      return;
    }

    try {
      setIsProcessingPayment(true);
      setValidationError('');

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

      const itemsPayload = cart.map((it) => ({
        productId: it.product.id,
        name: `${it.product.name}${it.selectedVariant ? ` (${it.selectedVariant.name})` : ''}`,
        price: it.selectedVariant ? it.selectedVariant.price : it.product.price,
        quantity: it.quantity,
        unit: it.selectedVariant ? it.selectedVariant.name : (it.product.unit || 'pcs'),
      }));

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsPayload,
          customer: {
            name: customerName.trim(),
            phone: customerPhone.trim(),
            address: customerAddress.trim() || 'Ambil di Warung',
            note: customerNote.trim(),
          },
          fulfillmentType,
          paymentMethod: 'kasbon',
          dueDate: kasbonDueDate,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengajukan kasbon pesanan.');
      }

      const itemsText = itemsPayload
        .map((it, idx) => `${idx + 1}. ${it.name} (${it.quantity} ${it.unit})`)
        .join('\n');
      const waMsg = `Halo Kasir ${WARUNG_NAME}, saya atas nama *${customerName.trim()}* (${customerPhone.trim()}) baru saja mengajukan *KASBON BELANJA* (#${data.orderId}):\n\n${itemsText}\n\nTotal: *Rp ${Number(data.totalAmount || grandTotal).toLocaleString('id-ID')}*\nRencana Pelunasan: ${kasbonDueDate}\nMohon tinjauan dan persetujuannya. Terima kasih!`;
      const waUrl = buildWaUrl(waMsg);

      setMidtransSuccessInfo(null);
      setKasbonSuccessInfo({
        orderId: data.orderId,
        totalAmount: Number(data.totalAmount || grandTotal),
        waUrl,
      });
      clearCart();
      setOrderSuccess(true);
      setCurrentStep(1);
    } catch (err: any) {
      setValidationError(err?.message || 'Gagal mengajukan kasbon pesanan.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePayWithMidtrans = async () => {
    if (cart.length === 0) return;

    // Otomatis lengkapi nama & nomor HP jika pengguna belum sempat mengisinya
    const finalName = customerName.trim() || currentUser?.owner_name || 'Ainur Raftuzzaki';
    const finalPhone = customerPhone.trim() || currentUser?.phone_number || '08123456789';

    if (!customerName.trim()) {
      setCustomerName(finalName);
    }
    if (!customerPhone.trim()) {
      setCustomerPhone(finalPhone);
    }

    try {
      setIsProcessingPayment(true);
      setValidationError('');

      // Kirim request ke backend untuk membuat tagihan Midtrans Core API (QRIS / Virtual Account)
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
            cost: deliveryFee,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.orderId) {
        throw new Error(data.error || 'Gagal membuat tagihan pembayaran');
      }

      const snapItemsSnapshot = cart.map((it) => {
        const price = it.selectedVariant ? it.selectedVariant.price : it.product.price;
        const unit = it.selectedVariant ? it.selectedVariant.name : (it.product.unit || 'pcs');
        const variantSuffix = it.selectedVariant ? ` (${it.selectedVariant.name})` : '';
        return `${it.product.name}${variantSuffix} (${it.quantity} ${unit} = Rp ${(price * it.quantity).toLocaleString('id-ID')})`;
      });
      const paidTotal = Number(data.grossAmount || grandTotal);
      const paidWaMsg = `Halo Kasir ${WARUNG_NAME}, saya atas nama *${finalName}* (${finalPhone}) sudah *MEMBAYAR LUNAS via ${data.channelLabel || 'QRIS/Transfer'}* untuk pesanan *#${data.orderId}*:\n\n${snapItemsSnapshot.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}\n\nTotal Dibayar: *Rp ${paidTotal.toLocaleString('id-ID')}*\nPengambilan: ${fulfillmentType === 'delivery' ? `Dikirim (${customerAddress.trim() || 'Sesuai alamat'})` : 'Ambil Sendiri di Warung'}${customerNote.trim() ? `\nCatatan: ${customerNote.trim()}` : ''}\n\nMohon diproses ya. Terima kasih!`;
      const paidWaUrl = buildWaUrl(paidWaMsg);

      setPaymentResult({
        status: 'pending',
        message: 'Tagihan siap dibayar. Selesaikan pembayaran pada jendela di bawah.',
        orderId: data.orderId,
      });

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
        waUrl: paidWaUrl,
      });
    } catch (err: any) {
      console.error('Midtrans Checkout Error:', err);
      setValidationError(err?.message || 'Terjadi kesalahan sistem pembayaran.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
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
                onClick={() => {
                  if (cart.length === 0) return;
                  if (!currentUser) {
                    setShowLoginModal(true);
                    return;
                  }
                  setCurrentStep(2);
                }}
                disabled={cart.length === 0}
                className="flex items-center gap-2.5 group cursor-pointer disabled:cursor-not-allowed"
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                    currentStep === 2
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  2
                </div>
                <span
                  className={`text-xs font-bold ${
                    currentStep === 2 ? 'text-slate-900' : 'text-slate-500'
                  }`}
                >
                  Pengiriman &amp; Identitas
                </span>
              </button>
            </div>
          </div>

          {/* Empty or Order Success State */}
          {cart.length === 0 ? (
            orderSuccess ? (
              kasbonSuccessInfo ? (
                <div className="bg-white rounded-3xl border border-amber-200/90 p-8 sm:p-12 text-center max-w-xl mx-auto space-y-5 shadow-xs animate-in zoom-in-95 duration-200">
                  <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
                    <Clock className="w-10 h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
                      Pengajuan Kasbon Belanja Terkirim!
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-600 max-w-md mx-auto leading-relaxed">
                      Pesanan <span className="font-mono font-bold text-neutral-900">#{kasbonSuccessInfo.orderId}</span> sebesar{' '}
                      <strong className="text-neutral-900">Rp {kasbonSuccessInfo.totalAmount.toLocaleString('id-ID')}</strong> telah tercatat dan sedang menunggu persetujuan kasir Toko Wadira.
                    </p>
                  </div>

                  <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs text-amber-900 font-medium">
                    Stok dan pesanan akan segera diproses setelah kasir menyetujui pengajuan kasbon Anda. Status dapat dipantau kapan saja di halaman Buku Kasbon.
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link
                      href="/dashboard/pelanggan/kasbon"
                      onClick={() => {
                        setOrderSuccess(false);
                        setKasbonSuccessInfo(null);
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#cbf14e] hover:bg-[#bde53f] text-[#1c240d] font-bold text-xs sm:text-sm shadow-xs transition"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Pantau Status di Buku Kasbon</span>
                    </Link>
                    <a
                      href={kasbonSuccessInfo.waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 font-bold text-xs sm:text-sm shadow-2xs transition"
                    >
                      <Send className="w-4 h-4 text-emerald-600" />
                      <span>Kabari Kasir via WA</span>
                    </a>
                  </div>
                </div>
              ) : midtransSuccessInfo ? (
                <div className="bg-white rounded-3xl border border-emerald-200/90 p-8 sm:p-12 text-center max-w-xl mx-auto space-y-5 shadow-xs animate-in zoom-in-95 duration-200">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
                      Pembayaran QRIS / Transfer Berhasil!
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-600 max-w-md mx-auto leading-relaxed">
                      Pesanan <span className="font-mono font-bold text-neutral-900">#{midtransSuccessInfo.orderId}</span> sebesar{' '}
                      <strong className="text-neutral-900">Rp {midtransSuccessInfo.totalAmount.toLocaleString('id-ID')}</strong> telah dibayar via Midtrans. Silakan kabari kasir lewat WhatsApp agar pesanan segera disiapkan.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <a
                      href={midtransSuccessInfo.waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition"
                    >
                      <Send className="w-4 h-4" />
                      <span>Kirim Bukti / Kabari Kasir via WA</span>
                    </a>
                    <Link
                      href={`/dashboard/pelanggan/struk?search=${encodeURIComponent(midtransSuccessInfo.orderId)}`}
                      onClick={() => {
                        setOrderSuccess(false);
                        setMidtransSuccessInfo(null);
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 font-bold text-xs sm:text-sm shadow-2xs transition"
                    >
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span>Lihat Riwayat Struk</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-emerald-200/90 p-8 sm:p-12 text-center max-w-xl mx-auto space-y-5 shadow-xs animate-in zoom-in-95 duration-200">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
                      Pesanan Berhasil Dikirim ke Kasir!
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-600 max-w-md mx-auto leading-relaxed">
                      Rincian pesanan telah dikirimkan ke WhatsApp Kasir Toko Wadira. Keranjang belanja Anda telah otomatis dikosongkan agar siap untuk belanja berikutnya.
                    </p>
                  </div>

                  <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-emerald-800 font-medium">
                    Kasir akan segera merespons chat WhatsApp Anda untuk konfirmasi ketersediaan barang dan pengantaran.
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link
                      href="/dashboard/pelanggan"
                      onClick={() => setOrderSuccess(false)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#465427] hover:bg-[#38441f] text-white font-bold text-xs sm:text-sm shadow-xs transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Mulai Belanja Kebutuhan Lain</span>
                    </Link>
                    <Link
                      href="/dashboard/pelanggan/struk"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 font-bold text-xs sm:text-sm shadow-2xs transition"
                    >
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span>Lihat Riwayat Struk</span>
                    </Link>
                  </div>
                </div>
              )
            ) : (
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
            )
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
                          Daftar Belanjaan Anda
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

                                {/* Dropdown Pilihan Satuan / Label PPOB */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {item.product.category === 'Tagihan & Pulsa' ? (
                                    <span className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md font-bold">
                                      {item.selectedVariant?.name || 'Layanan Digital'} • {item.selectedVariant?.sublabel || ''}
                                    </span>
                                  ) : item.product.variants && item.product.variants.length > 0 ? (
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
                              {item.product.category === 'Tagihan & Pulsa' ? (
                                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                                  1x
                                </span>
                              ) : (
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
                              )}
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
                          onClick={() => {
                            setFulfillmentType('delivery');
                            if (paymentMethod === 'cash') setPaymentMethod('qris');
                          }}
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
                              Dikirim ke Rumah / Kos
                            </div>
                            <div className="text-xs font-bold text-emerald-700">Ongkir Dikonfirmasi Penjual (Ojol Lokal)</div>
                            <p className="text-[11px] text-slate-500 mt-1">
                              Penjual menyewa kurir/ojol lokal dan mengonfirmasi total belanja + ongkir ke nomor WhatsApp Anda.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Form Identitas */}
                    <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
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

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Nomor WhatsApp / HP {paymentMethod === 'kasbon' || paymentMethod === 'qris' ? <span className="text-red-500">*</span> : ''}
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="tel"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="Cth: 08123456789"
                            className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#d4f952] focus:border-neutral-900 bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Alamat Pengantaran jika Antar */}
                    {fulfillmentType === 'delivery' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Alamat Pengantaran / Patokan Rumah <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <textarea
                            rows={2}
                            value={customerAddress}
                            onChange={(e) => setCustomerAddress(e.target.value)}
                            placeholder="Cth: Jl. Melati • Blok B No. 7 (Pagar hitam samping musholla)"
                            className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white resize-none"
                          />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Alamat lengkap diperlukan agar penjual bisa mengecek tarif kurir / ojol lokal.
                        </p>
                      </div>
                    )}

                    {/* Pilihan Metode Bayar */}
                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Metode Pembayaran
                      </label>
                      {fulfillmentType === 'delivery' ? (
                        <div className="space-y-2.5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <button
                              type="button"
                              onClick={() => setPaymentMethod('qris')}
                              className={`p-3.5 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                                paymentMethod === 'qris'
                                  ? 'border-2 border-emerald-600 bg-emerald-50/30 font-bold text-slate-900 shadow-2xs'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <CreditCard className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                              <div>
                                <div className="text-xs font-bold text-slate-900">Transfer / QRIS</div>
                                <div className="text-[11px] text-slate-500 font-normal">Bayar online setelah ongkir dikonfirmasi</div>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setPaymentMethod('kasbon')}
                              className={`p-3.5 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                                paymentMethod === 'kasbon'
                                  ? 'border-2 border-[#465427] bg-[#f4f8ed] font-bold text-slate-900 shadow-2xs'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <BookOpen className="w-4 h-4 text-[#465427] shrink-0 mt-0.5" />
                              <div>
                                <div className="text-xs font-bold text-slate-900">Kasbon / Bayar Tempo</div>
                                <div className="text-[11px] text-slate-500 font-normal">Perlu persetujuan kasir warung</div>
                              </div>
                            </button>
                          </div>
                          <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 rounded-xl p-2.5 flex items-start gap-2">
                            <span>💡</span>
                            <span>
                              <strong>Metode Tunai / COD ditiadakan</strong> untuk opsi kirim karena pesanan diantar oleh kurir/ojol lokal independen.
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('cash')}
                            className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                              paymentMethod === 'cash'
                                ? 'border-2 border-emerald-600 bg-emerald-50/25 font-bold text-slate-900 shadow-2xs'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <Banknote className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                            <div>
                              <div className="text-xs font-bold">Tunai di Warung</div>
                              <div className="text-[10px] text-slate-500 font-normal">Bayar saat ambil barang</div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPaymentMethod('qris')}
                            className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                              paymentMethod === 'qris'
                                ? 'border-2 border-emerald-600 bg-emerald-50/25 font-bold text-slate-900 shadow-2xs'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <CreditCard className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                            <div>
                              <div className="text-xs font-bold">Transfer / QRIS</div>
                              <div className="text-[10px] text-slate-500 font-normal">Bayar instan via QRIS</div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPaymentMethod('kasbon')}
                            className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                              paymentMethod === 'kasbon'
                                ? 'border-2 border-[#465427] bg-[#f4f8ed] font-bold text-slate-900 shadow-2xs'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <BookOpen className="w-4 h-4 text-[#465427] shrink-0 mt-0.5" />
                            <div>
                              <div className="text-xs font-bold">Kasbon / Tempo</div>
                              <div className="text-[10px] text-slate-500 font-normal">Butuh persetujuan kasir</div>
                            </div>
                          </button>
                        </div>
                      )}

                      {/* Pilihan Kanal Transfer / QRIS jika memilih paymentMethod === 'qris' */}
                      {paymentMethod === 'qris' && (
                        <div className="p-4 rounded-2xl bg-[#f4f8ed] border border-[#d6e5c5] space-y-2.5 animate-in fade-in duration-150">
                          <div className="text-[11px] font-bold text-[#2b3617] uppercase tracking-wider">
                            Pilih Metode Pembayaran Online
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {(
                              [
                                { id: 'qris', title: 'QRIS', sub: 'E-Wallet / Mobile' },
                                { id: 'bca_va', title: 'BCA VA', sub: 'Virtual Account' },
                                { id: 'bni_va', title: 'BNI VA', sub: 'Virtual Account' },
                                { id: 'bri_va', title: 'BRI VA', sub: 'Virtual Account' },
                              ] as const
                            ).map((ch) => {
                              const active = selectedPayChannel === ch.id;
                              return (
                                <button
                                  key={ch.id}
                                  type="button"
                                  onClick={() => setSelectedPayChannel(ch.id)}
                                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                                    active
                                      ? 'bg-[#465427] text-white border-[#465427] shadow-xs'
                                      : 'bg-white text-neutral-800 border-[#c9dcb0] hover:border-[#465427]'
                                  }`}
                                >
                                  <div className="text-xs font-extrabold">{ch.title}</div>
                                  <div className={`text-[10px] ${active ? 'text-white/80' : 'text-neutral-500'}`}>
                                    {ch.sub}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Detail Kasbon jika memilih Kasbon / Tempo */}
                      {paymentMethod === 'kasbon' && (
                        <div className="p-4 rounded-2xl bg-[#f4f8ed] border border-[#d6e5c5] space-y-3 animate-in fade-in duration-150">
                          <div className="flex items-start gap-2.5">
                            <Clock className="w-4 h-4 text-[#465427] shrink-0 mt-0.5" />
                            <div className="text-xs text-[#2b3617]">
                              <span className="font-bold block">Pengajuan Kasbon Belanja Barang</span>
                              <span className="text-[11px] opacity-90">
                                Daftar belanjaan Anda ({totalKinds} jenis barang senilai Rp{grandTotal.toLocaleString('id-ID')}) akan dikirim ke Buku Piutang kasir untuk diperiksa dan disetujui terlebih dahulu.
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-[#2b3617] mb-1">
                              Rencana Tanggal Pelunasan (Jatuh Tempo) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative max-w-xs">
                              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="date"
                                min={new Date().toISOString().split('T')[0]}
                                value={kasbonDueDate}
                                onChange={(e) => setKasbonDueDate(e.target.value)}
                                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-[#c9dcb0] bg-white focus:outline-hidden focus:ring-2 focus:ring-[#cbf14e]"
                              />
                            </div>
                          </div>
                        </div>
                      )}
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

                    {/* Hasil Pembayaran jika ada */}
                    {paymentResult && (
                      <div
                        className={`p-4 rounded-2xl border text-xs space-y-1 ${
                          paymentResult.status === 'success'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>{paymentResult.message}</span>
                        </div>
                        {paymentResult.orderId && (
                          <div className="text-[11px] opacity-90 pt-1 space-y-1">
                            <div>
                              ID Pesanan: <span className="font-mono font-bold">{paymentResult.orderId}</span>
                            </div>
                            <Link
                              href={`/dashboard/pelanggan/struk?search=${encodeURIComponent(paymentResult.orderId)}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Lihat &amp; Cetak Struk Belanja</span>
                            </Link>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tombol Aksi Langsung Kirim / Bayar di Step 2 */}
                    <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Kembali ke Keranjang</span>
                      </button>

                      <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
                        {paymentMethod === 'kasbon' ? (
                          <button
                            type="button"
                            disabled={isProcessingPayment}
                            onClick={handleCheckoutKasbon}
                            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#cbf14e] hover:bg-[#bde53f] text-[#1c240d] font-extrabold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            <Clock className="w-4 h-4" />
                            <span>{isProcessingPayment ? 'Mengirim Pengajuan...' : 'Ajukan Kasbon Pesanan Ini'}</span>
                          </button>
                        ) : paymentMethod === 'qris' ? (
                          <button
                            type="button"
                            disabled={isProcessingPayment}
                            onClick={handlePayWithMidtrans}
                            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>
                              {isProcessingPayment
                                ? 'Membuat Tagihan...'
                                : selectedPayChannel === 'qris'
                                ? 'Bayar Sekarang via QRIS'
                                : `Bayar via ${selectedPayChannel.replace('_va', '').toUpperCase()} VA`}
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleCheckoutWA}
                            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#d4f952] hover:bg-[#c4ec3e] text-neutral-950 font-black text-xs border border-[#c4ec3e] shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Send className="w-4 h-4" />
                            <span>Kirim Pesanan ke WhatsApp</span>
                          </button>
                        )}
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
                      <span>Ongkos kirim</span>
                      <span className="text-slate-500 font-medium text-right">
                        {currentStep === 1
                          ? 'Pilih di langkah berikutnya'
                          : fulfillmentType === 'delivery'
                          ? 'Dikonfirmasi via WA (Ojol)'
                          : 'Gratis (Ambil di warung)'}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">Total barang</span>
                        {fulfillmentType === 'delivery' && (
                          <span className="text-[10px] text-amber-700 font-medium block">
                            (+ ongkir ojol dikonfirmasi kasir)
                          </span>
                        )}
                      </div>
                      <span className="text-2xl font-black text-emerald-900 tracking-tight">
                        Rp{grandTotal.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* Action Button: Dynamic depending on Step */}
                  <div className="pt-1">
                    {currentStep === 1 ? (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!currentUser) {
                              setShowLoginModal(true);
                              return;
                            }
                            setCurrentStep(2);
                          }}
                          className="w-full py-3.5 px-4 bg-[#0F4A3C] hover:bg-[#0c3c31] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99] cursor-pointer"
                        >
                          <span>Pilih ambil atau antar</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        {!currentUser && (
                          <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-center text-[11px] font-medium flex items-center justify-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Wajib login dengan Google untuk lanjut ke pengiriman</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {paymentMethod === 'kasbon' ? (
                          <button
                            type="button"
                            disabled={isProcessingPayment}
                            onClick={handleCheckoutKasbon}
                            className="w-full py-3.5 px-4 bg-[#cbf14e] hover:bg-[#bde53f] text-[#1c240d] font-extrabold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99] cursor-pointer disabled:opacity-50"
                          >
                            <Clock className="w-4 h-4" />
                            <span>{isProcessingPayment ? 'Mengirim Pengajuan...' : 'Ajukan Kasbon Pesanan Ini'}</span>
                          </button>
                        ) : paymentMethod === 'qris' ? (
                          <button
                            type="button"
                            disabled={isProcessingPayment}
                            onClick={handlePayWithMidtrans}
                            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99] cursor-pointer disabled:opacity-50"
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>
                              {isProcessingPayment
                                ? 'Membuat Tagihan...'
                                : selectedPayChannel === 'qris'
                                ? 'Bayar Sekarang via QRIS'
                                : `Bayar via ${selectedPayChannel.replace('_va', '').toUpperCase()} VA`}
                            </span>
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

                        <button
                          type="button"
                          onClick={() => setCurrentStep(1)}
                          className="w-full py-2 text-center text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                        >
                          ← Kembali Ubah Belanjaan
                        </button>
                      </div>
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

      {/* Modal Wajib Login dengan Akun Google untuk Lanjut Checkout */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-neutral-200 p-6 sm:p-8 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header Icon & Close */}
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-[#f4f8ed] border border-[#d6e5c5] flex items-center justify-center">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.97 0 12s.45 3.84 1.24 5.42l4.04-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              </div>
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Copy */}
            <div className="space-y-2">
              <h3 className="text-xl font-black text-neutral-900 tracking-tight">
                Masuk untuk Melanjutkan Checkout
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                Untuk memilih metode antar/ambil dan mengonfirmasi pesanan ke kasir, silakan masuk dengan akun Google Anda terlebih dahulu.
              </p>
            </div>

            {/* Benefit Box */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Daftar belanja Anda aman dan otomatis tersimpan di keranjang.</span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <a
                href="/api/auth/google?redirect=/dashboard/pelanggan/keranjang"
                className="w-full py-3.5 px-4 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 active:scale-[0.99] text-neutral-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-3 shadow-2xs transition cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.97 0 12s.45 3.84 1.24 5.42l4.04-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Lanjutkan dengan Google</span>
              </a>

              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="w-full py-2.5 px-4 rounded-xl text-neutral-500 hover:text-neutral-800 text-xs font-semibold hover:bg-neutral-100 transition cursor-pointer"
              >
                Kembali ke Keranjang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pembayaran Custom Wadira (Midtrans Core API) */}
      {activeCharge && (
        <MidtransPaymentModal
          charge={activeCharge}
          onClose={() => setActiveCharge(null)}
          onPaidSuccess={(paidCharge) => {
            setActiveCharge(null);
            setPaymentResult({
              status: 'success',
              message: 'Pembayaran berhasil diselesaikan!',
              orderId: paidCharge.orderId,
            });
            setKasbonSuccessInfo(null);
            setMidtransSuccessInfo({
              orderId: paidCharge.orderId,
              totalAmount: paidCharge.grossAmount,
              waUrl: paidCharge.waUrl,
            });
            clearCart();
            setOrderSuccess(true);
            setCurrentStep(1);
          }}
        />
      )}

      {/* Slide-over Cart Drawer */}
      <CartDrawer />
    </div>
  );
}

export default function KeranjangPage() {
  return <KeranjangContent />;
}
