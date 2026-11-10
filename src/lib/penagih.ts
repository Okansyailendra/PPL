export function hitungHariTelat(jatuhTempo: string, hariIni: Date = new Date()): number {
  const jt = new Date(jatuhTempo);
  jt.setHours(0, 0, 0, 0);
  const now = new Date(hariIni);
  now.setHours(0, 0, 0, 0);
  
  const diffTime = now.getTime() - jt.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

export function formatSapaanPelanggan(nama: string): string {
  if (!nama || !nama.trim()) return 'Bapak/Ibu Pelanggan';

  // Format tiap kata menjadi Title Case: 'okan' -> 'Okan', 'budi santoso' -> 'Budi Santoso'
  const formatted = nama
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  const lower = formatted.toLowerCase();
  // Cek apakah sudah mengandung sebutan kehormatan/panggilan
  if (
    lower.startsWith('pak ') ||
    lower.startsWith('bapak ') ||
    lower.startsWith('ibu ') ||
    lower.startsWith('bu ') ||
    lower.startsWith('mas ') ||
    lower.startsWith('mbak ') ||
    lower.startsWith('kak ')
  ) {
    return formatted;
  }

  return `Bapak/Ibu ${formatted}`;
}

export function buatPesanTagih({ 
  nama, 
  nominal, 
  hariTelat, 
  toko 
}: { 
  nama: string; 
  nominal: number; 
  hariTelat: number; 
  toko: string 
}): string {
  const rupiah = `Rp ${nominal.toLocaleString('id-ID')}`;
  const namaFormatted = formatSapaanPelanggan(nama);
  const tokoName = toko || 'Wadira';
  
  if (hariTelat <= 3) {
    return (
      `Halo ${namaFormatted},\n\n` +
      `Semoga sehat dan berkah selalu rezekinya ya.\n\n` +
      `Sekadar mengingatkan dari ${tokoName}, ada catatan kasbon belanja sebesar *${rupiah}* yang sudah jatuh tempo.\n\n` +
      `Bila sedang ada waktu luang atau lewat di depan warung, silakan mampir untuk penyelesaiannya ya.\n\n` +
      `Terima kasih banyak atas perhatian dan kerja samanya!`
    );
  } else if (hariTelat <= 14) {
    return (
      `Halo ${namaFormatted},\n\n` +
      `Mohon maaf mengganggu waktunya sebentar ya.\n\n` +
      `Kami dari ${tokoName} ingin mengingatkan kembali perihal catatan kasbon sebesar *${rupiah}* yang sudah lewat jatuh tempo selama ${hariTelat} hari.\n\n` +
      `Jika memungkinkan, mohon dibantu untuk penyelesaiannya dalam waktu dekat ya, agar perputaran modal belanja stok warung kami tetap lancar.\n\n` +
      `Bila ada kendala atau ingin dicicil terlebih dahulu, silakan kabari kami ya. Terima kasih banyak atas pengertian dan kerja samanya!`
    );
  } else {
    return (
      `Halo ${namaFormatted},\n\n` +
      `Semoga selalu dalam keadaan sehat.\n\n` +
      `Kami dari pengelola ${tokoName} ingin mengonfirmasi kembali terkait tunggakan kasbon sebesar *${rupiah}* yang sudah melewati batas waktu selama ${hariTelat} hari.\n\n` +
      `Mengingat perputaran modal warung sangat kami butuhkan untuk kulakan barang dagangan, kami mohon bantuannya agar dapat diselesaikan dalam minggu ini.\n\n` +
      `Silakan mampir ke warung atau hubungi nomor ini bila ingin penyelesaian via transfer. Atas itikad baik dan perhatiannya, kami ucapkan terima kasih banyak.`
    );
  }
}

export function buatPesanOrder({ 
  agen, 
  toko, 
  items 
}: { 
  agen: string; 
  toko: string; 
  items: { nama: string; jumlah: number; satuan: string }[] 
}): string {
  const itemList = items.map(i => `- ${i.nama} (${i.jumlah} ${i.satuan})`).join('\n');
  return `Halo ${agen},\n\nIni dari ${toko}. Saya mau pesan barang-barang berikut untuk restock warung:\n\n${itemList}\n\nMohon info ketersediaan stok, total harga, dan perkiraan waktu pengirimannya ya. Terima kasih!`;
}

export function normalisasiNomor(noHp?: string | null): string | null {
  if (!noHp) return null;
  // Hilangkan karakter selain angka dan plus
  let cleaned = noHp.replace(/[^\d+]/g, '');
  
  // Jika mulai dengan +62, hilangkan + nya
  if (cleaned.startsWith('+62')) {
    cleaned = cleaned.substring(1);
  }
  // Jika mulai dengan 0, ganti dengan 62
  else if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  }
  // Jika tidak ada 62 di depan tapi panjang memadai, asumsikan +62 terlewat
  else if (!cleaned.startsWith('62') && cleaned.length >= 9) {
    cleaned = '62' + cleaned;
  }
  
  // Validasi panjang minimal nomor telepon Indonesia
  if (cleaned.length < 10 || cleaned.length > 15) return null;
  
  return cleaned;
}

export function linkWa(noHp: string, pesan: string): string {
  const norm = normalisasiNomor(noHp);
  if (!norm) return '#';
  const encoded = encodeURIComponent(pesan);
  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  return isMobile
    ? `https://wa.me/${norm}?text=${encoded}`
    : `https://web.whatsapp.com/send?phone=${norm}&text=${encoded}`;
}
