import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

interface SendPasswordResetEmailParams {
  to: string;
  ownerName?: string;
  storeName?: string;
  resetUrl: string;
}

/**
 * Membaca variabel environment dengan fallback membaca langsung dari .env.local
 */
function getEnv(key: string, fallback = ''): string {
  if (process.env[key]) return process.env[key]!;
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
      if (match) return match[1].trim();
    }
  } catch {
    // fallback
  }
  return fallback;
}

/**
 * Membuat transporter Nodemailer berdasarkan konfigurasi .env
 */
function createTransporter() {
  const host = getEnv('SMTP_HOST', 'smtp.gmail.com');
  const port = parseInt(getEnv('SMTP_PORT', '465'), 10);
  const secure = getEnv('SMTP_SECURE', 'true') === 'true' || port === 465;
  const user = getEnv('SMTP_USER', '');
  const pass = getEnv('SMTP_PASS', '');

  if (user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  return null;
}

/**
 * Mengirimkan email verifikasi reset password dengan template HTML responsif Wadira
 */
export async function sendPasswordResetEmail({
  to,
  ownerName,
  storeName,
  resetUrl,
}: SendPasswordResetEmailParams): Promise<{ success: boolean; messageId?: string; previewUrl?: string; error?: string }> {
  const transporter = createTransporter();
  const displayName = ownerName ? `${ownerName}` : 'Pengelola Warung';
  const warungInfo = storeName ? `(${storeName})` : '';

  const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifikasi Pemulihan Kata Sandi - Wadira</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9f2; margin: 0; padding: 24px; color: #1c240d; }
    .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2ebd0; overflow: hidden; box-shadow: 0 4px 12px rgba(84, 101, 45, 0.06); }
    .header { background: #54652d; padding: 32px 28px; text-align: left; }
    .brand { color: #d5ed70; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; text-decoration: none; }
    .tagline { color: rgba(255,255,255,0.8); font-size: 12px; margin-top: 4px; }
    .content { padding: 32px 28px; line-height: 1.6; }
    .greeting { font-size: 18px; font-weight: 700; color: #1c240d; margin-bottom: 12px; }
    .text { font-size: 14px; color: #4a5538; margin-bottom: 20px; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background-color: #54652d; color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 12px; letter-spacing: 0.2px; }
    .alert-box { background: #fdfcee; border: 1px solid #f0eab8; border-radius: 10px; padding: 14px 16px; font-size: 12px; color: #6b5900; margin-top: 24px; }
    .footer { border-top: 1px solid #eef2e4; padding: 20px 28px; background: #fafbfc; text-align: center; font-size: 11px; color: #879275; }
    .link-alt { word-break: break-all; font-size: 12px; color: #54652d; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="brand">wadira.</div>
      <div class="tagline">Warung Madura Digital — Portal Keamanan Operasional</div>
    </div>
    <div class="content">
      <div class="greeting">Halo, ${displayName}! ${warungInfo}</div>
      <p class="text">
        Kami menerima permintaan untuk mengatur ulang kata sandi akun admin warung Anda untuk email: <strong>${to}</strong>.
      </p>
      <p class="text">
        Untuk melanjutkan dan membuat kata sandi baru, silakan klik tombol verifikasi aman di bawah ini:
      </p>
      
      <div class="btn-container">
        <a href="${resetUrl}" class="btn" target="_blank">Atur Ulang Kata Sandi Baru &rarr;</a>
      </div>

      <div class="alert-box">
        <strong>PENTING:</strong> Tautan ini hanya berlaku selama <strong>60 menit</strong> sejak email ini dikirimkan. Jika Anda tidak pernah meminta penggantian kata sandi ini, abaikan email ini dan akun Anda akan tetap aman.
      </div>

      <p class="text" style="margin-top: 24px; font-size: 12px;">
        Jika tombol di atas tidak dapat diklik, salin dan tempel URL berikut ke browser Anda:<br>
        <a href="${resetUrl}" class="link-alt">${resetUrl}</a>
      </p>
    </div>
    <div class="footer">
      Email ini dikirim secara otomatis oleh sistem keamanan Wadira.<br>
      Mohon untuk tidak membalas email ini secara langsung.
    </div>
  </div>
</body>
</html>
  `;

  // 1. Jika konfigurasi SMTP sudah ada di .env, kirim email sungguhan
  if (transporter) {
    try {
      const from = getEnv('SMTP_FROM', `"Wadira Warung Digital" <${getEnv('SMTP_USER')}>`);
      const info = await transporter.sendMail({
        from,
        to,
        subject: 'Verifikasi Pemulihan Kata Sandi - Wadira Warung Digital',
        text: `Halo ${displayName},\n\nPermintaan atur ulang kata sandi untuk akun Wadira Anda telah diterima.\n\nKlik link berikut untuk mengubah kata sandi Anda:\n${resetUrl}\n\nLink berlaku selama 60 menit. Abaikan jika Anda tidak memintanya.`,
        html: htmlContent,
      });

      console.log(`[EMAIL SENT] Email reset password berhasil dikirim ke ${to} (Message ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error('[EMAIL ERROR] Gagal mengirim email via SMTP:', err);
      return { success: false, error: err?.message || 'Gagal mengirim email.' };
    }
  }

  // 2. Jika SMTP belum diisi di .env, buat Ethereal test account otomatis agar ada inbox nyata yang bisa dilihat
  try {
    const testAccount = await nodemailer.createTestAccount();
    const testTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const info = await testTransporter.sendMail({
      from: '"Wadira Keamanan" <security@wadira.test>',
      to,
      subject: 'Verifikasi Pemulihan Kata Sandi - Wadira Warung Digital',
      html: htmlContent,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    console.log(`[EMAIL TEST SENT] Email dikirim ke test inbox: ${to}`);
    console.log(`[EMAIL TEST PREVIEW URL]: ${previewUrl}`);

    return {
      success: true,
      messageId: info.messageId,
      previewUrl,
    };
  } catch (fallbackErr: any) {
    console.log(`[EMAIL FALLBACK] Reset Link untuk ${to}: ${resetUrl}`);
    return { success: true };
  }
}
