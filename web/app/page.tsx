import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-accent-blue">RekberWE.id Mobile</p>
      <h1 className="text-2xl font-bold">Frontend Next.js siap</h1>
      <p className="max-w-sm text-sm text-white/60">
        Buka ruang chat transaksi mobile melalui URL transaksi. Homepage legacy tetap tersedia di root saat Next route tidak match.
      </p>
      <Link
        href="/"
        className="rounded-xl border border-border px-4 py-2 text-sm text-white/80"
      >
        Ke beranda legacy
      </Link>
    </main>
  );
}
