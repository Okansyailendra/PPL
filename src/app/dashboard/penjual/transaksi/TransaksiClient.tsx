'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { UserSession, Product, Transaction } from '@/types';
import { createSaleTransaction, createRestockTransaction } from '@/app/actions/transaksi';
import { linkWa, normalisasiNomor } from '@/lib/penagih';
import {
  Search,
  ScanBarcode,
  Package,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CheckCircle2,
  RefreshCw,
  FileText,
  BookOpen,
  ArrowRight,
  X,
  SwitchCamera,
  Info,
  Calendar,
  MessageSquare,
  Printer
} from 'lucide-react';

interface TransaksiClientProps {
  user: UserSession | null;
  initialProducts: Product[];
  initialRecentTransactions: Transaction[];
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function TransaksiClient({
  user,
  initialProducts,
  initialRecentTransactions,
}: TransaksiClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(initialRecentTransactions);

  // Mode: Penjualan (Stok Berkurang) vs Kulakan (Stok Bertambah)
  const [mode, setMode] = useState<'SALE' | 'RESTOCK'>('SALE');

  // Search & Filter
  const [search, setSearch] = useState('');
  const [filterStock, setFilterStock] = useState<'ALL' | 'READY' | 'LOW'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CREDIT'>('CASH');

  // Cash payment details
  const [cashReceived, setCashReceived] = useState<string>('');

  // Credit / Kasbon details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState<{
    transactionId: string;
    totalAmount: number;
    items: { name: string; quantity: number; price: number; unit?: string }[];
    paymentMethod: 'CASH' | 'CREDIT';
    customerName?: string;
    customerPhone?: string;
    cashReceived?: number;
    change?: number;
    updatedStocks?: { name: string; newStock: number; unit: string }[];
  } | null>(null);

