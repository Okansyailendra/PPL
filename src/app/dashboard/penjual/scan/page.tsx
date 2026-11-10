'use client';

import { useState, useRef, ChangeEvent, DragEvent, useEffect } from 'react';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  FileText,
  Package,
  Info,
  RefreshCw,
  Copy,
  Check,
  X,
  ScanLine,
  Sparkles,
} from 'lucide-react';

export default function ScanPage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedPreview = localStorage.getItem('warung_scan_preview');
      const savedResult = localStorage.getItem('warung_scan_result');
      const savedFileName = localStorage.getItem('warung_scan_filename');
      if (savedPreview) setPreview(savedPreview);
      if (savedResult) setResult(savedResult);
      if (savedFileName) setFileName(savedFileName);
    } catch (e) {
      console.error('Failed to load scan history from localStorage:', e);
    }
  }, []);

  // Save to localStorage when changed
  useEffect(() => {
    try {
      if (preview) {
        localStorage.setItem('warung_scan_preview', preview);
      } else {
        localStorage.removeItem('warung_scan_preview');
      }
    } catch (e) {
      console.error('Failed to save preview to localStorage:', e);
    }
  }, [preview]);

  useEffect(() => {
    try {
      if (result) {
        localStorage.setItem('warung_scan_result', result);
      } else {
        localStorage.removeItem('warung_scan_result');
      }
    } catch (e) {
      console.error('Failed to save result to localStorage:', e);
    }
  }, [result]);

  useEffect(() => {
    try {
      if (fileName) {
        localStorage.setItem('warung_scan_filename', fileName);
      } else {
        localStorage.removeItem('warung_scan_filename');
      }
    } catch (e) {
      console.error('Failed to save fileName to localStorage:', e);
    }
  }, [fileName]);

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    setFileName(selectedFile.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
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
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      processFile(droppedFile);
    }
  };

  const handleClear = () => {
    setFile(null);
    setFileName('');
    setPreview(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleScan = async () => {
    if (!preview) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: preview }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setResult(data.result);
    } catch (error: any) {
      setResult(`Gagal menganalisis gambar: ${error?.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12">
      {/* Breadcrumb & Header */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
          ALAT BANTU / ANALISIS FOTO
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
          Scanner AI: nota & rak
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
          Unggah nota supplier untuk ekstraksi transaksi, atau foto rak untuk membantu mengecek kebutuhan restock.
        </p>
      </div>

      {/* Top 3-Step Process Banner (bg-[#cbf14e]) */}
      <div className="bg-[#cbf14e] text-[#1c240d] rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 divide-y md:divide-y-0 md:divide-x divide-black/10">
          {/* Step 01 */}
          <div className="flex items-start gap-3.5 pt-2 md:pt-0">
            <span className="text-3xl sm:text-4xl font-black text-[#1c240d] tracking-tight shrink-0 leading-none">
              01
            </span>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-[#1c240d]">
                Unggah foto
              </h3>
              <p className="text-xs text-black/75 mt-0.5">
                Pilih nota atau foto rak.
              </p>
            </div>
          </div>

          {/* Step 02 */}
          <div className="flex items-start gap-3.5 pt-4 md:pt-0 md:pl-8">
            <span className="text-3xl sm:text-4xl font-black text-[#1c240d] tracking-tight shrink-0 leading-none">
              02
            </span>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-[#1c240d]">
                Jalankan analisis
              </h3>
              <p className="text-xs text-black/75 mt-0.5">
                Mulai setelah foto dipilih.
              </p>
            </div>
          </div>

          {/* Step 03 */}
          <div className="flex items-start gap-3.5 pt-4 md:pt-0 md:pl-8">
            <span className="text-3xl sm:text-4xl font-black text-[#1c240d] tracking-tight shrink-0 leading-none">
              03
            </span>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-[#1c240d]">
                Tinjau hasil
              </h3>
              <p className="text-xs text-black/75 mt-0.5">
                Periksa data yang diekstrak.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Left (Unggah Foto) & Right (Hasil Analisis AI) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* ========================================================================= */}
        {/* LEFT CARD: Unggah Foto */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-xs p-6 sm:p-7 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg sm:text-xl font-extrabold text-neutral-900">
                Unggah foto
              </h2>
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                JPG / PNG
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 mb-5">
              Pilih foto nota bon supplier atau foto rak / etalase warung.
            </p>

            {/* Dashed Upload Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                if (!preview && fileInputRef.current) {
                  fileInputRef.current.click();
                }
              }}
              className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center transition min-h-[240px] relative ${
                isDragging
                  ? 'border-[#465427] bg-[#eef5db]/40'
                  : 'border-neutral-300 hover:border-[#cbf14e] bg-neutral-50/40'
              } ${!preview ? 'cursor-pointer' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                className="hidden"
                onChange={handleFileChange}
              />

              {preview ? (
                <div className="w-full flex flex-col items-center">
                  <div className="relative max-h-56 w-full rounded-xl overflow-hidden border border-neutral-200 bg-neutral-900/5 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt="Preview Foto"
                      className="max-h-56 w-auto object-contain p-2"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (fileInputRef.current) fileInputRef.current.click();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-xl transition shadow-xs"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Ganti Foto</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClear();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-xl transition shadow-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-500 mb-3">
                    <Upload className="w-6 h-6 stroke-[1.75]" />
                  </div>
                  <p className="text-sm sm:text-base font-bold text-neutral-800">
                    Pilih atau tarik foto ke sini
                  </p>
                  <p className="text-xs text-neutral-400 mt-1 mb-4">
                    Mendukung format JPG dan PNG
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (fileInputRef.current) fileInputRef.current.click();
                    }}
                    className="inline-flex items-center gap-1.5 bg-[#cbf14e] hover:bg-[#bde343] text-[#1c240d] text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Pilih foto</span>
                  </button>
                </div>
              )}
            </div>

            {/* Selection Status */}
            <div className="flex items-center gap-2 mt-4 text-xs font-medium">
              <span
                className={`w-2 h-2 rounded-full ${
                  preview ? 'bg-emerald-500' : 'bg-neutral-400'
                }`}
              />
              <span className={preview ? 'text-neutral-800 font-semibold' : 'text-neutral-500'}>
                {preview
                  ? `Foto siap: ${fileName || 'nota-warung.jpg'}`
                  : 'Belum ada foto dipilih'}
              </span>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-6 pt-2">
            <button
              onClick={handleScan}
              disabled={!preview || loading}
              className={`w-full py-3.5 px-5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-xs ${
                !preview
                  ? 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed'
                  : loading
                  ? 'bg-[#465427] text-white opacity-90 cursor-wait'
                  : 'bg-[#465427] hover:bg-[#39441f] text-white cursor-pointer'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#cbf14e]" />
                  <span>Sedang Menganalisis dengan AI...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
                  <span>Mulai Ekstrak Data</span>
                </>
              )}
            </button>
            <p className="text-xs text-neutral-400 mt-2 text-left">
              {preview
                ? 'Klik untuk memulai ekstraksi otomatis dengan Gemini AI.'
                : 'Pilih foto terlebih dahulu untuk mengaktifkan ekstraksi.'}
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT CARD: Hasil Analisis AI */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-xs p-6 sm:p-7 flex flex-col justify-between">
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-100">
              <h2 className="text-lg sm:text-xl font-extrabold text-neutral-900">
                Hasil analisis AI
              </h2>
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                {loading
                  ? 'MENGANALISIS...'
                  : result
                  ? 'SELESAI'
                  : 'MENUNGGU FOTO'}
              </span>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-[220px] flex flex-col justify-center">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#eef5db] text-[#465427] flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#465427]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-900">
                      Gemini sedang membaca foto...
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Mengekstrak teks nota atau menganalisis stok di etalase.
                    </p>
                  </div>
                </div>
              ) : result ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Hasil Ekstraksi Berhasil
                    </span>
                    <button
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-lg transition"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-neutral-500" />
                          <span>Salin Teks</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 text-xs sm:text-sm text-neutral-800 max-h-72 overflow-y-auto leading-relaxed whitespace-pre-wrap font-sans">
                    {result}
                  </div>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mb-3">
                    <ScanLine className="w-6 h-6 stroke-[1.75]" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-neutral-900">
                    Belum ada hasil.
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed max-w-sm mt-1">
                    Unggah foto lalu jalankan analisis. Hasil ekstraksi akan muncul di sini untuk Anda periksa kembali.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* YANG DAPAT DIBANTU Section */}
          <div className="pt-6 border-t border-neutral-100 mt-6 space-y-3">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">
              YANG DAPAT DIBANTU
            </p>

            <div className="space-y-3">
              {/* Item 1 */}
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-neutral-100 text-neutral-600 shrink-0 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-neutral-800">
                    Nota supplier
                  </h4>
                  <p className="text-[11px] sm:text-xs text-neutral-500">
                    Mengekstrak rincian barang dan data transaksi dari nota belanja.
                  </p>
                </div>
              </div>

              {/* Item 2 */}
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-neutral-100 text-neutral-600 shrink-0 mt-0.5">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-neutral-800">
                    Rak &amp; etalase
                  </h4>
                  <p className="text-[11px] sm:text-xs text-neutral-500">
                    Membantu mengecek stok yang habis dan kebutuhan restock dari foto.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Helper / Tips Banner at Bottom */}
      <div className="bg-[#eef5db] border border-[#d6e5b4] text-[#3a471f] rounded-2xl p-4 sm:p-5 flex items-start gap-3 shadow-xs">
        <Info className="w-5 h-5 text-[#465427] shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm leading-relaxed">
          Gunakan foto yang terang dan tidak buram. Pastikan seluruh nota atau bagian rak yang ingin diperiksa masuk dalam foto.
        </p>
      </div>

      {/* Page Footer Disclaimer */}
      <div className="pt-6 border-t border-neutral-200/60 flex items-center justify-between text-[11px] text-neutral-400">
        <span>Wadira | Meja operasional warung</span>
        <span>Asisten Scanner Berbasis AI</span>
      </div>
    </div>
  );
}
