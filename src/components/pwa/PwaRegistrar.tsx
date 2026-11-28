'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

declare global {
  interface Window {
    __wadiraInstallPrompt?: any;
  }
}

export default function PwaRegistrar() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // 1. Registrasi Service Worker PWA
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => {
          console.warn('Registrasi Service Worker PWA dilewati:', err);
        });
    }

    // 2. Tangkap event beforeinstallprompt agar tombol Pasang App bisa memicu dialog native
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      window.__wadiraInstallPrompt = e;
      window.dispatchEvent(new CustomEvent('wadira:pwa-installable'));
    };

    const handleAppInstalled = () => {
      window.__wadiraInstallPrompt = null;
      window.dispatchEvent(new CustomEvent('wadira:pwa-installed'));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // 3. Auto-redirect pintar saat dibuka dari pintasan PWA di layar HP/Desktop
  useEffect(() => {
    if (typeof window === 'undefined' || pathname !== '/') return;

    const params = new URLSearchParams(window.location.search);
    const isPwaSource = params.get('source') === 'pwa';
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((window.navigator as any).standalone);

    if (!isPwaSource && !isStandalone) return;

    let cancelled = false;
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data?.success || !data?.user) return;
        const role = data.user.role;
        if (role === 'penjual' || role === 'admin') {
          router.replace('/dashboard/penjual');
        } else if (role === 'pelanggan') {
          router.replace('/dashboard/pelanggan');
        }
      })
      .catch(() => {
        // Biarkan tetap di halaman utama jika cek sesi gagal
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return null;
}
