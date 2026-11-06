'use client';

import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { X, Trash2, Plus, Minus, Send, ShoppingBag } from 'lucide-react';

export default function CartDrawer() {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    totalPrice,
    totalItems,
    fulfillmentType,
  } = useCart();

  const [customerName, setCustomerName] = useState('');
  const [customerNote, setCustomerNote] = useState('');

  if (!isCartOpen) return null;

  const handleCheckoutWA = () => {
    if (cart.length === 0) return;

    const phoneNumber = '6281234567890';

    const orderItemsText = cart
      .map(
        (item, index) =>
          `${index + 1}. ${item.product.name} (${item.quantity} ${item.product.unit || 'pcs'}) = Rp ${(item.product.price * item.quantity).toLocaleString('id-ID')}`
      )
      .join('\n');

    const formattedMessage = `*PESANAN BELANJA WARUNG MADURA (AlinStore)*
-------------------------------------
*Nama Pemesan:* ${customerName.trim() || 'Pelanggan Tetangga'}
*Metode:* ${fulfillmentType === 'pickup' ? 'Ambil di Warung' : 'Antar ke Rumah/Kos'}
*Alamat / Catatan:* ${customerNote.trim() || '-'}

*Daftar Belanja:*
${orderItemsText}
-------------------------------------
*Total Estimasi:* Rp ${totalPrice.toLocaleString('id-ID')}

_Mohon konfirmasi ketersediaan barang dan total pembayarannya ya Tante/Mbak Alin. Terima kasih!_`;

    const encodedMessage = encodeURIComponent(formattedMessage);
    const waUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="flex-1" onClick={() => setIsCartOpen(false)} />

      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Keranjang Belanja</h3>
              <p className="text-xs text-slate-500">{totalItems} produk dipilih</p>
            </div>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <ShoppingBag className="w-16 h-16 stroke-1 text-slate-300 mb-3" />
              <p className="font-semibold text-slate-700">Keranjang masih kosong</p>
              <p className="text-xs text-slate-400 mt-1">
                Pilih barang kebutuhan harian dari katalog lalu klik tanda tambah (+)
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white shadow-2xs gap-3"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-slate-800 truncate">
                    {item.product.name}
                  </h4>
                  <p className="text-xs text-emerald-600 font-medium">
                    Rp {item.product.price.toLocaleString('id-ID')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 active:scale-95 transition"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold text-slate-800">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center hover:bg-emerald-100 active:scale-95 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="ml-1 text-slate-300 hover:text-red-500 transition p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/70 space-y-3">
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Nama Anda
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Mbak Siti / Mas Budi"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Catatan / Kamar Kos / Alamat
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Kamar kos No. 3 lantai 2 / Titip di teras"
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="text-sm text-slate-500">Total Estimasi</span>
              <span className="text-lg font-bold text-slate-900">
                Rp {totalPrice.toLocaleString('id-ID')}
              </span>
            </div>

            <button
              onClick={handleCheckoutWA}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs shadow-emerald-600/20 active:scale-[0.99] transition"
            >
              <Send className="w-4 h-4" />
              <span>Pesan ke WhatsApp</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