  // Barcode Scanner Modal States
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  const [scannerTab, setScannerTab] = useState<'camera' | 'manual'>('camera');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannerStatus, setScannerStatus] = useState('');
  const [lastScannedToast, setLastScannedToast] = useState<{ name: string; price: number; stock: number; unit: string; qty: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastScanTimeRef = useRef<number>(0);
  const lastScannedCodeRef = useRef<string>('');

  // Unique categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Audio Beep Feedback
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {
      // Audio context might be restricted before interaction
    }
  };

  // Add to cart with atomic functional state update
  const addToCart = (product: Product): { success: boolean; newQty: number } => {
    setErrorMessage('');
    let resultQty = 1;
    let allowed = true;

    setCart((prevCart) => {
      const existing = prevCart.find((c) => c.product.id === product.id);
      const currentQty = existing ? existing.quantity : 0;

      if (mode === 'SALE') {
        if (product.stock <= 0) {
          setErrorMessage(`Stok "${product.name}" habis (0 ${product.unit}). Tidak dapat ditambahkan.`);
          allowed = false;
          return prevCart;
        }
        if (currentQty >= product.stock) {
          setErrorMessage(`Stok "${product.name}" maksimal ${product.stock} ${product.unit}.`);
          allowed = false;
          return prevCart;
        }
      }

      if (existing) {
        resultQty = existing.quantity + 1;
        return prevCart.map((c) =>
          c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      } else {
        resultQty = 1;
        return [...prevCart, { product, quantity: 1 }];
      }
    });

    return { success: allowed, newQty: resultQty };
  };

  // Barcode Handler (Both Camera & Manual)
  const handleBarcodeDetected = (code: string) => {
    if (!code || !code.trim()) return;
    const cleanCode = code.trim().toLowerCase();

    const found = products.find((p) => p.name.toLowerCase().includes(cleanCode));

    if (found) {
      if (mode === 'SALE' && found.stock <= 0) {
        setScannerStatus(`⚠️ Barang "${found.name}" stoknya habis (0 ${found.unit}).`);
        return;
      }

      const res = addToCart(found);
      if (!res.success) {
        setScannerStatus(`⚠️ Stok "${found.name}" sudah mencapai batas maksimal.`);
        return;
      }

      const displayPrice = mode === 'SALE' ? found.price : (found.cost_price || found.price * 0.8);
      setScannerStatus(`✅ Scan berhasil: ${found.name} (${res.newQty} ${found.unit})`);
      setLastScannedToast({
        name: found.name,
        price: displayPrice,
        stock: found.stock,
        unit: found.unit,
        qty: res.newQty,
      });

      setTimeout(() => {
        setLastScannedToast(null);
      }, 3000);
    } else {
      setScannerStatus(`❌ Barcode "${code}" tidak ditemukan di daftar barang.`);
    }
  };

  // ZXing Camera Barcode Decoder Lifecycle
  useEffect(() => {
    let codeReader: any = null;

    if (isBarcodeOpen && scannerTab === 'camera') {
      const startCamera = async () => {
        try {
          setScannerStatus('Mengaktifkan kamera...');
          const { BrowserMultiFormatReader } = await import('@zxing/library');
          codeReader = new BrowserMultiFormatReader();

          if (videoRef.current) {
            codeReader.decodeFromConstraints(
              { video: { facingMode: { ideal: facingMode } } },
              videoRef.current,
              (result: any, err: any) => {
                if (result) {
                  const text = result.getText();
                  if (text) {
                    const now = Date.now();
                    if (text === lastScannedCodeRef.current && now - lastScanTimeRef.current < 850) {
                      return;
                    }
                    lastScannedCodeRef.current = text;
                    lastScanTimeRef.current = now;
                    playBeep();
                    handleBarcodeDetected(text);
                  }
                }
              }
            ).catch((err: any) => {
              console.log('ZXing scan error:', err);
            });

            setScannerStatus('Arahkan kamera ke barcode produk...');
          }
        } catch (err: any) {
          console.error('Camera access error:', err);
          setScannerStatus('Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.');
        }
      };

      startCamera();
    }

    return () => {
      if (codeReader) {
        try {
          codeReader.reset();
        } catch {}
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [isBarcodeOpen, scannerTab, facingMode, products, mode]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const isLow = p.stock <= p.min_stock;
      const isReady = p.stock > 0;
      const matchCategory = selectedCategory === 'ALL' || p.category === selectedCategory;

      if (!matchCategory) return false;
      if (filterStock === 'READY') return matchSearch && isReady;
      if (filterStock === 'LOW') return matchSearch && isLow;
      return matchSearch;
    });
  }, [products, search, filterStock, selectedCategory]);

  // Cart Calculations
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cart.reduce((sum, item) => {
    const price = mode === 'SALE' ? item.product.price : (item.product.cost_price || item.product.price * 0.8);
    return sum + item.quantity * price;
  }, 0);

  const numCashReceived = parseInt(cashReceived.replace(/[^\d]/g, '') || '0', 10);
  const changeAmount = Math.max(0, numCashReceived - totalAmount);
  const isCashInsufficient = paymentMethod === 'CASH' && numCashReceived > 0 && numCashReceived < totalAmount;

  // Update Qty
  const updateQuantity = (productId: string, newQty: number) => {
    setErrorMessage('');
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    const item = cart.find((c) => c.product.id === productId);
    if (!item) return;

    if (mode === 'SALE' && newQty > item.product.stock) {
      setErrorMessage(`Stok untuk "${item.product.name}" hanya tersedia ${item.product.stock} ${item.product.unit}.`);
      return;
    }

    setCart(cart.map((c) => (c.product.id === productId ? { ...c, quantity: newQty } : c)));
  };

  // Remove from cart
  const removeFromCart = (productId: string) => {
    setCart(cart.filter((c) => c.product.id !== productId));
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    setCashReceived('');
    setErrorMessage('');
  };

  // Submit Transaction
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setErrorMessage('Keranjang belanja masih kosong.');
      return;
    }

    if (paymentMethod === 'CREDIT' && !customerName.trim()) {
      setErrorMessage('Nama pelanggan wajib diisi untuk transaksi Kasbon/Kredit.');
      return;
    }

    if (paymentMethod === 'CASH' && isCashInsufficient) {
      setErrorMessage(`Uang pembayaran kurang Rp ${(totalAmount - numCashReceived).toLocaleString('id-ID')}.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      if (mode === 'SALE') {
        const payload = {
          items: cart.map((c) => ({
            productId: c.product.id,
            name: c.product.name,
            quantity: c.quantity,
            price: c.product.price,
            unit: c.product.unit,
          })),
          paymentMethod,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          dueDate,
          notes,
          paidAmount: paymentMethod === 'CASH' ? (numCashReceived > 0 ? numCashReceived : totalAmount) : 0,
        };

        const res = await createSaleTransaction(payload);
        if (res.error) {
          setErrorMessage(res.error);
          setIsSubmitting(false);
          return;
        }

        // Update local products state with updated stocks
        if (res.updatedStocks) {
          const stockUpdates = new Map(res.updatedStocks.map((u) => [u.id, u.newStock]));
          setProducts((prev) =>
            prev.map((p) => {
              if (stockUpdates.has(p.id)) {
                return { ...p, stock: stockUpdates.get(p.id)! };
              }
              return p;
            })
          );
        }

        // Show Success Modal
        setSuccessData({
          transactionId: res.transactionId || 'TRX-' + Date.now().toString().slice(-6),
          totalAmount,
          items: cart.map((c) => ({
            name: c.product.name,
            quantity: c.quantity,
            price: c.product.price,
            unit: c.product.unit,
          })),
          paymentMethod,
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          cashReceived: paymentMethod === 'CASH' && numCashReceived > 0 ? numCashReceived : totalAmount,
          change: paymentMethod === 'CASH' && numCashReceived > 0 ? changeAmount : 0,
          updatedStocks: res.updatedStocks,
        });

        const newTrx: Transaction = {
          id: res.transactionId || Date.now().toString(),
          created_at: new Date().toISOString(),
          type: 'IN',
          category: 'PENJUALAN',
          payment_method: paymentMethod,
          total_amount: totalAmount,
          items: cart.map((c) => ({
            productId: c.product.id,
            name: c.product.name,
            quantity: c.quantity,
            price: c.product.price,
            unit: c.product.unit,
            subtotal: c.quantity * c.product.price,
          })),
        };
        setRecentTransactions([newTrx, ...recentTransactions]);

        clearCart();
        setCustomerName('');
        setCustomerPhone('');
      } else {
        // Restock Mode
        const payload = {
          items: cart.map((c) => ({
            productId: c.product.id,
            name: c.product.name,
            quantity: c.quantity,
            costPrice: c.product.cost_price || c.product.price * 0.8,
            unit: c.product.unit,
          })),
          notes,
        };

        const res = await createRestockTransaction(payload);
        if (res.error) {
          setErrorMessage(res.error);
          setIsSubmitting(false);
          return;
        }

        setProducts((prev) =>
          prev.map((p) => {
            const cartItem = cart.find((c) => c.product.id === p.id);
            if (cartItem) {
              return { ...p, stock: p.stock + cartItem.quantity };
            }
            return p;
          })
        );

        setSuccessData({
          transactionId: res.transactionId || 'KUL-' + Date.now().toString().slice(-6),
          totalAmount,
          items: cart.map((c) => ({
            name: c.product.name,
            quantity: c.quantity,
            price: c.product.cost_price || c.product.price * 0.8,
            unit: c.product.unit,
          })),
          paymentMethod: 'CASH',
        });

        clearCart();
      }
    } catch (err: any) {
      setErrorMessage('Terjadi kesalahan saat memproses transaksi: ' + (err?.message || 'Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Barcode Manual Form Handler
  const handleBarcodeSubmit = (code: string) => {
    if (!code.trim()) return;
    playBeep();
    handleBarcodeDetected(code);
    setBarcodeInput('');
  };

  // WhatsApp receipt sender
  const handleSendWaReceipt = () => {
    if (!successData) return;
    const phone = successData.customerPhone || '';
    const norm = normalisasiNomor(phone);
    if (!norm) {
      alert('Nomor WhatsApp pelanggan belum diisi.');
      return;
    }

    const itemsText = successData.items
      .map((i) => `• ${i.name} (${i.quantity} ${i.unit || 'Pcs'}) - Rp ${(i.quantity * i.price).toLocaleString('id-ID')}`)
      .join('\n');

    const message =
      `*STRUK PEMBELIAN ${user?.store_name || user?.warung_name || 'WARUNG'}*\n` +
      `No: #${successData.transactionId.slice(-6).toUpperCase()}\n` +
      `Tanggal: ${new Date().toLocaleString('id-ID')}\n` +
      `--------------------------------\n` +
      `${itemsText}\n` +
      `--------------------------------\n` +
      `*Total: Rp ${successData.totalAmount.toLocaleString('id-ID')}*\n` +
      `Pembayaran: ${successData.paymentMethod === 'CASH' ? 'TUNAI' : 'KASBON / UTANG'}\n` +
      (successData.paymentMethod === 'CASH'
        ? `Bayar: Rp ${(successData.cashReceived || successData.totalAmount).toLocaleString('id-ID')}\nKembali: Rp ${(successData.change || 0).toLocaleString('id-ID')}\n`
        : '') +
      `\nTerima kasih sudah berbelanja di warung kami!`;

    window.open(linkWa(norm, message), '_blank');
  };

  const storeDisplayName = user?.store_name || user?.warung_name || 'HalwiyahStore';

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto pb-12 font-sans">
      {/* 1. Breadcrumb & Page Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-5">
        <div>
          <span className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase mb-1 block">
            TRANSAKSI / KASIR DIGITAL
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
            {mode === 'SALE' ? 'Kasir & penjualan' : 'Kulakan & tambah stok'}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            {mode === 'SALE'
              ? 'Pilih belanjaan pelanggan. Stok berkurang otomatis setelah transaksi diselesaikan.'
              : 'Catat belanja warung. Stok bertambah dan pengeluaran masuk ke pembukuan.'}
          </p>
        </div>

        {/* Action Buttons Top-Right */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/dashboard/penjual/laporan"
            className="px-4 py-2 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition"
          >
            <FileText className="w-3.5 h-3.5 text-neutral-700" />
            <span>Lihat laporan</span>
          </Link>
          <Link
            href="/dashboard/penjual/stok"
            className="px-4 py-2 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition"
          >
            <Package className="w-3.5 h-3.5 text-neutral-700" />
            <span>Cek sisa stok</span>
          </Link>
        </div>
      </div>

      {/* 2. Mode Switcher Tabs Row */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setMode('SALE');
              clearCart();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'SALE'
                ? 'bg-[#cbf14e] text-[#1c240d] shadow-xs'
                : 'bg-white hover:bg-neutral-50 text-neutral-600 font-medium border border-neutral-200'
            }`}
          >
            Penjualan / Kurangi stok
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('RESTOCK');
              clearCart();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'RESTOCK'
                ? 'bg-[#cbf14e] text-[#1c240d] shadow-xs'
                : 'bg-white hover:bg-neutral-50 text-neutral-600 font-medium border border-neutral-200'
            }`}
          >
            Kulakan / Tambah stok
          </button>
        </div>

        <span className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase hidden sm:inline-block">
          {mode === 'SALE' ? 'PENJUALAN PELANGGAN' : 'KAS KELUAR'}
        </span>
      </div>

      {/* 3. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Product Selection & Catalog (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Search Bar & Scan Barcode Button */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 bg-white border border-neutral-200 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 shadow-xs focus-within:border-neutral-400 transition">
              <Search className="w-4 h-4 text-neutral-400 shrink-0" />
              <input
                type="text"
                placeholder="Cari nama atau barcode barang"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs sm:text-sm font-medium text-neutral-800 placeholder:text-neutral-400 bg-transparent focus:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-neutral-400 hover:text-neutral-600 text-xs px-1"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setIsBarcodeOpen(true);
                setScannerTab('camera');
                setScannerStatus('');
              }}
              className="px-4 py-2.5 bg-[#cbf14e] hover:bg-[#bef03b] text-[#1c240d] font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition shrink-0 cursor-pointer"
            >
              <ScanBarcode className="w-4 h-4 text-[#1c240d]" />
              <span>Scan barcode</span>
            </button>
          </div>

          {/* Filter Chips & Category Dropdown */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterStock('ALL')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterStock === 'ALL'
                    ? 'bg-[#cbf14e] text-[#1c240d] shadow-2xs font-bold'
                    : 'bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-600 font-medium'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setFilterStock('READY')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterStock === 'READY'
                    ? 'bg-[#cbf14e] text-[#1c240d] shadow-2xs font-bold'
                    : 'bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-600 font-medium'
                }`}
              >
                Tersedia
              </button>
              <button
                type="button"
                onClick={() => setFilterStock('LOW')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterStock === 'LOW'
                    ? 'bg-[#cbf14e] text-[#1c240d] shadow-2xs font-bold'
                    : 'bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-600 font-medium'
                }`}
              >
                Menipis
              </button>
            </div>

            {/* Category Filter */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none bg-white hover:bg-neutral-50 border border-neutral-200 rounded-lg pl-3 pr-7 py-1.5 text-xs text-neutral-700 font-medium cursor-pointer focus:outline-none shadow-xs"
              >
                <option value="ALL">Kategori: Semua barang</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px]">
                ▼
              </span>
            </div>
          </div>

          {/* Product Header Row */}
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] font-extrabold tracking-wider text-neutral-500 uppercase">
              DAFTAR BARANG
            </span>
            <span className="text-[11px] text-neutral-400 font-medium">
              {filteredProducts.length} produk
            </span>
          </div>

          {/* Product Area: Empty State or Grid */}
          {filteredProducts.length === 0 ? (
            <div className="bg-[#fbfcfa] border border-neutral-200 rounded-2xl p-6 sm:p-7 shadow-xs flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#eef5db] text-[#465427] flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 stroke-[1.75]" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-neutral-900">
                  Inventaris masih kosong.
                </h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-lg leading-relaxed">
                  Belum ada barang yang dapat dipilih. Tambahkan barang di menu Stok, atau coba kata kunci lain jika pencarian aktif.
                </p>
                <Link
                  href="/dashboard/penjual/stok"
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#cbf14e] hover:bg-[#bef03b] text-[#1c240d] text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Tambah barang pertama</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map((p) => {
                const inCart = cart.find((c) => c.product.id === p.id);
                const isOutOfStock = mode === 'SALE' && p.stock <= 0;
                const isLow = p.stock <= p.min_stock;
                const displayPrice = mode === 'SALE' ? p.price : (p.cost_price || p.price * 0.8);

                return (
                  <div
                    key={p.id}
                    onClick={() => !isOutOfStock && addToCart(p)}
                    className={`relative p-3.5 rounded-xl border transition-all text-left flex flex-col justify-between select-none cursor-pointer hover:shadow-xs ${
                      isOutOfStock
                        ? 'opacity-50 border-neutral-200 bg-neutral-100/60 cursor-not-allowed'
                        : inCart
                        ? 'border-[#465427] bg-[#f7fbeb]'
                        : 'border-neutral-200 bg-white hover:border-[#cbf14e]'
                    }`}
                  >
                    {/* Top Tag: Stock status & In-Cart counter */}
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          p.stock <= 0
                            ? 'bg-red-50 text-red-700'
                            : isLow
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-[#eef5db] text-[#465427]'
                        }`}
                      >
                        Sisa: {p.stock} {p.unit}
                      </span>

                      {inCart && (
                        <span className="w-5 h-5 rounded-full bg-[#cbf14e] text-[#1c240d] text-[11px] font-extrabold flex items-center justify-center shadow-2xs">
                          {inCart.quantity}
                        </span>
                      )}
                    </div>

                    {/* Product Name */}
                    <div className="font-bold text-xs sm:text-sm text-neutral-900 line-clamp-2 leading-tight mb-2">
                      {p.name}
                    </div>

                    {/* Price & Add Action */}
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-neutral-100">
                      <div>
                        <div className="text-[10px] text-neutral-400">
                          {mode === 'SALE' ? 'Harga Jual' : 'Estimasi Modal'}
                        </div>
                        <div className="font-extrabold text-neutral-900 text-xs sm:text-sm">
                          Rp {displayPrice.toLocaleString('id-ID')}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isOutOfStock) addToCart(p);
                        }}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs transition-transform active:scale-90 ${
                          isOutOfStock
                            ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                            : 'bg-[#cbf14e] hover:bg-[#bef03b] text-[#1c240d] shadow-xs cursor-pointer'
                        }`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ALUR TRANSAKSI */}
          <div className="mt-4 pt-4 border-t border-neutral-200/80">
            <span className="text-[10px] font-extrabold tracking-wider text-neutral-400 uppercase mb-3 block">
              ALUR TRANSAKSI
            </span>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="text-xs font-bold text-neutral-400 block mb-0.5">01</span>
                <span className="text-xs font-medium text-neutral-700 leading-snug block">
                  {mode === 'SALE' ? 'Pilih barang pelanggan' : 'Pilih barang kulakan'}
                </span>
              </div>
              <div>
                <span className="text-xs font-bold text-neutral-400 block mb-0.5">02</span>
                <span className="text-xs font-medium text-neutral-700 leading-snug block">
                  {mode === 'SALE' ? 'Tentukan pembayaran' : 'Atur jumlah & harga beli'}
                </span>
              </div>
              <div>
                <span className="text-xs font-bold text-neutral-400 block mb-0.5">03</span>
                <span className="text-xs font-medium text-neutral-700 leading-snug block">
                  {mode === 'SALE' ? 'Selesaikan & potong stok' : 'Simpan & tambah stok'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Keranjang Pelanggan (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between min-h-[520px]">
            {/* Cart Header */}
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-3">
                <h2 className="text-base font-bold text-neutral-900">
                  {mode === 'SALE' ? 'Keranjang pelanggan' : 'Daftar kulakan barang'}
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400 font-medium">
                    {totalItemsCount} item
                  </span>
                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={clearCart}
                      className="text-[11px] text-neutral-400 hover:text-red-600 font-medium cursor-pointer ml-1"
                    >
                      (Kosongkan)
                    </button>
                  )}
                </div>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="mb-3 p-3 bg-red-50 text-red-800 rounded-xl text-xs flex items-start gap-2 border border-red-200 animate-fadeIn">
                  <Info className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span className="flex-1 font-medium">{errorMessage}</span>
                </div>
              )}

              {/* Cart Items List */}
              {cart.length > 0 ? (
                <div className="space-y-2.5 max-h-[240px] overflow-y-auto pr-1">
                  {cart.map((item) => {
                    const price = mode === 'SALE' ? item.product.price : (item.product.cost_price || item.product.price * 0.8);
                    const subtotal = item.quantity * price;

                    return (
                      <div
                        key={item.product.id}
                        className="p-3 bg-[#fbfcf9] rounded-xl border border-neutral-200/80 flex items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs text-neutral-900 truncate">
                            {item.product.name}
                          </p>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            Rp {price.toLocaleString('id-ID')} &times; {item.quantity} {item.product.unit}
                          </p>
                        </div>

                        {/* Stepper */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="w-6 h-6 rounded-md bg-white border border-neutral-200 text-neutral-700 font-bold text-xs flex items-center justify-center hover:bg-neutral-50 transition cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-neutral-800">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="w-6 h-6 rounded-md bg-white border border-neutral-200 text-neutral-700 font-bold text-xs flex items-center justify-center hover:bg-neutral-50 transition cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Subtotal & Delete */}
                        <div className="text-right shrink-0">
                          <p className="font-bold text-xs text-neutral-900">
                            Rp {subtotal.toLocaleString('id-ID')}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-[11px] text-neutral-400 hover:text-red-500 transition cursor-pointer mt-0.5 inline-block"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Cart Empty State matching screenshots */
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <ShoppingCart className="w-8 h-8 text-neutral-300 stroke-[1.5] mb-2" />
                  <p className="text-xs sm:text-sm font-semibold text-neutral-800">
                    {mode === 'SALE' ? 'Keranjang masih kosong' : 'Belum ada barang kulakan'}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Pilih produk dari daftar barang untuk memulai.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Checkout Details */}
            <div className="pt-3 border-t border-neutral-100 mt-3 space-y-3">
              {/* Payment Method Selector (Only for Penjualan) */}
              {mode === 'SALE' && (
                <div>
                  <label className="block text-[10px] font-extrabold tracking-wider text-neutral-500 uppercase mb-2">
                    METODE PEMBAYARAN
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CASH')}
                      className={`py-2 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                        paymentMethod === 'CASH'
                          ? 'bg-[#cbf14e] text-[#1c240d] shadow-xs'
                          : 'bg-white hover:bg-neutral-50 text-neutral-600 font-medium border border-neutral-200'
                      }`}
                    >
                      Tunai
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CREDIT')}
                      className={`py-2 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                        paymentMethod === 'CREDIT'
                          ? 'bg-[#cbf14e] text-[#1c240d] shadow-xs'
                          : 'bg-white hover:bg-neutral-50 text-neutral-600 font-medium border border-neutral-200'
                      }`}
                    >
                      Kasbon / Utang
                    </button>
                  </div>
                </div>
              )}

              {/* Tunai / Cash Payment Details (Nominal Bayar & Kalkulator Kembalian) */}
              {mode === 'SALE' && paymentMethod === 'CASH' && (
                <div className="bg-[#fbfcfa] border border-neutral-200 rounded-xl p-3.5 space-y-2.5 shadow-2xs animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-neutral-700 block">
                      Uang Diterima (Nominal Bayar)
                    </label>
                    {numCashReceived > 0 && (
                      <button
                        type="button"
                        onClick={() => setCashReceived('')}
                        className="text-[10px] text-neutral-400 hover:text-red-500 font-medium cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {/* Input Nominal Uang */}
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder={totalAmount > 0 ? totalAmount.toLocaleString('id-ID') : '0'}
                      value={cashReceived ? parseInt(cashReceived, 10).toLocaleString('id-ID') : ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d]/g, '');
                        setCashReceived(raw);
                      }}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-bold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#8fa843]"
                    />
                  </div>

                  {/* Tombol Uang Pecahan Cepat */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setCashReceived(totalAmount > 0 ? totalAmount.toString() : '')}
                      className="px-2.5 py-1 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-lg text-[11px] font-bold text-neutral-700 transition cursor-pointer shadow-2xs"
                    >
                      Uang Pas
                    </button>
                    {[10000, 20000, 50000, 100000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCashReceived(amt.toString())}
                        className="px-2.5 py-1 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-lg text-[11px] font-semibold text-neutral-600 transition cursor-pointer shadow-2xs"
                      >
                        {amt >= 1000 ? `${amt / 1000}k` : amt}
                      </button>
                    ))}
                  </div>

                  {/* Kalkulator Kembalian Real-time */}
                  {numCashReceived > 0 && (
                    <div
                      className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all ${
                        isCashInsufficient
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : 'bg-[#eef5db] border-[#d6e5b4] text-[#344415]'
                      }`}
                    >
                      <span className="text-[11px] font-bold">
                        {isCashInsufficient ? 'Uang Kurang:' : 'Kembalian:'}
                      </span>
                      <span className="text-sm font-black">
                        Rp {Math.abs(numCashReceived - totalAmount).toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Kasbon / Kredit Panel (Shown when Kasbon is selected, exactly like Image 1) */}
              {mode === 'SALE' && paymentMethod === 'CREDIT' && (
                <div className="bg-[#eef5db] border border-[#d6e5b4] rounded-xl p-3.5 space-y-2.5 shadow-2xs animate-fadeIn">
                  <span className="text-xs font-medium text-[#3b4c1a] block">
                    Dicatat otomatis ke Buku Piutang &amp; Pembukuan
                  </span>

                  <div>
                    <label className="block text-[11px] font-bold text-[#3b4c1a] mb-1">
                      Nama pelanggan *
                    </label>
                    <input
                      type="text"
                      placeholder="Masukkan nama pelanggan"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-white border border-[#c9dcb0] rounded-lg px-3 py-2 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#8fa843]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-[#3b4c1a] mb-1">
                        No. WhatsApp
                      </label>
                      <input
                        type="text"
                        placeholder="Nomor WhatsApp"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full bg-white border border-[#c9dcb0] rounded-lg px-3 py-2 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#8fa843]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#3b4c1a] mb-1">
                        Jatuh tempo
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="w-full bg-white border border-[#c9dcb0] rounded-lg px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-[#8fa843]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Prominent Lime Green Total Box */}
              <div className="bg-[#cbf14e] rounded-xl p-4 flex items-center justify-between text-[#1c240d] shadow-xs">
                <div>
                  <span className="text-[11px] font-extrabold tracking-wider uppercase opacity-90 block">
                    {mode === 'SALE' ? 'TOTAL BELANJA' : 'TOTAL KULAKAN'}
                  </span>
                  <span className="text-xs opacity-75 font-medium mt-0.5 block">
                    {totalItemsCount} item dipilih
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black tracking-tight">
                  Rp {totalAmount.toLocaleString('id-ID')}
                </div>
              </div>

              {/* Checkout Action Button */}
              <button
                type="button"
                disabled={cart.length === 0 || isSubmitting}
                onClick={handleCheckout}
                className={`w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-xs ${
                  cart.length === 0 || isSubmitting
                    ? 'bg-[#e5e9df] text-neutral-400 cursor-not-allowed'
                    : 'bg-[#465427] hover:bg-[#3b4721] text-white active:scale-[0.99]'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memproses Transaksi...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {mode === 'SALE'
                        ? 'Selesaikan & Potong Stok Otomatis'
                        : 'Simpan Kulakan & Tambah Stok'}
                    </span>
                  </>
                )}
              </button>

              <span className="text-[11px] text-neutral-400 text-center block">
                {cart.length === 0
                  ? 'Tambahkan barang untuk mengaktifkan transaksi.'
                  : 'Stok dan pembukuan akan diperbarui secara otomatis.'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Banner: Terkoneksi otomatis ke Buku Besar & Laporan */}
      <div className="bg-[#eaf3d4] border border-[#d6e5b4] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-8 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#dbe8be] text-[#344415] flex items-center justify-center shrink-0">
            <RefreshCw className="w-4 h-4 text-[#354614]" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-[#1f2c0b]">
              Terkoneksi otomatis ke Buku Besar &amp; Laporan
            </h3>
            <p className="text-xs text-neutral-600 mt-0.5">
              {mode === 'SALE'
                ? 'Penjualan mencatat kas masuk ke Buku Besar dan memperbarui laporan laba rugi warung.'
                : 'Kulakan mencatatkan kas keluar ke Buku besar sekaligus menambah persediaan barang.'}
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/penjual/laporan"
          className="bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-xs shrink-0 cursor-pointer transition"
        >
          <BookOpen className="w-3.5 h-3.5 text-neutral-700" />
          <span>Buka jurnal kas</span>
        </Link>
      </div>

      {/* 5. Bottom Section: Transaksi Terakhir */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 mt-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-neutral-900">Transaksi terakhir</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              {recentTransactions.length === 0
                ? 'Belum ada transaksi tercatat hari ini.'
                : `${recentTransactions.length} transaksi selesai tersimpan di pembukuan.`}
            </p>
          </div>

          <div className="text-xs text-neutral-400 hidden md:block">
            Transaksi yang selesai akan tampil di sini dan tersimpan di pembukuan.
          </div>

          <Link
            href="/dashboard/penjual/laporan"
            className="text-xs font-bold text-neutral-800 hover:text-neutral-900 flex items-center gap-1.5 transition self-start sm:self-auto"
          >
            <span>Buku besar lengkap</span>
            <ArrowRight className="w-3.5 h-3.5 text-neutral-700" />
          </Link>
        </div>

        {/* Recent Transactions List if any */}
        {recentTransactions.length > 0 && (
          <div className="mt-4 pt-3 border-t border-neutral-100 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-neutral-400 border-b border-neutral-100">
                  <th className="py-2 font-medium">Waktu</th>
                  <th className="py-2 font-medium">Tipe</th>
                  <th className="py-2 font-medium">Item</th>
                  <th className="py-2 font-medium">Metode</th>
                  <th className="py-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {recentTransactions.slice(0, 4).map((trx) => (
                  <tr key={trx.id} className="text-neutral-800">
                    <td className="py-2.5 text-neutral-500 font-medium">
                      {new Date(trx.transaction_date || trx.created_at).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          trx.type === 'IN'
                            ? 'bg-[#eef5db] text-[#465427]'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {trx.type === 'IN' ? 'Penjualan' : 'Kulakan'}
                      </span>
                    </td>
                    <td className="py-2.5 max-w-xs truncate text-neutral-600">
                      {trx.items && trx.items.length > 0
                        ? trx.items.map((i: any) => `${i.name} (${i.quantity || 1})`).join(', ')
                        : '-'}
                    </td>
                    <td className="py-2.5">
                      <span className="text-[11px] font-medium text-neutral-600">
                        {trx.payment_method === 'CASH' ? 'Tunai' : 'Kasbon'}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-bold text-neutral-900">
                      Rp {trx.total_amount.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-400 font-medium pt-8 pb-4 border-t border-neutral-200/60 mt-8">
        <span>Wadira | Meja operasional warung</span>
        <span>{storeDisplayName}</span>
      </div>

      {/* 7. Barcode Scanner Modal (Screenshots 3 & 4) */}
      {isBarcodeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl overflow-hidden w-full max-w-lg shadow-2xl relative border border-neutral-200">
            {/* Modal Lime Green Header */}
            <div className="bg-[#cbf14e] px-6 py-5 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold tracking-wider text-[#354614] uppercase block">
                  TAMBAH BARANG KE KERANJANG
                </span>
                <h3 className="text-xl font-black text-[#1c240d] mt-0.5">
                  Scan barcode kasir
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsBarcodeOpen(false);
                  setScannerStatus('');
                  setBarcodeInput('');
                  setLastScannedToast(null);
                }}
                className="bg-white hover:bg-neutral-100 text-neutral-800 font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1 shadow-xs cursor-pointer transition"
              >
                <X className="w-3.5 h-3.5" />
                <span>Tutup</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Tabs: Kamera Langsung vs Input / Barcode Gun */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScannerTab('camera')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    scannerTab === 'camera'
                      ? 'bg-[#cbf14e] text-[#1c240d] shadow-xs'
                      : 'bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-600 font-medium'
                  }`}
                >
                  Kamera Langsung
                </button>
                <button
                  type="button"
                  onClick={() => setScannerTab('manual')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    scannerTab === 'manual'
                      ? 'bg-[#cbf14e] text-[#1c240d] shadow-xs'
                      : 'bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-600 font-medium'
                  }`}
                >
                  Input / Barcode Gun
                </button>
              </div>

              {/* Tab 1: Kamera Langsung (Screenshot 3) */}
              {scannerTab === 'camera' && (
                <div className="space-y-3">
                  <div className="relative w-full h-56 bg-[#182012] rounded-2xl overflow-hidden flex items-center justify-center border border-neutral-800">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                      autoPlay
                    />

                    {/* Viewfinder frame & Green Laser Scanning Line */}
                    <div className="absolute inset-x-8 top-1/2 h-0.5 bg-[#cbf14e] shadow-[0_0_8px_#cbf14e] pointer-events-none animate-pulse" />
                    <div className="absolute inset-0 border-2 border-dashed border-[#cbf14e]/60 pointer-events-none rounded-2xl m-6" />

                    {/* Floating Toast Notification on Successful Scan */}
                    {lastScannedToast && (
                      <div className="absolute top-3 inset-x-4 bg-emerald-600/95 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 animate-bounce z-10">
                        <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                        <div className="truncate flex-1">
                          <p className="truncate leading-tight">
                            {lastScannedToast.name} [x{lastScannedToast.qty} {lastScannedToast.unit}]
                          </p>
                          <p className="text-[10px] text-emerald-100 font-normal">
                            Rp {(lastScannedToast.price * lastScannedToast.qty).toLocaleString('id-ID')} &bull; Sisa stok: {lastScannedToast.stock} {lastScannedToast.unit}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Bottom-left Badge: Arah kamera langsung */}
                    <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-xs rounded-full text-[11px] font-medium text-[#cbf14e] flex items-center gap-1.5 border border-white/10">
                      <ScanBarcode className="w-3.5 h-3.5" />
                      <span>Arah kamera langsung</span>
                    </div>

                    {/* Camera switcher */}
                    <button
                      type="button"
                      onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                      className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white text-xs backdrop-blur-xs transition cursor-pointer"
                      title="Ganti Kamera Depan/Belakang"
                    >
                      <SwitchCamera className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-neutral-900">
                      Arahkan kamera ke barcode produk.
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                      Pastikan barcode di dalam bingkai. Anda dapat memindai beberapa produk berturut-turut tanpa menutup scanner.
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 2: Input / Barcode Gun (Screenshot 4) */}
              {scannerTab === 'manual' && (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold text-neutral-900">
                      Ketik barcode atau gunakan pemindai fisik.
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                      Hubungkan Barcode Gun melalui USB atau Bluetooth, lalu fokuskan kursor pada kolom barcode. Pindai produk atau ketik nomornya secara manual.
                    </p>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (barcodeInput.trim()) {
                        handleBarcodeSubmit(barcodeInput);
                      }
                    }}
                    className="space-y-3 pt-1"
                  >
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                        Nomor barcode
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          autoFocus
                          placeholder="Masukkan nomor barcode produk"
                          value={barcodeInput}
                          onChange={(e) => setBarcodeInput(e.target.value)}
                          className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-[#465427] font-mono shadow-xs"
                        />
                        <ScanBarcode className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                      </div>
                    </div>

                    {scannerStatus && (
                      <p
                        className={`text-xs font-medium ${
                          scannerStatus.startsWith('✅') ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {scannerStatus}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="w-full bg-[#cbf14e] hover:bg-[#bef03b] text-[#1c240d] font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Cari &amp; Masukkan ke Keranjang</span>
                    </button>

                    <div className="bg-[#eef5db] border border-[#d6e5b4] rounded-xl p-3 flex items-start gap-2 text-xs text-[#3b4c1a]">
                      <Info className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        Pastikan perangkat sudah terhubung. Tekan Enter setelah memindai untuk memasok barang.
                      </span>
                    </div>
                  </form>
                </div>
              )}

              {/* Modal Footer */}
              <div className="border-t border-neutral-100 pt-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold tracking-wider text-neutral-400 uppercase block">
                    {totalItemsCount} ITEM DIPILIH
                  </span>
                  <span className="text-xl font-black text-neutral-900 mt-0.5 block">
                    Total: Rp {totalAmount.toLocaleString('id-ID')}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsBarcodeOpen(false);
                    setScannerStatus('');
                    setBarcodeInput('');
                    setLastScannedToast(null);
                  }}
                  className="bg-[#cbf14e] hover:bg-[#bef03b] text-[#1c240d] font-bold text-xs px-5 py-2.5 rounded-full flex items-center gap-1.5 shadow-xs cursor-pointer transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Selesai &amp; Tutup</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Success Receipt Modal */}
      {successData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-neutral-200 p-6 w-full max-w-md shadow-2xl relative">
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-[#eef5db] text-[#465427] rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-extrabold text-neutral-900">
                Transaksi Berhasil!
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                Stok otomatis berkurang dan dicatat ke Buku Besar.
              </p>
            </div>

            {/* Receipt Card */}
            <div className="p-4 bg-[#fbfcfa] rounded-2xl border border-neutral-200 text-xs space-y-2 mb-4">
              <div className="flex justify-between text-neutral-500 pb-2 border-b border-neutral-100">
                <span>ID Transaksi:</span>
                <span className="font-mono font-bold text-neutral-800">
                  #{successData.transactionId.slice(-6).toUpperCase()}
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-1.5 py-1">
                {successData.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="font-medium text-neutral-800">
                      {i.name} &times; {i.quantity} {i.unit || 'Pcs'}
                    </span>
                    <span className="font-bold text-neutral-900">
                      Rp {(i.quantity * i.price).toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total & Payment Method */}
              <div className="pt-2 border-t border-neutral-100 space-y-1">
                <div className="flex justify-between font-bold text-sm text-[#465427]">
                  <span>Total Transaksi:</span>
                  <span>Rp {successData.totalAmount.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-neutral-500">
                  <span>Metode:</span>
                  <span className="font-bold text-neutral-800">
                    {successData.paymentMethod === 'CASH'
                      ? 'Tunai (CASH)'
                      : `Kasbon (${successData.customerName || 'Pelanggan'})`}
                  </span>
                </div>
                {successData.paymentMethod === 'CASH' && (
                  <>
                    <div className="flex justify-between text-neutral-500">
                      <span>Uang Diterima:</span>
                      <span className="font-semibold text-neutral-900">
                        Rp {(successData.cashReceived || successData.totalAmount).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#465427] font-bold">
                      <span>Kembalian:</span>
                      <span>
                        Rp {(successData.change || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Stock update notification */}
              {successData.updatedStocks && successData.updatedStocks.length > 0 && (
                <div className="mt-2 pt-2 border-t border-neutral-100 text-[11px] text-neutral-500">
                  <span className="font-bold text-[#465427] block mb-0.5">Sisa Stok Diperbarui:</span>
                  {successData.updatedStocks.map((s, idx) => (
                    <span
                      key={idx}
                      className="inline-block mr-2 text-[10px] bg-[#eef5db] text-[#465427] px-1.5 py-0.5 rounded font-bold"
                    >
                      {s.name}: {s.newStock} {s.unit}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              {successData.customerPhone && (
                <button
                  type="button"
                  onClick={handleSendWaReceipt}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Kirim Struk via WhatsApp</span>
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Struk</span>
                </button>
                <Link
                  href="/dashboard/penjual/laporan"
                  className="py-2.5 bg-[#eef5db] hover:bg-[#e4efcd] text-[#465427] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors text-center"
                >
                  <FileText className="w-4 h-4" />
                  <span>Ke Pembukuan</span>
                </Link>
              </div>

              <button
                type="button"
                onClick={() => setSuccessData(null)}
                className="w-full py-2.5 bg-[#cbf14e] hover:bg-[#bef03b] text-[#1c240d] rounded-xl text-xs font-bold transition-colors cursor-pointer mt-1"
              >
                Transaksi Baru (+ Input Lagi)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
