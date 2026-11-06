'use client';

import React, { useState, useMemo } from 'react';
import { CartProvider } from '@/context/CartContext';
import Sidebar from '@/components/pembeli/Sidebar';
import TopHeader from '@/components/pembeli/TopHeader';
import HeroBanner from '@/components/pembeli/HeroBanner';
import SearchBar from '@/components/pembeli/SearchBar';
import CategorySidebar from '@/components/pembeli/CategorySidebar';
import ProductGrid from '@/components/pembeli/ProductGrid';
import CartDrawer from '@/components/pembeli/CartDrawer';
import Footer from '@/components/pembeli/Footer';
import { PRODUCTS } from '@/data/mockProducts';
import { X } from 'lucide-react';

export default function DashboardPelangganPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock'>('all');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Filter products based on search, category, and stock filter
  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((product) => {
      // Category filter
      if (selectedCategory !== 'all' && product.category !== selectedCategory) {
        return false;
      }

      // Stock status filter
      if (stockFilter === 'in_stock' && product.isLowStock) {
        return false;
      }
      if (stockFilter === 'low_stock' && !product.isLowStock) {
        return false;
      }

      // Search keyword filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesBrand = product.brand ? product.brand.toLowerCase().includes(query) : false;
        const matchesCategory = product.categoryLabel ? product.categoryLabel.toLowerCase().includes(query) : false;
        if (!matchesName && !matchesBrand && !matchesCategory) {
          return false;
        }
      }

      return true;
    });
  }, [selectedCategory, searchQuery, stockFilter]);

  return (
    <CartProvider>
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
            {/* Breadcrumb & Page Heading */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                  ALINSTORE &gt; ETALASE WARUNG
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Belanja dekat, nggak perlu repot.
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Oleh anak warung sebelum berangkat. Mau diambil atau diantar, tinggal pilih.
                </p>
              </div>

              <div className="self-start px-3 py-1 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-600 shadow-2xs">
                Operasional 06-21 WIB
              </div>
            </div>

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
              />

              <ProductGrid
                products={filteredProducts}
                totalProductsCount={PRODUCTS.length}
              />
            </div>

            {/* Footer */}
            <Footer />
          </main>
        </div>

        {/* Slide-over Cart Drawer */}
        <CartDrawer />
      </div>
    </CartProvider>
  );
}
