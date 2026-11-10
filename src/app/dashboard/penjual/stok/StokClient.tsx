'use client';

import { useState, useRef, useEffect, FormEvent, ChangeEvent } from 'react';
import Link from 'next/link';
import {
  Package,
  AlertTriangle,
  Search,
  Plus,
  Barcode,
  Camera,
  Upload,
  X,
  Check,
  Edit2,
  Trash2,
  RefreshCw,
  Bell,
  ShoppingCart,
  Minus,
  Save,
  MessageCircle,
} from 'lucide-react';
import { addProduct, updateProduct, adjustProductStock, deleteProduct } from '@/app/actions/stok';
import { buatPesanOrder, linkWa, normalisasiNomor } from '@/lib/penagih';
import type { Product } from '@/types';

interface StokClientProps {
  initialProducts: Product[];
}

export default function StokClient({ initialProducts = [] }: StokClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'LOW'>('ALL');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isRestockOrderOpen, setIsRestockOrderOpen] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Supplier WA order states
  const [agenPhone, setAgenPhone] = useState('');
  const [previewOrderMsg, setPreviewOrderMsg] = useState('');

  // Barcode scanner states
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannerStatus, setScannerStatus] = useState('');
  const [scannerTab, setScannerTab] = useState<'camera' | 'manual' | 'photo'>('camera');
  const [scanAiLoading, setScanAiLoading] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Sync products if initialProducts changes
  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  const lowStockProducts = products.filter(p => p.stock <= p.min_stock);

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase());
    const isLow = p.stock <= p.min_stock;
    if (filter === 'LOW') return matchSearch && isLow;
    return matchSearch;
  });

  // Sound beep on barcode detection
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio permission or mute
    }
  };

  const handleBarcodeDetected = async (code: string) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsBarcodeModalOpen(false);

    const existing = products.find(p => p.name?.toLowerCase().includes(code.toLowerCase()));
    if (existing) {
      setSearch(existing.name.replace(/\s*\[.*?\]/g, '').trim());
      setSuccessMessage(`Barcode ditemukan: ${existing.name.replace(/\s*\[.*?\]/g, '').trim()} (Stok: ${existing.stock} ${existing.unit})`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } else {
      setErrorMessage('');
      setScannedBarcode(code);
      setIsAddModalOpen(true);
      setSuccessMessage(`Barcode baru (${code}) terdeteksi! Mencari data nama produk...`);

      try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
        const data = await res.json();
        let fetchedName = '';
        if (data.status === 1 && data.product && data.product.product_name) {
          fetchedName = data.product.product_name;
        }

        setTimeout(() => {
          const nameInput = document.getElementById('product-name-input') as HTMLInputElement | null;
          if (nameInput) {
            nameInput.value = fetchedName;
            nameInput.focus();
            if (fetchedName) {
              setSuccessMessage(`Info produk otomatis ditemukan: ${fetchedName}`);
            } else {
              setSuccessMessage(`Barcode baru (${code}) terdeteksi! Silakan lengkapi nama dan harga.`);
            }
          }
        }, 150);
      } catch {
        setTimeout(() => {
          const nameInput = document.getElementById('product-name-input') as HTMLInputElement | null;
          if (nameInput) {
            nameInput.value = '';
            nameInput.focus();
          }
        }, 150);
        setSuccessMessage(`Barcode baru (${code}) terdeteksi! Silakan lengkapi data barang.`);
      }
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  };

  // Camera Barcode Scanning logic
  useEffect(() => {
    let codeReaderInstance: { reset: () => void; decodeFromConstraints: (...args: any[]) => Promise<any> } | null = null;

    if (isBarcodeModalOpen && scannerTab === 'camera') {
      const startCamera = async () => {
        try {
          setScannerStatus('Mengaktifkan kamera...');
          const { BrowserMultiFormatReader } = await import('@zxing/library');
          codeReaderInstance = new BrowserMultiFormatReader();
          setScannerStatus('Arahkan kamera ke barcode produk...');

          if (videoRef.current) {
            codeReaderInstance.decodeFromConstraints(
              { video: { facingMode: 'environment' } },
              videoRef.current,
              (result: any) => {
                if (result) {
                  const detectedCode = result.getText();
                  playBeep();
                  handleBarcodeDetected(detectedCode);
                  if (codeReaderInstance) {
                    codeReaderInstance.reset();
                  }
                }
              }
            ).catch((err: any) => {
              console.log('ZXing scan error:', err);
            });
          }
        } catch (err) {
          console.error('Camera error:', err);
          setScannerStatus('Tidak dapat mengakses kamera. Pastikan izin kamera aktif.');
        }
      };

      startCamera();
    } else {
      if (codeReaderInstance) {
        codeReaderInstance.reset();
      }
    }

    return () => {
      if (codeReaderInstance) {
        codeReaderInstance.reset();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [isBarcodeModalOpen, scannerTab]);

  const handleManualBarcodeLookup = (e: FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    handleBarcodeDetected(barcodeInput.trim());
    setBarcodeInput('');
  };

  const handleBarcodePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanAiLoading(true);
    setScannerStatus('AI sedang menganalisis foto produk/barcode...');

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const res = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: reader.result })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setIsBarcodeModalOpen(false);
        setIsAddModalOpen(true);
        setSuccessMessage('AI berhasil membaca info produk dari foto!');
      } catch (err: any) {
        alert('Gagal mendeteksi barcode dari foto: ' + err.message);
      } finally {
        setScanAiLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Add Product Submit
  const handleAddSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    const form = e.currentTarget;
    const formData = new FormData(form);
    const barcode = (formData.get('barcode') as string)?.trim();
    if (barcode) {
      const name = formData.get('name') as string;
      formData.set('name', `${name} [${barcode}]`);
    }

    const res = await addProduct(formData);

    if (res?.error) {
      setErrorMessage(res.error);
      setLoading(false);
    } else {
      setSuccessMessage('Barang berhasil ditambahkan ke inventaris!');
      setIsAddModalOpen(false);
      setScannedBarcode('');
      form.reset();
      setLoading(false);
      window.location.reload();
    }
  };

  // Edit Product Submit
  const handleEditSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    const form = e.currentTarget;
    const formData = new FormData(form);
    const barcode = (formData.get('barcode') as string)?.trim();
    if (barcode) {
      const name = formData.get('name') as string;
      formData.set('name', `${name} [${barcode}]`);
    }

    const res = await updateProduct(formData);

    if (res?.error) {
      setErrorMessage(res.error);
      setLoading(false);
    } else {
      setSuccessMessage('Data barang berhasil diperbarui!');
      setIsEditModalOpen(false);
      setSelectedProduct(null);
      setLoading(false);
      window.location.reload();
    }
  };

  // Quick adjust stock (+1 / -1)
  const handleQuickAdjustStock = async (product: Product, delta: number) => {
    const res = await adjustProductStock(product.id, delta);
    if (res?.success && res.newStock !== undefined) {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: res.newStock! } : p));
    } else if (res?.error) {
      alert(res.error);
    }
  };

  // Delete product
  const handleDelete = async (product: Product) => {
    if (!confirm(`Yakin ingin menghapus "${product.name}" dari inventaris warung?`)) return;

    const res = await deleteProduct(product.id);
    if (res?.success) {
      setProducts(prev => prev.filter(p => p.id !== product.id));
      setSuccessMessage(`Barang "${product.name}" telah dihapus.`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } else if (res?.error) {
      alert(res.error);
    }
  };

  // Open Edit Modal helper
  const openEditModal = (product: Product) => {
    setSelectedProduct(product);
    setErrorMessage('');
    setIsEditModalOpen(true);
  };

  // Generate WA Restock order
  const handleOpenRestockOrder = () => {
    const msg = buatPesanOrder({
      agen: 'Agen / Supplier',
      toko: 'Warung Madura',
      items: lowStockProducts.map(p => ({
        nama: p.name.replace(/\s*\[.*?\]/g, '').trim(),
        jumlah: Math.max(1, (p.min_stock * 2) - p.stock),
        satuan: p.unit || 'Pcs'
      }))
    });
    setPreviewOrderMsg(msg);
    setIsRestockOrderOpen(true);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12">
      {/* Toast Messages */}
      {successMessage && (
        <div className="bg-[#eef5db] border border-[#d6e5b4] text-[#3a471f] px-4 py-3 rounded-xl flex items-center justify-between text-xs sm:text-sm font-semibold shadow-xs transition-all">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#465427] shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-neutral-500 hover:text-neutral-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
            PERSEDIAAN / INVENTARIS WARUNG
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
            Stok & restock
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Kelola ketersediaan barang dan batas minimum agar kebutuhan restock mudah terlihat.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/dashboard/penjual/transaksi"
            className="inline-flex items-center gap-2 bg-white hover:bg-neutral-50 text-neutral-700 text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl border border-neutral-300 transition shadow-xs"
          >
            <ShoppingCart className="w-4 h-4 text-neutral-500" />
            <span>Input Penjualan (Kasir)</span>
          </Link>

          <button
            onClick={() => {
              setScannedBarcode('');
              setErrorMessage('');
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 bg-[#cbf14e] hover:bg-[#bde343] text-[#1c240d] text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition shadow-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Tambah Barang</span>
          </button>
        </div>
      </div>

      {/* Top Metric Banner (bg-[#cbf14e]) */}
      <div className="bg-[#cbf14e] text-[#1c240d] rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 divide-y md:divide-y-0 md:divide-x divide-black/10">
          {/* Col 1: Inventaris Terdaftar */}
          <div className="pt-2 md:pt-0">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-black/70 mb-2">
              INVENTARIS TERDAFTAR
            </p>
            <div className="text-4xl sm:text-5xl font-black tracking-tight text-[#1c240d]">
              {products.length} SKU
            </div>
          </div>

          {/* Col 2: Perlu Restock */}
          <div className="pt-4 md:pt-0 md:pl-8">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-black/70 mb-2">
              PERLU RESTOCK
            </p>
            <div className="text-4xl sm:text-5xl font-black tracking-tight text-[#1c240d]">
              {lowStockProducts.length} barang
            </div>
            {lowStockProducts.length > 0 && (
              <button
                onClick={handleOpenRestockOrder}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#1c240d] hover:underline"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Buat Pesanan Kulakan ke Agen</span>
              </button>
            )}
          </div>

          {/* Col 3: Status Summary */}
          <div className="pt-4 md:pt-0 md:pl-8 flex flex-col justify-center">
            <h3 className="text-base sm:text-lg font-black text-[#1c240d] mb-1">
              Status: {lowStockProducts.length > 0 ? 'Perlu Restock' : 'Aman'}
            </h3>
            <p className="text-xs sm:text-sm text-black/75 leading-relaxed">
              {lowStockProducts.length > 0
                ? `${lowStockProducts.length} barang berada di atau di bawah batas minimum. Segera siapkan kulakan ke agen agar penjualan tidak terhambat.`
                : products.length === 0
                ? 'Belum ada barang di inventaris. Tambahkan barang untuk mengaktifkan pemantauan stok minimum.'
                : 'Semua persediaan barang berada di atas batas minimum. Operasional warung berjalan normal.'}
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari barang di warung..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#cbf14e] focus:border-transparent transition"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 bg-neutral-100/70 p-1 rounded-xl">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filter === 'ALL'
                  ? 'bg-[#cbf14e] text-[#1c240d] shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Semua ({products.length})
            </button>
            <button
              onClick={() => setFilter('LOW')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filter === 'LOW'
                  ? 'bg-[#cbf14e] text-[#1c240d] shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Kritis ({lowStockProducts.length})
            </button>
          </div>
        </div>

        {/* Scan Barcode Button */}
        <button
          onClick={() => {
            setScannerTab('camera');
            setIsBarcodeModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 bg-white hover:bg-neutral-50 text-neutral-700 text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl border border-neutral-300 transition shadow-xs shrink-0"
        >
          <Barcode className="w-4 h-4 text-neutral-600" />
          <span>Scan Barcode</span>
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-xs overflow-hidden">
        {/* Table Header Row with pale sage `#eef3e2` */}
        <div className="bg-[#eef3e2] border-b border-neutral-200/80 px-4 sm:px-6 py-3.5 grid grid-cols-12 text-[11px] font-bold uppercase tracking-wider text-neutral-700">
          <div className="col-span-5 sm:col-span-4">NAMA BARANG</div>
          <div className="col-span-3 sm:col-span-2">HARGA JUAL</div>
          <div className="hidden sm:block sm:col-span-2">STOK SAAT INI</div>
          <div className="hidden sm:block sm:col-span-2">BATAS MINIMUM</div>
          <div className="col-span-2 sm:col-span-1">STATUS</div>
          <div className="col-span-2 sm:col-span-1 text-right">AKSI</div>
        </div>

        {/* Table Content */}
        {filteredProducts.length === 0 ? (
          /* Empty State */
          <div className="p-8 sm:p-14">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-[#eef5db] text-[#465427] flex items-center justify-center shrink-0">
                <Package className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="text-base sm:text-lg font-bold text-neutral-900">
                  {search
                    ? 'Barang tidak ditemukan.'
                    : filter === 'LOW'
                    ? 'Tidak ada barang berstatus kritis.'
                    : 'Mulai dari barang pertama.'}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed max-w-2xl">
                  {search
                    ? `Tidak ada inventaris yang cocok dengan kata kunci "${search}". Coba cari kata kunci lain atau scan barcode produk.`
                    : filter === 'LOW'
                    ? 'Kabar baik! Seluruh ketersediaan barang inventaris Anda saat ini masih berada di atas batas minimum restock.'
                    : 'Belum ada barang di inventaris warung Anda. Catat nama, harga jual, stok awal, dan batas minimum restock untuk mulai berjualan.'}
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setScannedBarcode('');
                      setErrorMessage('');
                      setIsAddModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 bg-[#cbf14e] hover:bg-[#bde343] text-[#1c240d] font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition shadow-xs"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Tambah Barang Sekarang</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Item Rows */
          <div className="divide-y divide-neutral-100">
            {filteredProducts.map((product) => {
              const isLow = product.stock <= product.min_stock;
              const cleanName = product.name?.replace(/\s*\[.*?\]/g, '').trim();
              const barcodeMatch = product.name?.match(/\[(.*?)\]/);
              const barcode = barcodeMatch ? barcodeMatch[1] : null;

              return (
                <div
                  key={product.id}
                  className="px-4 sm:px-6 py-4 grid grid-cols-12 items-center hover:bg-neutral-50/60 transition text-xs sm:text-sm"
                >
                  {/* Nama Barang */}
                  <div className="col-span-5 sm:col-span-4 pr-3">
                    <p className="font-bold text-neutral-900 line-clamp-1">{cleanName}</p>
                    {barcode && (
                      <span className="inline-block mt-0.5 text-[10px] font-mono text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200">
                        {barcode}
                      </span>
                    )}
                    {/* Mobile only sub-info */}
                    <div className="sm:hidden text-[11px] text-neutral-500 mt-1">
                      Stok: <span className="font-semibold text-neutral-800">{product.stock} {product.unit}</span> (Min: {product.min_stock})
                    </div>
                  </div>

                  {/* Harga Jual */}
                  <div className="col-span-3 sm:col-span-2 font-semibold text-neutral-800">
                    Rp {product.price.toLocaleString('id-ID')}
                  </div>

                  {/* Stok Saat Ini (Desktop) */}
                  <div className="hidden sm:flex sm:col-span-2 items-center gap-2">
                    <button
                      onClick={() => handleQuickAdjustStock(product, -1)}
                      title="Kurangi stok (-1)"
                      className="p-1 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-600 transition"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className={`font-bold ${isLow ? 'text-amber-700' : 'text-neutral-900'}`}>
                      {product.stock} {product.unit}
                    </span>
                    <button
                      onClick={() => handleQuickAdjustStock(product, 1)}
                      title="Tambah stok (+1)"
                      className="p-1 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-600 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Batas Minimum (Desktop) */}
                  <div className="hidden sm:block sm:col-span-2 text-neutral-600">
                    {product.min_stock} {product.unit}
                  </div>

                  {/* Status */}
                  <div className="col-span-2 sm:col-span-1">
                    {isLow ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                        Kritis
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                        Aman
                      </span>
                    )}
                  </div>

                  {/* Aksi */}
                  <div className="col-span-2 sm:col-span-1 flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEditModal(product)}
                      title="Edit barang"
                      className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product)}
                      title="Hapus barang"
                      className="p-1.5 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-600 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Table Footer Bar */}
        <div className="bg-[#f0f4e8] border-t border-neutral-200/80 px-5 py-3 flex items-center justify-between text-xs text-neutral-600">
          <span>{filteredProducts.length} barang ditampilkan</span>
          <span className="font-medium text-neutral-500">Semua Inventaris</span>
        </div>
      </div>

      {/* Bottom 3-Column Feature Explanations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-3">
        {/* Feature 1 */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-neutral-900">Catat stok awal</h4>
            <p className="text-[11px] sm:text-xs text-neutral-500 mt-0.5">
              Masukkan jumlah barang yang tersedia di warung.
            </p>
          </div>
        </div>

        {/* Feature 2 */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-neutral-900">Tentukan batas minimum</h4>
            <p className="text-[11px] sm:text-xs text-neutral-500 mt-0.5">
              Peringatan muncul ketika stok di bawah batas.
            </p>
          </div>
        </div>

        {/* Feature 3 */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-neutral-900">Stok mengikuti transaksi</h4>
            <p className="text-[11px] sm:text-xs text-neutral-500 mt-0.5">
              Penjualan mengurangi, kulakan menambah stok.
            </p>
          </div>
        </div>
      </div>

      {/* Page Footer Disclaimer */}
      <div className="pt-6 border-t border-neutral-200/60 flex items-center justify-between text-[11px] text-neutral-400">
        <span>Wadira | Meja operasional warung</span>
        <span>Sistem Inventaris Digital</span>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Tambah Barang Inventaris (Matches uploaded_media_1_1794222064232) */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header: Lime Green bg-[#cbf14e] */}
            <div className="bg-[#cbf14e] px-6 py-5 border-b border-[#bde343] flex items-start justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#1c240d]/70">
                  STOK & RESTOCK / BARANG BARU
                </p>
                <h2 className="text-xl sm:text-2xl font-black text-[#1c240d] tracking-tight mt-0.5">
                  Tambah barang inventaris
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="inline-flex items-center gap-1.5 bg-white/90 hover:bg-white text-neutral-800 text-xs font-bold px-3 py-1.5 rounded-xl border border-neutral-200 shadow-xs transition"
              >
                <X className="w-3.5 h-3.5" />
                <span>Tutup</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddSubmit}>
              <div className="p-6 space-y-4">
                <p className="text-xs text-neutral-600">
                  Siapkan informasi barang untuk kasir dan pemantauan stok. Semua kolom bertanda * wajib diisi.
                </p>

                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
                    {errorMessage}
                  </div>
                )}

                {/* Optional barcode hidden/tag field */}
                {scannedBarcode && (
                  <input type="hidden" name="barcode" value={scannedBarcode} />
                )}

                {/* Nama Barang */}
                <div>
                  <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                    Nama barang *
                  </label>
                  <input
                    id="product-name-input"
                    type="text"
                    name="name"
                    required
                    placeholder="Contoh: Beras Ramos 5kg / Minyak Kita 1L"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#cbf14e] focus:border-transparent transition"
                  />
                  {scannedBarcode && (
                    <p className="text-[11px] text-neutral-500 mt-1 font-mono">
                      Barcode terhubung: <span className="font-bold text-neutral-800">{scannedBarcode}</span>
                    </p>
                  )}
                </div>

                {/* 2 Cols: Harga Jual & Satuan Barang */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                      Harga jual (Rp) *
                    </label>
                    <input
                      type="number"
                      name="price"
                      required
                      min="0"
                      placeholder="Masukkan harga jual"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#cbf14e] focus:border-transparent transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                      Satuan barang *
                    </label>
                    <select
                      name="unit"
                      defaultValue="Pcs"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#cbf14e] focus:border-transparent transition"
                    >
                      <option value="Pcs">Pcs</option>
                      <option value="Kg">Kg</option>
                      <option value="Liter">Liter</option>
                      <option value="Bungkus">Bungkus</option>
                      <option value="Dus">Dus</option>
                      <option value="Botol">Botol</option>
                      <option value="Sachet">Sachet</option>
                      <option value="Pak">Pak</option>
                      <option value="Renceng">Renceng</option>
                      <option value="Kaleng">Kaleng</option>
                    </select>
                  </div>
                </div>

                {/* 2 Cols: Stok Awal & Batas Minimum Restock */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                      Stok awal *
                    </label>
                    <input
                      type="number"
                      name="stock"
                      required
                      min="0"
                      placeholder="Masukkan jumlah stok awal"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#cbf14e] focus:border-transparent transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                      Batas minimum restock *
                    </label>
                    <input
                      type="number"
                      name="min_stock"
                      required
                      min="0"
                      defaultValue="5"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#cbf14e] focus:border-transparent transition"
                    />
                  </div>
                </div>

                {/* Helper Alert Box */}
                <div className="bg-[#eef5db] border border-[#d6e5b4] rounded-xl p-3 flex items-start gap-2.5 text-xs text-[#3a471f]">
                  <Bell className="w-4 h-4 text-[#465427] shrink-0 mt-0.5" />
                  <p>
                    Peringatan muncul jika stok di bawah angka batas minimum. Nilai awal batas restock adalah 5.
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-neutral-100 px-6 py-4 bg-neutral-50/60 flex items-center justify-between">
                <span className="text-xs text-neutral-400 italic">
                  Barang belum disimpan.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-xl transition shadow-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Batal</span>
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-[#1c240d] bg-[#cbf14e] hover:bg-[#bde343] rounded-xl transition shadow-xs disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{loading ? 'Menyimpan...' : 'Simpan Barang'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Ubah Data Barang (Edit Modal) */}
      {/* ========================================================================= */}
      {isEditModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#cbf14e] px-6 py-5 border-b border-[#bde343] flex items-start justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#1c240d]/70">
                  STOK & RESTOCK / EDIT BARANG
                </p>
                <h2 className="text-xl sm:text-2xl font-black text-[#1c240d] tracking-tight mt-0.5">
                  Ubah data barang inventaris
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="inline-flex items-center gap-1.5 bg-white/90 hover:bg-white text-neutral-800 text-xs font-bold px-3 py-1.5 rounded-xl border border-neutral-200 shadow-xs transition"
              >
                <X className="w-3.5 h-3.5" />
                <span>Tutup</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleEditSubmit}>
              <input type="hidden" name="id" value={selectedProduct.id} />
              
              <div className="p-6 space-y-4">
                <p className="text-xs text-neutral-600">
                  Perbarui nama, harga jual, stok aktual, atau batas minimum barang ini.
                </p>

                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
                    {errorMessage}
                  </div>
                )}

                {/* Nama Barang */}
                <div>
                  <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                    Nama barang *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={selectedProduct.name.replace(/\s*\[.*?\]/g, '').trim()}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#cbf14e] focus:border-transparent transition"
                  />
                </div>

                {/* 2 Cols: Harga Jual & Satuan Barang */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                      Harga jual (Rp) *
                    </label>
                    <input
                      type="number"
                      name="price"
                      required
                      min="0"
                      defaultValue={selectedProduct.price}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#cbf14e] focus:border-transparent transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                      Satuan barang *
                    </label>
                    <select
                      name="unit"
                      defaultValue={selectedProduct.unit || 'Pcs'}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#cbf14e] focus:border-transparent transition"
                    >
                      <option value="Pcs">Pcs</option>
                      <option value="Kg">Kg</option>
                      <option value="Liter">Liter</option>
                      <option value="Bungkus">Bungkus</option>
                      <option value="Dus">Dus</option>
                      <option value="Botol">Botol</option>
                      <option value="Sachet">Sachet</option>
                      <option value="Pak">Pak</option>
                      <option value="Renceng">Renceng</option>
                      <option value="Kaleng">Kaleng</option>
                    </select>
                  </div>
                </div>

                {/* 2 Cols: Stok Saat Ini & Batas Minimum */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                      Stok saat ini *
                    </label>
                    <input
                      type="number"
                      name="stock"
                      required
                      min="0"
                      defaultValue={selectedProduct.stock}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#cbf14e] focus:border-transparent transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                      Batas minimum restock *
                    </label>
                    <input
                      type="number"
                      name="min_stock"
                      required
                      min="0"
                      defaultValue={selectedProduct.min_stock}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#cbf14e] focus:border-transparent transition"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-neutral-100 px-6 py-4 bg-neutral-50/60 flex items-center justify-between">
                <span className="text-xs text-neutral-400 italic">
                  ID: {selectedProduct.id.slice(0, 8)}...
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-xl transition shadow-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Batal</span>
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-[#1c240d] bg-[#cbf14e] hover:bg-[#bde343] rounded-xl transition shadow-xs disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{loading ? 'Menyimpan...' : 'Perbarui Barang'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Barcode Scanner Modal (Camera / Manual / Photo AI) */}
      {/* ========================================================================= */}
      {isBarcodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-[#cbf14e] px-6 py-4 border-b border-[#bde343] flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#1c240d]/70">
                  PEMINDAI BARCODE
                </p>
                <h3 className="text-lg font-black text-[#1c240d]">
                  Scan Barcode Produk
                </h3>
              </div>
              <button
                onClick={() => setIsBarcodeModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-neutral-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="flex border-b border-neutral-100 bg-neutral-50 px-4 pt-2 gap-2">
              <button
                onClick={() => setScannerTab('camera')}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                  scannerTab === 'camera'
                    ? 'border-[#465427] text-[#465427]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Kamera Langsung</span>
              </button>
              <button
                onClick={() => setScannerTab('manual')}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                  scannerTab === 'manual'
                    ? 'border-[#465427] text-[#465427]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <Barcode className="w-3.5 h-3.5" />
                <span>Ketik Manual</span>
              </button>
              <button
                onClick={() => setScannerTab('photo')}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                  scannerTab === 'photo'
                    ? 'border-[#465427] text-[#465427]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Unggah Foto AI</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-6">
              {scannerTab === 'camera' && (
                <div className="space-y-4">
                  <div className="relative aspect-4/3 bg-black rounded-xl overflow-hidden flex items-center justify-center">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                    />
                    <div className="absolute inset-x-8 inset-y-12 border-2 border-[#cbf14e] rounded-xl pointer-events-none animate-pulse flex items-center justify-center">
                      <span className="text-[10px] text-white/90 bg-black/60 px-2.5 py-1 rounded-md">
                        Arahkan garis ke barcode
                      </span>
                    </div>
                  </div>
                  <p className="text-center text-xs text-neutral-500 font-medium">
                    {scannerStatus || 'Arahkan kamera ke barcode produk...'}
                  </p>
                </div>
              )}

              {scannerTab === 'manual' && (
                <form onSubmit={handleManualBarcodeLookup} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                      Nomor Barcode / EAN-13
                    </label>
                    <input
                      type="text"
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      placeholder="Contoh: 8992388111023"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#cbf14e] focus:border-transparent"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#cbf14e] hover:bg-[#bde343] text-[#1c240d] font-bold text-xs rounded-xl transition shadow-xs"
                  >
                    Cari atau Daftarkan Produk
                  </button>
                </form>
              )}

              {scannerTab === 'photo' && (
                <div className="space-y-4 text-center">
                  <div className="border-2 border-dashed border-neutral-300 rounded-2xl p-8 hover:border-[#cbf14e] transition bg-neutral-50/50">
                    <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-neutral-800 mb-1">
                      Pilih atau foto kemasan produk
                    </p>
                    <p className="text-[11px] text-neutral-500 mb-4">
                      AI Gemini akan membaca nama barang, merek, dan barcode otomatis.
                    </p>
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#465427] hover:bg-[#39441f] text-white text-xs font-bold rounded-xl cursor-pointer transition shadow-xs">
                      <span>Pilih Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleBarcodePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {scanAiLoading && (
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#465427]">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{scannerStatus}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: Buat Pesanan Kulakan ke Agen via WhatsApp */}
      {/* ========================================================================= */}
      {isRestockOrderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#cbf14e] px-6 py-4 border-b border-[#bde343] flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#1c240d]/70">
                  PESANAN KULAKAN / RESTOCK
                </p>
                <h3 className="text-lg font-black text-[#1c240d]">
                  Kirim Pesanan ke Agen via WA
                </h3>
              </div>
              <button
                onClick={() => setIsRestockOrderOpen(false)}
                className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-neutral-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                  Nomor WhatsApp Agen / Supplier
                </label>
                <input
                  type="text"
                  value={agenPhone}
                  onChange={(e) => setAgenPhone(e.target.value)}
                  placeholder="0812xxxxxxx"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#cbf14e] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                  Draft Pesanan Otomatis ({lowStockProducts.length} barang)
                </label>
                <textarea
                  rows={6}
                  value={previewOrderMsg}
                  onChange={(e) => setPreviewOrderMsg(e.target.value)}
                  className="w-full p-3 font-mono text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#cbf14e]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRestockOrderOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-xl"
                >
                  Batal
                </button>
                <a
                  href={linkWa(normalisasiNomor(agenPhone || ''), previewOrderMsg)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Buka di WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
