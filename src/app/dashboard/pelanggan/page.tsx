'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Sidebar from '@/components/pembeli/Sidebar';
import TopHeader from '@/components/pembeli/TopHeader';
import HeroBanner from '@/components/pembeli/HeroBanner';
import SearchBar from '@/components/pembeli/SearchBar';
import CategorySidebar from '@/components/pembeli/CategorySidebar';
import ProductGrid from '@/components/pembeli/ProductGrid';
import CartDrawer from '@/components/pembeli/CartDrawer';
import Footer from '@/components/pembeli/Footer';
import { X, RefreshCw, AlertCircle } from 'lucide-react';
import type { Category, Product } from '@/types';
import { PRODUCTS as FALLBACK_PRODUCTS, CATEGORIES as FALLBACK_CATEGORIES } from '@/data/mockProducts';

export default function DashboardPelangganPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock'>('all');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Ambil data produk & kategori dari database secara real-time
  const loadCatalogData = async () => {
    try {
      setIsLoading(true);
      setFetchError(null);
      const res = await fetch('/api/catalog', { cache: 'no-store' });
      const json = await res.json();

      if (json?.success && json?.data) {
        if (json.data.products && json.data.products.length > 0) {
          setProducts(json.data.products);
        } else {
          setProducts(FALLBACK_PRODUCTS);
        }

        if (json.data.categories && json.data.categories.length > 0) {
          setCategories(json.data.categories);
        } else {
          setCategories(FALLBACK_CATEGORIES);
        }
      } else {
        throw new Error(json?.error || 'Gagal memuat katalog barang');
      }
    } catch (err: any) {
      console.warn('Gagal memuat katalog dari DB, menggunakan data fallback:', err);
      setFetchError('Koneksi katalog sedang offline, menampilkan persediaan terakhir.');
      setProducts(FALLBACK_PRODUCTS);
      setCategories(FALLBACK_CATEGORIES);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCatalogData();
  }, []);

  // Filter products based on search, category, and stock filter
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Category filter
      if (selectedCategory !== 'all') {
        const catMatch = product.category_id === selectedCategory || 
          String(product.category || '').toLowerCase() === selectedCategory.toLowerCase();
        if (!catMatch) return false;
      }

      // Stock status filter
      const stock = Number(product.stock) || 0;
      const minStock = Number(product.min_stock) || 5;
      const isLow = stock > 0 && stock <= minStock;

      if (stockFilter === 'in_stock' && stock <= 0) {
        return false;
      }
      if (stockFilter === 'low_stock' && !isLow) {
        return false;
      }

      // Search keyword filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesBrand = product.brand ? product.brand.toLowerCase().includes(query) : false;
        const matchesCategory = product.categoryLabel 
          ? product.categoryLabel.toLowerCase().includes(query) 
          : product.category 
            ? String(product.category).toLowerCase().includes(query)
            : false;

        if (!matchesName && !matchesBrand && !matchesCategory) {
          return false;
        }
      }

      return true;
    });
  }, [products, selectedCategory, searchQuery, stockFilter]);

  return (
    <div className="min-h-screen flex bg-[#fbfbf9]">
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
                className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100"
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
          {/* Breadcrumb & Page Heading */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-neutral-400 tracking-wider uppercase">
                TOKO WADIRA • ETALASE RESMI
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-neutral-950 tracking-tight">
                Belanja dekat, stok akurat &amp; lengkap.
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600">
                Sembako komplit dan kebutuhan warung harian langsung tersinkronisasi dengan kasir Toko Wadira.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadCatalogData}
                disabled={isLoading}
                title="Perbarui stok terkini"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-700 shadow-2xs transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-neutral-600 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Menyinkronkan...' : 'Sinkronkan Stok'}</span>
              </button>

              <div className="self-start px-3.5 py-1.5 rounded-full border border-[#e2edd8] bg-[#f2f7ec] text-xs font-bold text-emerald-800 shadow-2xs">
                Buka Setiap Hari • 06.00 – 24.00 WIB
              </div>
            </div>
          </div>

          {fetchError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{fetchError}</span>
            </div>
          )}

          {/* Hero Banner (Emerald Green) */}
          <HeroBanner />

          {/* Search Bar & Filter Buttons */}
          <SearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            stockFilter={stockFilter}
            setStockFilter={setStockFilter}
          />

          {/* Two Column Section: Category Sidebar + Product Grid */}
          <div className="flex flex-col lg:flex-row items-start gap-6 pt-1">
            <CategorySidebar
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              categories={categories}
            />

            <ProductGrid
              products={filteredProducts}
              totalProductsCount={products.length}
            />
          </div>

          {/* Footer */}
          <Footer />
        </main>
      </div>

      {/* Slide-over Cart Drawer */}
      <CartDrawer />
    </div>
  );
}
