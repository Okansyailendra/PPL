'use client';

import React, { useState, useEffect, useRef, ChangeEvent, DragEvent } from 'react';
import Link from 'next/link';
import Footer from '@/components/pembeli/Footer';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import PrintableReceiptPortal, {
  CustomerReceiptView,
  type PrintableReceiptProps,
} from '@/components/ui/PrintableReceiptPortal';
import {
  FileText,
  Search,
  Printer,
  MessageCircle,
  RefreshCw,
  LogIn,
  CheckCircle2,
  Clock,
  Calendar,
  X,
  Store,
  ChevronRight,
  Receipt,
  Share2,
  Camera,
  Upload,
  ScanLine,
  Sparkles,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  ShoppingBag,
} from 'lucide-react';
import type {
  CustomerScannedReceipt,
  ScannedReceiptItem,
  Transaction,
  UserSession,
} from '@/types';

type ActiveTab = 'scanned' | 'digital';
type PaymentMethod = 'CASH' | 'QRIS' | 'TRANSFER' | 'CREDIT' | 'ONLINE';

function getDefaultDateTimeLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(
    now.getHours()
  )}:${pad(now.getMinutes())}`;
}

function createEmptyItem(): ScannedReceiptItem {
  return { name: '', quantity: 1, unit: 'pcs', price: 0, subtotal: 0 };
}

export default function StrukPelangganPage() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  const [activeTab, setActiveTab] = useState<ActiveTab>('scanned');

  const [scannedReceipts, setScannedReceipts] = useState<CustomerScannedReceipt[]>([]);
  const [isLoadingScanned, setIsLoadingScanned] = useState(true);
  const [scannedSearch, setScannedSearch] = useState('');

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTrx, setIsLoadingTrx] = useState(true);
  const [requireLogin, setRequireLogin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanInfo, setScanInfo] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [storeName, setStoreName] = useState('Toko / Warung');
  const [purchaseDate, setPurchaseDate] = useState<string>(getDefaultDateTimeLocal);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [items, setItems] = useState<ScannedReceiptItem[]>([createEmptyItem()]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [isTotalManual, setIsTotalManual] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [selectedTrx, setSelectedTrx] = useState<Transaction | null>(null);
  const [selectedScanned, setSelectedScanned] = useState<CustomerScannedReceipt | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerScannedReceipt | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSession = async () => {
    try {
      setIsLoadingSession(true);
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      const data = await res.json();
      setUser(data?.success && data?.user ? data.user : null);
    } catch {
      setUser(null);
    } finally {
      setIsLoadingSession(false);
    }
  };

  const fetchScannedReceipts = async (customSearch?: string) => {
    try {
      setIsLoadingScanned(true);
      const q = typeof customSearch === 'string' ? customSearch : scannedSearch;
      const url = q
        ? `/api/customer/receipts?search=${encodeURIComponent(q)}`
        : '/api/customer/receipts';
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      if (data?.success) {
        setScannedReceipts(data.receipts || []);
      } else {
        setScannedReceipts([]);
      }
    } catch (err) {
      console.error('Gagal memuat struk hasil scan:', err);
    } finally {
      setIsLoadingScanned(false);
    }
  };

  const fetchTransactions = async (customSearch?: string) => {
    try {
      setIsLoadingTrx(true);
      const searchParam = typeof customSearch === 'string' ? customSearch : searchQuery;
      const url = searchParam
        ? `/api/customer/transactions?search=${encodeURIComponent(searchParam)}`
        : '/api/customer/transactions';

      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();

      if (data?.success) {
        setTransactions(data.transactions || []);
        setRequireLogin(Boolean(data.requireLogin));
      } else {
        setTransactions([]);
      }
    } catch (err) {
      console.error('Gagal mengambil data transaksi struk:', err);
    } finally {
      setIsLoadingTrx(false);
    }
  };

  useEffect(() => {
    fetchSession();
    if (typeof window !== 'undefined') {
      const paramSearch = new URLSearchParams(window.location.search).get('search');
      if (paramSearch) {
        setSearchQuery(paramSearch);
        setActiveTab('digital');
      }
    }
  }, []);

  useEffect(() => {
    if (!isLoadingSession) {
      const paramSearch =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('search')
          : null;
      fetchScannedReceipts();
      fetchTransactions(paramSearch || searchQuery);
    }
  }, [isLoadingSession]);

  // Keep totalAmount synced with item subtotals unless manually overridden
  useEffect(() => {
    if (!isTotalManual) {
      const sum = items.reduce((acc, it) => acc + (Number(it.subtotal) || 0), 0);
      setTotalAmount(sum);
    }
  }, [items, isTotalManual]);

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return (
        d.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }) + ' WIB'
      );
    } catch {
      return isoString;
    }
  };

  const processSelectedFile = (file: File) => {
    setFileName(file.name);
    setScanError('');
    setScanInfo('');
    setSaveFeedback(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) processSelectedFile(selected);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.type.startsWith('image/')) {
      processSelectedFile(dropped);
    }
  };

  const handleResetScanForm = () => {
    setPreview(null);
    setFileName('');
    setScanError('');
    setScanInfo('');
    setStoreName('Toko / Warung');
    setPurchaseDate(getDefaultDateTimeLocal());
    setPaymentMethod('CASH');
    setItems([createEmptyItem()]);
    setTotalAmount(0);
    setIsTotalManual(false);
    setNotes('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleScanReceipt = async () => {
    if (!preview) return;
    setIsScanning(true);
    setScanError('');
    setScanInfo('');
    setSaveFeedback(null);

    try {
      const res = await fetch('/api/customer/receipts/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: preview }),
      });
      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Gagal membaca struk belanja.');
      }

      const receipt = data.receipt;
      setStoreName(receipt.storeName || 'Toko / Warung');
      setPurchaseDate(receipt.purchaseDate || getDefaultDateTimeLocal());
      setPaymentMethod(receipt.paymentMethod || 'CASH');
      const extractedItems: ScannedReceiptItem[] =
        Array.isArray(receipt.items) && receipt.items.length > 0
          ? receipt.items
          : [createEmptyItem()];
      setItems(extractedItems);

      const itemsSum = extractedItems.reduce((acc, it) => acc + (Number(it.subtotal) || 0), 0);
      const extractedTotal = Number(receipt.totalAmount) || itemsSum;
      setTotalAmount(extractedTotal);
      setIsTotalManual(extractedTotal !== itemsSum);
      setNotes(receipt.notes || '');
      setScanInfo('Struk berhasil dibaca! Periksa kembali daftar barang, harga, dan tanggal di sebelah kanan lalu klik Simpan.');
    } catch (err: any) {
      setScanError(err?.message || 'Gagal menganalisis foto struk.');
    } finally {
      setIsScanning(false);
    }
  };

  const updateItemField = (
    index: number,
    field: keyof ScannedReceiptItem,
    rawValue: string
  ) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        if (field === 'name' || field === 'unit') {
          return { ...item, [field]: rawValue };
        }
        const num = Math.max(0, Math.round(Number(rawValue) || 0));
        if (field === 'quantity') {
          const qty = Math.max(1, num || 1);
          return { ...item, quantity: qty, subtotal: qty * item.price };
        }
        if (field === 'price') {
          return { ...item, price: num, subtotal: item.quantity * num };
        }
        return { ...item, subtotal: num };
      })
    );
  };

  const handleAddItemRow = () => {
    setItems((prev) => [...prev, createEmptyItem()]);
  };

  const handleRemoveItemRow = (index: number) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== index) : prev));
  };

  const handleSaveReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveFeedback(null);

    const validItems = items.filter((it) => it.name.trim().length > 0);
    if (validItems.length === 0) {
      setSaveFeedback({ type: 'error', text: 'Isi minimal 1 nama barang belanjaan.' });
      return;
    }

    if (totalAmount <= 0) {
      setSaveFeedback({ type: 'error', text: 'Total harga belanja harus lebih dari Rp 0.' });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/customer/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName,
          purchaseDate,
          paymentMethod,
          items: validItems,
          totalAmount,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Gagal menyimpan data struk.');
      }

      setSaveFeedback({
        type: 'success',
        text: 'Data struk belanja berhasil disimpan ke riwayat pelanggan Anda!',
      });
      handleResetScanForm();
      setActiveTab('scanned');
      await fetchScannedReceipts();
    } catch (err: any) {
      setSaveFeedback({
        type: 'error',
        text: err?.message || 'Terjadi kesalahan saat menyimpan struk.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/customer/receipts/${encodeURIComponent(deleteTarget.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Gagal menghapus struk.');
      }
      setDeleteTarget(null);
      await fetchScannedReceipts();
    } catch (err: any) {
      setSaveFeedback({
        type: 'error',
        text: err?.message || 'Gagal menghapus struk.',
      });
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const getWaScannedReceiptMessage = (rec: CustomerScannedReceipt) => {
    const itemsText = rec.items
      .map((it) => `• ${it.name} (${it.quantity} ${it.unit}) = ${formatRupiah(it.subtotal)}`)
      .join('\n');

    return encodeURIComponent(
      `*CATATAN STRUK BELANJA*\n` +
        `--------------------------------\n` +
        `No. Catatan: #${rec.id}\n` +
        `Toko: ${rec.store_name}\n` +
        `Tanggal Belanja: ${formatDate(rec.purchase_date)}\n` +
        `--------------------------------\n` +
        `*DAFTAR BARANG:*\n${itemsText}\n` +
        `--------------------------------\n` +
        `*TOTAL: ${formatRupiah(rec.total_amount)}*\n` +
        `Metode: ${rec.payment_method}`
    );
  };

  const getWaReceiptMessage = (trx: Transaction) => {
    let itemsText = '';
    if (trx.items && Array.isArray(trx.items)) {
      itemsText = trx.items
        .map(
          (it) =>
            `• ${it.name} (${it.quantity}x) = ${formatRupiah(it.subtotal || it.price * it.quantity)}`
        )
        .join('\n');
    }

    return encodeURIComponent(
      `*STRUK PEMBELIAN TOKO WADIRA*\n` +
        `--------------------------------\n` +
        `No. Struk: #${trx.id.slice(0, 16)}\n` +
        `Tanggal: ${formatDate(trx.created_at)}\n` +
        `Pelanggan: ${trx.customer_name || 'Pelanggan Wadira'}\n` +
        `--------------------------------\n` +
        `*DAFTAR BARANG:*\n${itemsText}\n` +
        `--------------------------------\n` +
        `*TOTAL: ${formatRupiah(trx.total_amount)}*\n` +
        `Metode: ${trx.payment_method} (${trx.payment_status || 'PAID'})\n` +
        `--------------------------------\n` +
        `Terima kasih telah berbelanja di Toko Wadira!`
    );
  };

  const totalScannedSpend = scannedReceipts.reduce((sum, r) => sum + r.total_amount, 0);
  const totalScannedItemsCount = scannedReceipts.reduce(
    (sum, r) => sum + r.items.reduce((acc, it) => acc + it.quantity, 0),
    0
  );

  return (
    <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Breadcrumb & Header Title */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400">
          <Link href="/dashboard/pelanggan" className="hover:text-neutral-700 transition">
            Wadira
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-neutral-800 font-bold">Scan &amp; Simpan Struk Belanja</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight flex items-center gap-2">
              <FileText className="w-7 h-7 text-[#4a5829]" />
              <span>Struk &amp; Scan Belanja Saya</span>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 mt-1">
              Scan struk fisik belanja Anda untuk menyimpan daftar barang, jumlah, harga, dan tanggal belanja ke akun pelanggan.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              fetchScannedReceipts();
              fetchTransactions();
            }}
            disabled={isLoadingScanned || isLoadingTrx}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-700 shadow-2xs transition self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-neutral-600 ${
                isLoadingScanned || isLoadingTrx ? 'animate-spin' : ''
              }`}
            />
            <span>Perbarui Data</span>
          </button>
        </div>
      </div>

      {/* Notifikasi Belum Login */}
      {!isLoadingSession && !user && (
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#4a5829] to-[#36401e] text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#d5ed70] text-[#333d1c] text-[11px] font-black uppercase tracking-wider">
              Simpan Data Belanja
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight">
              Masuk untuk Scan &amp; Menyimpan Struk Belanja Anda
            </h2>
            <p className="text-xs sm:text-sm text-neutral-200 max-w-xl">
              Data barang, jumlah, harga, dan tanggal belanja dari hasil scan struk fisik akan tersimpan permanen di akun Google Anda.
            </p>
          </div>

          <Link
            href="/login?redirect=/dashboard/pelanggan/struk"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#d5ed70] hover:bg-[#c2dc58] text-[#293214] font-black text-xs sm:text-sm transition shrink-0 shadow-xs"
          >
            <LogIn className="w-4 h-4" />
            <span>Masuk dengan Google</span>
          </Link>
        </div>
      )}

      {/* Ringkasan Singkat Pelanggan (jika login) */}
      {user && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#d5ed70] rounded-2xl p-4 sm:p-5 text-[#1c240d] shadow-2xs">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#343f17]">
              Struk Tersimpan
            </span>
            <div className="text-2xl sm:text-3xl font-black mt-1">
              {scannedReceipts.length} struk
            </div>
            <p className="text-[11px] text-[#4a5823] mt-0.5">Tersimpan di akun {user.owner_name}</p>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 sm:p-5 shadow-2xs">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-400">
              Total Belanja Tercatat
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#4a5829] mt-1">
              {formatRupiah(totalScannedSpend)}
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">Akumulasi dari struk hasil scan</p>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 sm:p-5 shadow-2xs">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-400">
              Total Item Dibeli
            </span>
            <div className="text-2xl sm:text-3xl font-black text-neutral-900 mt-1">
              {totalScannedItemsCount} pcs
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">Total kuantitas barang tercatat</p>
          </div>
        </div>
      )}

      {/* BAGIAN 1: SCAN STRUK FISIK & SIMPAN KE DATA PELANGGAN */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kiri: Unggah / Kamera Struk Fisik (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#4a5829] bg-[#eef5db] px-2.5 py-0.5 rounded-full">
                <ScanLine className="w-3 h-3" />
                Langkah 1 • Scan Struk Fisik
              </span>
              <h2 className="text-lg font-black text-neutral-950 mt-2">
                Foto atau Unggah Struk Belanja
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Ambil foto struk belanja kertas Anda, lalu sistem akan membaca daftar barang, harga, dan tanggalnya otomatis.
              </p>
            </div>
          </div>

          {/* Dropzone / Preview */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              if (!preview && fileInputRef.current) fileInputRef.current.click();
            }}
            className={`border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center transition min-h-[220px] ${
              isDragging
                ? 'border-[#4a5829] bg-[#eef5db]/40'
                : 'border-neutral-300 hover:border-[#4a5829] bg-neutral-50/50'
            } ${!preview ? 'cursor-pointer' : ''}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/jpg, image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />

            {preview ? (
              <div className="w-full space-y-3">
                <div className="max-h-60 w-full rounded-xl overflow-hidden border border-neutral-200 bg-neutral-900/5 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="Preview Struk Fisik"
                    className="max-h-60 w-auto object-contain p-2"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-xl transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Ganti Foto</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResetScanForm();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-xl transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#eef5db] text-[#4a5829] flex items-center justify-center mx-auto">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-neutral-900">
                    Pilih atau tarik foto struk fisik ke sini
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Format JPG, PNG, atau WEBP (maks. 5MB)
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#d5ed70] hover:bg-[#c6e558] text-[#1c240d] text-xs font-bold transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Pilih File</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      cameraInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4a5829] hover:bg-[#3d4922] text-[#e8f699] text-xs font-bold transition cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Ambil Foto</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {fileName && (
            <div className="text-[11px] text-neutral-600 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="truncate font-semibold">File: {fileName}</span>
            </div>
          )}

          {/* Scan Button */}
          <button
            type="button"
            onClick={handleScanReceipt}
            disabled={!preview || isScanning || !user}
            className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-xs ${
              !preview || !user
                ? 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed'
                : isScanning
                ? 'bg-[#4a5829] text-white opacity-90 cursor-wait'
                : 'bg-[#4a5829] hover:bg-[#3d4922] text-[#e8f699] cursor-pointer'
            }`}
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Membaca Struk Belanja...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Scan Struk dengan AI</span>
              </>
            )}
          </button>

          {!user && !isLoadingSession && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
              Masuk terlebih dahulu untuk menjalankan scan otomatis dan menyimpan data struk ke akun Anda.
            </p>
          )}

          {scanError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{scanError}</span>
            </div>
          )}

          {scanInfo && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{scanInfo}</span>
            </div>
          )}
        </div>

        {/* Kanan: Review & Simpan Data Hasil Scan (7 cols) */}
        <form
          onSubmit={handleSaveReceipt}
          className="lg:col-span-7 bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 shadow-2xs space-y-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-neutral-100 pb-4">
            <div>
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#1c240d] bg-[#d5ed70] px-2.5 py-0.5 rounded-full">
                <Save className="w-3 h-3" />
                Langkah 2 • Simpan Data Hasil Scan
              </span>
              <h2 className="text-lg font-black text-neutral-950 mt-2">
                Detail Belanjaan &amp; Penyimpanan
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Periksa atau sesuaikan rincian barang, banyak item, harga, dan tanggal belanja sebelum disimpan.
              </p>
            </div>
          </div>

          {saveFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-start gap-2 ${
                saveFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {saveFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{saveFeedback.text}</span>
            </div>
          )}

          {/* Meta Info: Toko, Tanggal, Metode */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                Nama Toko / Warung
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Contoh: Toko Wadira"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4a5829] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                Tanggal &amp; Waktu Belanja
              </label>
              <input
                type="datetime-local"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4a5829] focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                Metode Pembayaran
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4a5829] focus:bg-white"
              >
                <option value="CASH">Tunai (CASH)</option>
                <option value="QRIS">QRIS</option>
                <option value="TRANSFER">Transfer Bank</option>
                <option value="CREDIT">Kasbon / Kredit</option>
                <option value="ONLINE">Online</option>
              </select>
            </div>
          </div>

          {/* Items Table / Dynamic List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-neutral-800">
                Daftar Barang Belanjaan ({items.length})
              </label>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#eef5db] hover:bg-[#e1ecc6] text-[#3a471f] text-[11px] font-bold transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Barang</span>
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80"
                >
                  <div className="col-span-12 sm:col-span-5">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItemField(idx, 'name', e.target.value)}
                      placeholder="Nama barang (mis. Beras 5kg)"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a5829]"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItemField(idx, 'quantity', e.target.value)}
                      title="Jumlah"
                      className="w-full px-2 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a5829]"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <input
                      type="number"
                      min={0}
                      value={item.price}
                      onChange={(e) => updateItemField(idx, 'price', e.target.value)}
                      placeholder="Harga"
                      title="Harga Satuan (Rp)"
                      className="w-full px-2 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a5829]"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2 text-right">
                    <div className="text-[11px] font-bold text-neutral-900 truncate">
                      {formatRupiah(item.subtotal)}
                    </div>
                    <div className="text-[10px] text-neutral-400">{item.unit || 'pcs'}</div>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(idx)}
                      disabled={items.length === 1}
                      title="Hapus baris"
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-neutral-100">
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                Catatan Tambahan (Opsional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Mis. No. struk, diskon, atau keterangan belanja"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4a5829] focus:bg-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-neutral-700">
                  Total Belanja (Rp)
                </label>
                {isTotalManual && (
                  <button
                    type="button"
                    onClick={() => setIsTotalManual(false)}
                    className="text-[10px] font-bold text-[#4a5829] hover:underline cursor-pointer"
                  >
                    Hitung otomatis
                  </button>
                )}
              </div>
              <input
                type="number"
                min={0}
                value={totalAmount}
                onChange={(e) => {
                  setIsTotalManual(true);
                  setTotalAmount(Math.max(0, Math.round(Number(e.target.value) || 0)));
                }}
                className="w-full px-3 py-2 text-sm font-black text-[#4a5829] bg-[#eef5db]/50 border border-[#d2dcb6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4a5829]"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={handleResetScanForm}
              className="px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-600 hover:bg-neutral-50 transition cursor-pointer"
            >
              Bersihkan Form
            </button>

            <button
              type="submit"
              disabled={isSaving || !user}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm transition shadow-xs ${
                !user
                  ? 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed'
                  : isSaving
                  ? 'bg-[#4a5829] text-white opacity-90 cursor-wait'
                  : 'bg-[#d5ed70] hover:bg-[#c6e558] text-[#1c240d] cursor-pointer'
              }`}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan ke Data Pelanggan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* BAGIAN 2: TAB RIWAYAT STRUK TERSIMPAN & NOTA DIGITAL WARUNG */}
      <section className="space-y-4 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex p-1 rounded-xl bg-white border border-neutral-200/80 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('scanned')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'scanned'
                  ? 'bg-[#4a5829] text-[#e8f699]'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Struk Hasil Scan ({scannedReceipts.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('digital')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'digital'
                  ? 'bg-[#4a5829] text-[#e8f699]'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Nota Digital Warung ({transactions.length})</span>
            </button>
          </div>
        </div>

        {/* TAB 1: STRUK HASIL SCAN TERSIMPAN */}
        {activeTab === 'scanned' && (
          <div className="space-y-4">
            {/* Search bar */}
            <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-2xs">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  fetchScannedReceipts(scannedSearch);
                }}
                className="relative"
              >
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={scannedSearch}
                  onChange={(e) => setScannedSearch(e.target.value)}
                  placeholder="Cari struk tersimpan berdasarkan nama toko, nama barang, atau tanggal (YYYY-MM-DD)..."
                  className="w-full pl-10 pr-24 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#4a5829] focus:bg-white transition"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-[#4a5829] text-[#e8f699] text-xs font-bold hover:bg-[#3d4922] transition cursor-pointer"
                >
                  Cari
                </button>
              </form>
            </div>

            {isLoadingScanned && (
              <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200/80 space-y-3">
                <RefreshCw className="w-8 h-8 text-[#4a5829] animate-spin mx-auto" />
                <p className="text-sm font-bold text-neutral-700">Memuat data struk tersimpan...</p>
              </div>
            )}

            {!isLoadingScanned && scannedReceipts.length === 0 && (
              <div className="p-10 text-center bg-white rounded-2xl border border-neutral-200/80 space-y-3">
                <div className="w-14 h-14 rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center mx-auto">
                  <ScanLine className="w-7 h-7" />
                </div>
                <h3 className="text-base font-black text-neutral-900">
                  Belum Ada Struk Hasil Scan Tersimpan
                </h3>
                <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
                  {user
                    ? 'Unggah atau foto struk belanja fisik Anda di atas, lalu klik Simpan ke Data Pelanggan untuk mencatatnya di sini.'
                    : 'Silakan masuk dengan akun Google Anda untuk melihat dan menyimpan riwayat scan struk belanja.'}
                </p>
              </div>
            )}

            {!isLoadingScanned && scannedReceipts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scannedReceipts.map((rec) => {
                  const totalQty = rec.items.reduce((sum, it) => sum + it.quantity, 0);
                  return (
                    <div
                      key={rec.id}
                      className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-2xs hover:shadow-xs transition space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5 min-w-0">
                            <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider block">
                              #{rec.id}
                            </span>
                            <h4 className="text-sm font-extrabold text-neutral-950 truncate">
                              {rec.store_name}
                            </h4>
                            <div className="flex items-center gap-1 text-[11px] text-neutral-500">
                              <Calendar className="w-3 h-3 text-neutral-400" />
                              <span>{formatDate(rec.purchase_date)}</span>
                            </div>
                          </div>

                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#eef5db] text-[#3a471f] border border-[#d2dcb6] shrink-0">
                            <CheckCircle2 className="w-3 h-3" />
                            TERSIMPAN
                          </span>
                        </div>

                        <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 space-y-1.5 text-xs">
                          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                            <span>Daftar Barang</span>
                            <span>
                              {rec.items.length} jenis • {totalQty} item
                            </span>
                          </div>
                          <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                            {rec.items.slice(0, 3).map((it, idx) => (
                              <div key={idx} className="flex items-center justify-between text-neutral-700">
                                <span className="truncate max-w-[170px]">
                                  {it.name}{' '}
                                  <span className="text-neutral-400">
                                    ×{it.quantity} {it.unit}
                                  </span>
                                </span>
                                <span className="font-semibold text-neutral-900 text-right">
                                  {formatRupiah(it.subtotal)}
                                </span>
                              </div>
                            ))}
                            {rec.items.length > 3 && (
                              <div className="text-[10px] text-neutral-400 italic pt-0.5">
                                +{rec.items.length - 3} barang lainnya...
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div>
                            <div className="text-[10px] uppercase font-bold text-neutral-400">
                              Metode Bayar
                            </div>
                            <div className="text-xs font-bold text-neutral-800 uppercase mt-0.5">
                              {rec.payment_method}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] uppercase font-bold text-neutral-400">
                              Total Belanja
                            </div>
                            <div className="text-base font-black text-[#4a5829] mt-0.5">
                              {formatRupiah(rec.total_amount)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-neutral-100 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedScanned(rec)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#4a5829] hover:bg-[#3d4922] text-[#e8f699] text-xs font-bold shadow-2xs transition cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Detail &amp; Cetak</span>
                        </button>

                        <a
                          href={`https://wa.me/?text=${getWaScannedReceiptMessage(rec)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Bagikan Struk via WhatsApp"
                          className="p-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 hover:text-emerald-600 transition"
                        >
                          <Share2 className="w-4 h-4" />
                        </a>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(rec)}
                          title="Hapus struk ini"
                          className="p-2 rounded-xl border border-neutral-200 bg-white hover:bg-red-50 text-neutral-500 hover:text-red-600 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: NOTA DIGITAL WARUNG (TRANSAKSI KASIR & ONLINE) */}
        {activeTab === 'digital' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-2xs">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  fetchTransactions(searchQuery);
                }}
                className="relative"
              >
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nota digital berdasarkan No. Pesanan / Transaksi, nama pembeli, atau No. HP..."
                  className="w-full pl-10 pr-24 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#4a5829] focus:bg-white transition"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-[#4a5829] text-[#e8f699] text-xs font-bold hover:bg-[#3d4922] transition cursor-pointer"
                >
                  Cari Nota
                </button>
              </form>
            </div>

            {isLoadingTrx && (
              <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200/80 space-y-3">
                <RefreshCw className="w-8 h-8 text-[#4a5829] animate-spin mx-auto" />
                <p className="text-sm font-bold text-neutral-700">Memuat riwayat nota digital...</p>
              </div>
            )}

            {!isLoadingTrx && transactions.length === 0 && (
              <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200/80 space-y-4">
                <div className="w-16 h-16 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center mx-auto">
                  <Receipt className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-base sm:text-lg font-black text-neutral-900">
                    Tidak Ada Nota Digital Ditemukan
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-500">
                    {searchQuery
                      ? `Tidak ada transaksi dengan kata kunci "${searchQuery}".`
                      : requireLogin
                      ? 'Silakan masuk dengan Google atau cari berdasarkan nomor telepon atau ID pesanan di atas.'
                      : 'Belum ada riwayat pesanan online atau kasir untuk akun ini.'}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Link
                    href="/dashboard/pelanggan"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4a5829] text-[#e8f699] font-bold text-xs hover:bg-[#3d4922] transition shadow-xs"
                  >
                    <Store className="w-4 h-4" />
                    <span>Belanja di Katalog</span>
                  </Link>
                </div>
              </div>
            )}

            {!isLoadingTrx && transactions.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {transactions.map((trx) => {
                  const itemsCount = trx.items?.length || 0;
                  const isPaid =
                    trx.payment_status === 'PAID' || trx.payment_status === 'SETTLEMENT';

                  return (
                    <div
                      key={trx.id}
                      className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-2xs hover:shadow-xs transition space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider block">
                              #{trx.id.slice(0, 18)}
                            </span>
                            <h4 className="text-sm font-extrabold text-neutral-950">
                              {trx.customer_name || 'Pelanggan Wadira'}
                            </h4>
                            <div className="flex items-center gap-1 text-[11px] text-neutral-500">
                              <Clock className="w-3 h-3 text-neutral-400" />
                              <span>{formatDate(trx.created_at)}</span>
                            </div>
                          </div>

                          <div>
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                LUNAS
                              </span>
                            ) : trx.payment_status === 'CANCEL' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-red-100 text-red-700 border border-red-200">
                                <X className="w-3 h-3" />
                                DITOLAK / BATAL
                              </span>
                            ) : trx.payment_method === 'CREDIT' && trx.payment_status === 'PENDING' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-200">
                                <Clock className="w-3 h-3" />
                                MENUNGGU IZIN KASBON
                              </span>
                            ) : trx.payment_method === 'CREDIT' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-orange-100 text-orange-800 border border-orange-200">
                                <Clock className="w-3 h-3" />
                                KASBON AKTIF
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-200">
                                <Clock className="w-3 h-3" />
                                {trx.payment_status || 'PENDING'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 space-y-1.5 text-xs">
                          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                            <span>Daftar Belanja</span>
                            <span>{itemsCount} jenis barang</span>
                          </div>
                          <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                            {trx.items && trx.items.length > 0 ? (
                              trx.items.slice(0, 3).map((it, idx) => (
                                <div key={idx} className="flex items-center justify-between text-neutral-700">
                                  <span className="truncate max-w-[170px]">
                                    {it.name} <span className="text-neutral-400">×{it.quantity}</span>
                                  </span>
                                  <span className="font-semibold text-neutral-900 text-right">
                                    {formatRupiah(it.subtotal || it.price * it.quantity)}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <span className="text-neutral-400 italic">Item tidak tercatat detail</span>
                            )}

                            {itemsCount > 3 && (
                              <div className="text-[10px] text-neutral-400 italic pt-0.5">
                                +{itemsCount - 3} barang lainnya...
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div>
                            <div className="text-[10px] uppercase font-bold text-neutral-400">
                              Metode Bayar
                            </div>
                            <div className="text-xs font-bold text-neutral-800 uppercase mt-0.5">
                              {trx.payment_method || 'CASH'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] uppercase font-bold text-neutral-400">
                              Total Pembelian
                            </div>
                            <div className="text-base font-black text-[#4a5829] mt-0.5">
                              {formatRupiah(trx.total_amount)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-neutral-100 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedTrx(trx)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#4a5829] hover:bg-[#3d4922] text-[#e8f699] text-xs font-bold shadow-2xs transition cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Lihat &amp; Cetak Struk</span>
                        </button>

                        <a
                          href={`https://wa.me/6289516201846?text=${getWaReceiptMessage(trx)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Bagikan Struk via WhatsApp"
                          className="p-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 hover:text-emerald-600 transition"
                        >
                          <Share2 className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      <Footer />

      {/* Modal Detail Struk Hasil Scan */}
      {selectedScanned && (() => {
        const scannedPrintData: PrintableReceiptProps = {
          storeName: selectedScanned.store_name,
          storeSubtitle: 'Arsip Struk Belanja Pelanggan',
          receiptNumber: `#${selectedScanned.id}`,
          dateLabel: formatDate(selectedScanned.purchase_date),
          items: selectedScanned.items,
          totalAmount: selectedScanned.total_amount,
          paymentMethodLabel: selectedScanned.payment_method,
          notes: selectedScanned.notes || null,
          footerTitle: '*** ARSIP STRUK BELANJA ***',
          footerNote: 'Tersimpan di data riwayat belanja pelanggan Wadira.',
        };

        return (
          <>
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 print:hidden">
              <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between shrink-0">
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                    Arsip Struk Belanja Pelanggan
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedScanned(null)}
                    className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="overflow-y-auto">
                  <CustomerReceiptView receipt={scannedPrintData} variant="screen" />
                </div>

                <div className="space-y-2 shrink-0 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#4a5829] hover:bg-[#3d4922] text-[#e8f699] font-bold text-xs shadow-xs transition cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Cetak Struk</span>
                    </button>
                    <a
                      href={`https://wa.me/?text=${getWaScannedReceiptMessage(selectedScanned)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Bagikan WA</span>
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedScanned(null)}
                    className="w-full py-2 rounded-xl text-neutral-600 hover:bg-neutral-100 font-bold text-xs transition cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
            <PrintableReceiptPortal receipt={scannedPrintData} />
          </>
        );
      })()}

      {/* Modal Digital Receipt (Struk Thermal Wadira) */}
      {selectedTrx && (() => {
        const trxPrintData: PrintableReceiptProps = {
          storeName: 'WADIRA',
          storeSubtitle: 'Warung Madura & Layanan Digital',
          storeAddress: 'Jl. Mangga Raya No. 28, Perumnas Kamal',
          storePhone: 'WhatsApp: 0895-1620-1846',
          receiptNumber: `#${selectedTrx.id.slice(0, 16)}`,
          dateLabel: formatDate(selectedTrx.created_at),
          customerName: selectedTrx.customer_name || 'Umum',
          customerPhone: selectedTrx.customer_phone || null,
          cashierName: 'Kasir Toko Wadira',
          items: selectedTrx.items || [],
          totalAmount: selectedTrx.total_amount,
          shippingCost: Number(selectedTrx.shipping_cost || 0),
          paymentMethodLabel: selectedTrx.payment_method,
          paymentStatus: selectedTrx.payment_status || 'PAID (LUNAS)',
        };

        return (
          <>
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 print:hidden">
              <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between shrink-0">
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                    Struk Digital Resmi
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedTrx(null)}
                    className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="overflow-y-auto">
                  <CustomerReceiptView receipt={trxPrintData} variant="screen" />
                </div>

                <div className="space-y-2 shrink-0 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#4a5829] hover:bg-[#3d4922] text-[#e8f699] font-bold text-xs shadow-xs transition cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Cetak Struk</span>
                    </button>

                    <a
                      href={`https://wa.me/6289516201846?text=${getWaReceiptMessage(selectedTrx)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Kirim ke WhatsApp</span>
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedTrx(null)}
                    className="w-full py-2 rounded-xl text-neutral-600 hover:bg-neutral-100 font-bold text-xs transition cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
            <PrintableReceiptPortal receipt={trxPrintData} />
          </>
        );
      })()}

      {/* Confirm Delete Modal */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Struk Belanja?"
        description={
          deleteTarget
            ? `Data struk dari "${deleteTarget.store_name}" (${formatDate(
                deleteTarget.purchase_date
              )}) senilai ${formatRupiah(deleteTarget.total_amount)} akan dihapus permanen.`
            : ''
        }
        confirmLabel={isDeleting ? 'Menghapus...' : 'Hapus Struk'}
        tone="danger"
        onCancel={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (!isDeleting) void handleConfirmDelete();
        }}
      />
    </div>
  );
}
