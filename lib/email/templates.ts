export type EmailCta = {
  label: string;
  url: string;
};

export type EmailDetailRow = {
  label: string;
  value: string;
};

export function formatCurrencyId(value: number | string | null | undefined): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatDateWib(value?: string | Date | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
    timeZoneName: "short",
  }).format(new Date(value));
}

function escapeHtml(value: string): string {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

export function wrapEmailHtml(options: {
  preview?: string;
  greeting: string;
  paragraphs: string[];
  details?: EmailDetailRow[];
  cta?: EmailCta;
}): string {
  const preview = escapeHtml(options.preview || options.paragraphs[0] || "RekberWe.id");
  const greeting = escapeHtml(options.greeting);
  const paragraphs = options.paragraphs.map((item) => `<p style="margin:0 0 14px;color:#1a2b44;font-size:15px;line-height:1.7;">${escapeHtml(item)}</p>`).join("");
  const details = (options.details || []).length
    ? `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0 8px;background:#f7f9fd;border:1px solid #e7edf7;border-radius:12px;">
        ${(options.details || []).map((row) => `
          <tr>
            <td style="padding:10px 14px;border-bottom:1px solid #e7edf7;color:#6b7c96;font-size:13px;width:38%;vertical-align:top;">${escapeHtml(row.label)}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e7edf7;color:#1a2b44;font-size:14px;font-weight:600;vertical-align:top;">${escapeHtml(row.value)}</td>
          </tr>
        `).join("")}
      </table>
    `
    : "";
  const cta = options.cta
    ? `
      <table role="presentation" cellspacing="0" cellpadding="0" style="margin:22px 0 6px;">
        <tr>
          <td>
            <a href="${escapeHtml(options.cta.url)}" style="display:inline-block;background:linear-gradient(135deg,#446dff,#7a61ff);color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:12px;">
              ${escapeHtml(options.cta.label)}
            </a>
          </td>
        </tr>
      </table>
    `
    : "";

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>RekberWe.id</title>
</head>
<body style="margin:0;padding:0;background:#f4f7fc;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preview}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fc;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(15,35,80,0.08);">
          <tr>
            <td style="padding:24px 28px;background:linear-gradient(135deg,#446dff,#7a61ff);color:#ffffff;">
              <div style="font-size:22px;font-weight:800;letter-spacing:0.02em;">RekberWe.id</div>
              <div style="margin-top:4px;font-size:12px;opacity:0.92;">Layanan pengaman transaksi digital</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 14px;color:#1a2b44;font-size:16px;font-weight:700;">${greeting}</p>
              ${paragraphs}
              ${details}
              ${cta}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 24px;color:#6b7c96;font-size:12px;line-height:1.6;border-top:1px solid #eef2f8;">
              Email ini dikirim otomatis oleh sistem RekberWe.id. Jangan membalas email ini.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildRegistrationSuccessEmail(name: string, ctaUrl: string) {
  return {
    subject: "Selamat Datang di RekberWe.id",
    html: wrapEmailHtml({
      preview: "Akun Anda berhasil dibuat di RekberWe.id.",
      greeting: `Halo ${name},`,
      paragraphs: [
        "Akun Anda berhasil dibuat di RekberWe.id.",
        "Sekarang Anda dapat mulai menggunakan RekberWe.id untuk membuat, mengikuti, dan mengamankan transaksi digital dengan lebih nyaman.",
        "Demi keamanan, pastikan Anda hanya melakukan komunikasi dan transaksi melalui platform RekberWe.id.",
      ],
      cta: { label: "Masuk ke RekberWe.id", url: ctaUrl },
    }),
  };
}

export function buildTransactionCreatedEmail(name: string, transaction: {
  code: string;
  title: string;
  price: number;
}, ctaUrl: string) {
  return {
    subject: `Transaksi Baru #${transaction.code} Berhasil Dibuat`,
    html: wrapEmailHtml({
      preview: `Transaksi #${transaction.code} berhasil dibuat.`,
      greeting: `Halo ${name},`,
      paragraphs: [
        `Transaksi #${transaction.code} telah berhasil dibuat di RekberWe.id.`,
        "Silakan buka halaman transaksi untuk melihat detail, mengikuti instruksi, dan berkomunikasi dengan pihak terkait.",
      ],
      details: [
        { label: "Judul", value: transaction.title || "-" },
        { label: "Nilai transaksi", value: formatCurrencyId(transaction.price) },
        { label: "Status", value: "Menunggu proses selanjutnya" },
      ],
      cta: { label: "Lihat Transaksi", url: ctaUrl },
    }),
  };
}

export function buildAdminVerifiedEmail(name: string, ctaUrl: string) {
  return {
    subject: "Akun Anda Telah Diverifikasi Admin",
    html: wrapEmailHtml({
      preview: "Akun Anda telah diverifikasi admin RekberWe.id.",
      greeting: `Halo ${name},`,
      paragraphs: [
        "Akun Anda telah berhasil diverifikasi oleh admin RekberWe.id.",
        "Dengan status ini, Anda dapat menggunakan fitur yang membutuhkan verifikasi sesuai ketentuan RekberWe.id.",
        "Terima kasih telah menjaga keamanan transaksi bersama RekberWe.id.",
      ],
      cta: { label: "Buka Profil Saya", url: ctaUrl },
    }),
  };
}

export function buildFundsSecuredEmail(name: string, transaction: {
  code: string;
  title: string;
  price: number;
}, ctaUrl: string) {
  return {
    subject: `Dana Transaksi #${transaction.code} Berhasil Diamankan`,
    html: wrapEmailHtml({
      preview: `Dana transaksi #${transaction.code} berhasil diamankan.`,
      greeting: `Halo ${name},`,
      paragraphs: [
        `Dana untuk transaksi #${transaction.code} telah diterima dan diamankan oleh RekberWe.id.`,
        "Penjual dapat melanjutkan proses penyerahan barang, akun, item, atau jasa sesuai kesepakatan transaksi.",
      ],
      details: [
        { label: "Judul", value: transaction.title || "-" },
        { label: "Nilai transaksi", value: formatCurrencyId(transaction.price) },
        { label: "Status", value: "Dana Diamankan" },
      ],
      cta: { label: "Buka Transaksi", url: ctaUrl },
    }),
  };
}

export function buildFundsReleasedEmail(name: string, transaction: {
  code: string;
  title: string;
  price: number;
}, ctaUrl: string) {
  return {
    subject: `Dana Transaksi #${transaction.code} Telah Dilepas`,
    html: wrapEmailHtml({
      preview: `Dana transaksi #${transaction.code} telah dilepas.`,
      greeting: `Halo ${name},`,
      paragraphs: [
        `Dana untuk transaksi #${transaction.code} telah dilepas sesuai penyelesaian transaksi.`,
        "Terima kasih telah menggunakan RekberWe.id sebagai layanan pengaman transaksi Anda.",
      ],
      details: [
        { label: "Judul", value: transaction.title || "-" },
        { label: "Nilai transaksi", value: formatCurrencyId(transaction.price) },
        { label: "Status", value: "Selesai / Dana Dilepas" },
      ],
      cta: { label: "Lihat Riwayat Transaksi", url: ctaUrl },
    }),
  };
}

export function buildDisputeOpenedEmail(name: string, transaction: {
  code: string;
  title: string;
  price: number;
}, ctaUrl: string) {
  return {
    subject: `Sengketa Dibuka Pada Transaksi #${transaction.code}`,
    html: wrapEmailHtml({
      preview: `Sengketa dibuka pada transaksi #${transaction.code}.`,
      greeting: `Halo ${name},`,
      paragraphs: [
        `Sengketa telah dibuka pada transaksi #${transaction.code}.`,
        "Tim RekberWe.id akan melakukan peninjauan berdasarkan data transaksi, riwayat chat, bukti pembayaran, dan informasi pendukung lainnya.",
        "Mohon tetap berkomunikasi melalui sistem RekberWe.id agar proses penyelesaian dapat berjalan jelas dan tercatat.",
      ],
      details: [
        { label: "Judul", value: transaction.title || "-" },
        { label: "Nilai transaksi", value: formatCurrencyId(transaction.price) },
        { label: "Status", value: "Sengketa Dibuka" },
      ],
      cta: { label: "Buka Sengketa", url: ctaUrl },
    }),
  };
}

export function buildSellerFundsReceivedEmail(name: string, transaction: {
  code: string;
  title: string;
  price: number;
}, ctaUrl: string) {
  return {
    subject: `Dana Transaksi #${transaction.code} Sudah Diterima Admin`,
    html: wrapEmailHtml({
      preview: `Dana transaksi #${transaction.code} sudah diterima admin.`,
      greeting: `Halo ${name},`,
      paragraphs: [
        `Dana untuk transaksi #${transaction.code} telah diterima admin RekberWe.id.`,
        "Silakan lanjutkan proses penyerahan barang, akun, item, atau jasa kepada pembeli sesuai kesepakatan transaksi.",
        "Setelah data atau item benar-benar diserahkan, klik tombol konfirmasi penyerahan di ruang transaksi.",
      ],
      details: [
        { label: "Judul", value: transaction.title || "-" },
        { label: "Nilai transaksi", value: formatCurrencyId(transaction.price) },
        { label: "Status", value: "Dana Diterima Admin" },
      ],
      cta: { label: "Buka Transaksi", url: ctaUrl },
    }),
  };
}

export function buildItemDeliveredEmail(name: string, transaction: {
  code: string;
  title: string;
  price: number;
}, ctaUrl: string) {
  return {
    subject: `Item / Akun Transaksi #${transaction.code} Sudah Diserahkan`,
    html: wrapEmailHtml({
      preview: `Penjual telah menyerahkan item pada transaksi #${transaction.code}.`,
      greeting: `Halo ${name},`,
      paragraphs: [
        `Penjual telah mengonfirmasi bahwa data akun, item, atau jasa untuk transaksi #${transaction.code} sudah diserahkan.`,
        "Segera cek dan amankan data atau item Anda. Jika sudah sesuai, lanjutkan proses transaksi melalui ruang chat RekberWe.id.",
      ],
      details: [
        { label: "Judul", value: transaction.title || "-" },
        { label: "Nilai transaksi", value: formatCurrencyId(transaction.price) },
        { label: "Status", value: "Akun / Item Diserahkan" },
      ],
      cta: { label: "Buka Transaksi", url: ctaUrl },
    }),
  };
}

export function buildTestEmail() {
  return {
    subject: "Test Email RekberWe.id",
    html: wrapEmailHtml({
      preview: "Test email RekberWe.id berhasil dikonfigurasi.",
      greeting: "Halo,",
      paragraphs: [
        "Jika Anda menerima email ini, maka sistem email RekberWe.id telah berhasil dikonfigurasi.",
        "Terima kasih, RekberWe.id",
      ],
    }),
  };
}

export function buildVoucherOrderProcessingEmail(name: string, order: {
  code: string;
  productName: string;
  price: number;
  quantity: number;
}, ctaUrl: string) {
  return {
    subject: `RekberWe.id — Order voucher/gametime sedang diproses (${order.code})`,
    html: wrapEmailHtml({
      preview: `Admin mulai memproses order ${order.code}.`,
      greeting: `Halo ${name},`,
      paragraphs: [
        `Pembayaran order voucher/gametime Anda (${order.code}) sudah dikonfirmasi.`,
        "Admin sedang memproses order Anda sekarang. Mohon pantau chat order di RekberWe.id jika admin membutuhkan kode verifikasi atau perbaikan data akun.",
        "Anda akan menerima email lagi jika ada permintaan tindakan dari admin.",
      ],
      details: [
        { label: "Order", value: order.code },
        { label: "Produk", value: order.productName },
        { label: "Jumlah", value: `${order.quantity} pcs` },
        { label: "Total", value: formatCurrencyId(order.price) },
        { label: "Status", value: "Sedang diproses" },
      ],
      cta: { label: "Buka Chat Order", url: ctaUrl },
    }),
  };
}

export function buildVoucherVerificationCodeEmail(name: string, order: {
  code: string;
  productName: string;
  price: number;
  quantity: number;
}, ctaUrl: string) {
  return {
    subject: `RekberWe.id — Admin meminta kode verifikasi (${order.code})`,
    html: wrapEmailHtml({
      preview: `Admin meminta kode verifikasi untuk order ${order.code}.`,
      greeting: `Halo ${name},`,
      paragraphs: [
        `Admin sedang memproses order voucher/gametime Anda (${order.code}).`,
        "Saat ini admin membutuhkan kode verifikasi yang dikirim ke email akun subscription terkait.",
        "Silakan cek kotak masuk / spam email akun tersebut, lalu kirimkan kode verifikasi melalui chat order di RekberWe.id agar proses bisa dilanjutkan.",
      ],
      details: [
        { label: "Order", value: order.code },
        { label: "Produk", value: order.productName },
        { label: "Jumlah", value: `${order.quantity} pcs` },
        { label: "Total", value: formatCurrencyId(order.price) },
      ],
      cta: { label: "Kirim Kode Verifikasi", url: ctaUrl },
    }),
  };
}

export function buildVoucherAccountRevisionEmail(name: string, order: {
  code: string;
  productName: string;
  price: number;
  quantity: number;
}, ctaUrl: string) {
  return {
    subject: `RekberWe.id — Perbaikan data akun diperlukan (${order.code})`,
    html: wrapEmailHtml({
      preview: `Admin meminta perbaikan data akun untuk order ${order.code}.`,
      greeting: `Halo ${name},`,
      paragraphs: [
        `Admin meminta perbaikan data akun subscription untuk order ${order.code}.`,
        "Data akun sebelumnya mungkin keliru atau belum bisa diproses. Silakan buka chat order di RekberWe.id, perbarui email dan password pada formulir yang tersedia, lalu kirim ulang.",
        "Setelah data diperbaiki, admin akan segera melanjutkan proses order Anda.",
      ],
      details: [
        { label: "Order", value: order.code },
        { label: "Produk", value: order.productName },
        { label: "Jumlah", value: `${order.quantity} pcs` },
        { label: "Total", value: formatCurrencyId(order.price) },
      ],
      cta: { label: "Perbarui Data Akun", url: ctaUrl },
    }),
  };
}

export function buildVoucherOrderCompletedEmail(name: string, order: {
  code: string;
  productName: string;
  price: number;
  quantity: number;
}, ctaUrl: string) {
  return {
    subject: `RekberWe.id — Order voucher/gametime selesai (${order.code})`,
    html: wrapEmailHtml({
      preview: `Order ${order.code} sudah selesai diproses.`,
      greeting: `Halo ${name},`,
      paragraphs: [
        `Order voucher/gametime Anda (${order.code}) sudah selesai diproses oleh admin.`,
        "Silakan cek akun atau layanan yang Anda pesan. Jika ada masalah pada akun, buka order ini dan klik Ajukan Sengketa agar chat dengan admin dibuka kembali.",
        "Terima kasih telah berbelanja di RekberWe.id.",
      ],
      details: [
        { label: "Order", value: order.code },
        { label: "Produk", value: order.productName },
        { label: "Jumlah", value: `${order.quantity} pcs` },
        { label: "Total", value: formatCurrencyId(order.price) },
        { label: "Status", value: "Selesai" },
      ],
      cta: { label: "Lihat Order", url: ctaUrl },
    }),
  };
}
