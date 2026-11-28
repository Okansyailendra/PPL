const express = require('express');
const cors = require('cors');
const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

function loadWaApiKeyFromEnvFiles() {
    if (process.env.WA_API_KEY) return process.env.WA_API_KEY;
    const candidates = [
        path.join(__dirname, '.env'),
        path.join(__dirname, '..', '.env.local'),
        path.join(__dirname, '..', '.env'),
    ];
    for (const filePath of candidates) {
        try {
            if (!fs.existsSync(filePath)) continue;
            const content = fs.readFileSync(filePath, 'utf8');
            for (const line of content.split(/\r?\n/)) {
                const match = line.match(/^\s*WA_API_KEY\s*=\s*(.+?)\s*$/);
                if (match) {
                    return match[1].replace(/^["']|["']$/g, '').trim();
                }
            }
        } catch {
            // ignore unreadable env candidate
        }
    }
    return '';
}

const app = express();

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '127.0.0.1';
const WA_API_KEY = loadWaApiKeyFromEnvFiles();
if (!WA_API_KEY || WA_API_KEY.length < 16) {
    console.error('❌ WA_API_KEY belum disetel (minimal 16 karakter). Tambahkan WA_API_KEY di .env.local atau environment.');
    process.exit(1);
}
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map(o => o.trim());

// 1. Batasi CORS hanya untuk origin aplikasi yang diizinkan
app.use(cors({
    origin: function (origin, callback) {
        // Izinkan request server-to-server (tanpa header origin) atau origin terdaftar
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Origin tidak diizinkan oleh kebijakan CORS'));
        }
    }
}));

// 2. Batasi ukuran body JSON untuk mencegah DoS
app.use(express.json({ limit: '100kb' }));

// 3. Middleware Autentikasi API Key
function requireApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '');
    if (!apiKey || apiKey !== WA_API_KEY) {
        return res.status(401).json({
            error: 'Unauthorized: API Key tidak valid atau header x-api-key tidak disertakan'
        });
    }
    next();
}

let sock = null;
let isConnected = false;

async function connectToWhatsApp() {
    try {
        const authPath = path.join(__dirname, 'auth_info_baileys');
        const { state, saveCreds } = await useMultiFileAuthState(authPath);
        
        sock = makeWASocket({
            auth: state,
            printQRInTerminal: true,
        });

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;
            if (qr) {
                console.log('📌 Silakan scan QR code di bawah untuk menghubungkan WhatsApp:');
                qrcode.generate(qr, { small: true });
            }
            if (connection === 'close') {
                isConnected = false;
                console.log('⚠️ Koneksi WhatsApp terputus, mencoba menyambung kembali...');
                setTimeout(connectToWhatsApp, 5000);
            } else if (connection === 'open') {
                isConnected = true;
                console.log('✅ WhatsApp Berhasil Terhubung!');
            }
        });

        sock.ev.on('creds.update', saveCreds);
    } catch (err) {
        console.error('Error saat inisialisasi koneksi WhatsApp:', err);
        isConnected = false;
    }
}

// Endpoint status kesehatan bot (bisa diakses tanpa token untuk monitoring)
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        whatsappConnected: isConnected,
        timestamp: new Date().toISOString()
    });
});

// Endpoint untuk mengirim pesan (Wajib menyertakan Header x-api-key)
app.post('/send-message', requireApiKey, async (req, res) => {
    const { phone, message } = req.body || {};

    if (!sock || !isConnected) {
        return res.status(503).json({ error: 'Layanan WhatsApp belum siap atau belum terhubung' });
    }

    if (!phone || typeof phone !== 'string' || !message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Parameter phone dan message wajib diisi berupa teks' });
    }

    // Bersihkan nomor telepon dari spasi, tanda minus, dan karakter non-digit
    const rawDigits = phone.replace(/\D/g, '');
    if (rawDigits.length < 9 || rawDigits.length > 16) {
        return res.status(400).json({ error: 'Nomor telepon tidak valid (panjang harus antara 9-16 digit)' });
    }

    // Format nomor HP ke format internasional WhatsApp (628xxxxxxxx)
    let formattedPhone = rawDigits;
    if (formattedPhone.startsWith('0')) {
        formattedPhone = '62' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('62')) {
        formattedPhone = '62' + formattedPhone;
    }

    // Batasi panjang pesan teks maksimal 4096 karakter
    if (message.length > 4096) {
        return res.status(400).json({ error: 'Pesan terlalu panjang (maksimal 4096 karakter)' });
    }

    try {
        const jid = formattedPhone + '@s.whatsapp.net';
        await sock.sendMessage(jid, { text: message });
        res.json({ success: true, message: 'Pesan WhatsApp berhasil dikirim!' });
    } catch (error) {
        console.error('Error saat mengirim pesan WhatsApp:', error);
        res.status(500).json({ error: error?.message || 'Gagal mengirim pesan WhatsApp' });
    }
});

// Jalankan server terikat pada host lokal
app.listen(PORT, HOST, () => {
    console.log(`🚀 WA Server berjalan secara aman di http://${HOST}:${PORT}`);
    connectToWhatsApp();
});
