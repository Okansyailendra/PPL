'use client';

import React from 'react';
import { CartProvider } from '@/context/CartContext';

export default function PelangganLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CartProvider>{children}</CartProvider>;
}
