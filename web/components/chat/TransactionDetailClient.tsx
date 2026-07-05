"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getSession, getShortStatus, getTransaction, getTransactionProgress, runAction } from "@/lib/transaction";
import type { Transaction } from "@/lib/types";

export function TransactionDetailClient({ code }: { code: string }) {
  const router = useRouter();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await getSession();
        if (!session.user) {
          router.replace(`/?trx=${encodeURIComponent(code)}`);
          return;
        }
        const payload = await getTransaction(code);
        if (active) setTransaction(payload);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Gagal memuat detail.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [code, router]);

  async function openDispute() {
    if (!transaction) return;
    const confirmed = window.confirm("Ajukan sengketa untuk transaksi ini?");
    if (!confirmed) return;
    const payload = await runAction(code, "open_dispute");
    setTransaction(payload.transaction);
  }

  if (loading) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-bg text-white/60">Memuat detail...</div>;
  }

  if (!transaction) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
        <p className="text-sm text-white/70">{error || "Transaksi tidak ditemukan."}</p>
        <Link href="/" className="rounded-xl bg-accent-blue px-4 py-2 text-sm font-semibold">
          Kembali
        </Link>
      </div>
    );
  }

  const progress = getTransactionProgress(transaction);

  return (
    <div className="min-h-[100dvh] bg-bg pb-8">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button type="button" onClick={() => router.back()} className="min-h-touch min-w-touch text-lg">
          ←
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">Detail Transaksi</p>
          <p className="truncate text-xs text-white/45">#{transaction.code}</p>
        </div>
        <Link
          href={`/transaksi/${code}`}
          className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-accent-blue"
        >
          Chat
        </Link>
      </header>

      <div className="space-y-3 px-4 py-4">
        <DetailCard title="Ringkasan">
          <DetailRow label="Status" value={getShortStatus(transaction)} />
          <DetailRow label="Nilai" value={formatCurrency(transaction.price)} highlight />
          <DetailRow label="Progress" value={`${progress.current}/${progress.total}`} />
          <DetailRow label="Barang/Jasa" value={transaction.title} />
          <DetailRow label="Tipe" value={transaction.type} />
          <DetailRow label="Garansi" value={transaction.warranty || "Tanpa garansi"} />
          <DetailRow label="Dibuat" value={formatDateTime(transaction.createdAt)} />
        </DetailCard>

        <DetailCard title="Peserta">
          <DetailRow label="Pembeli" value={transaction.buyer?.displayName || "Menunggu pembeli"} />
          <DetailRow label="Penjual" value={transaction.seller?.displayName || "Menunggu penjual"} />
          <DetailRow label="Admin" value="RekberWE.id" />
        </DetailCard>

        <DetailCard title="Pembayaran">
          <DetailRow
            label="Metode"
            value={transaction.adminPayoutAccount ? "Transfer manual ke rekening admin" : "Menunggu instruksi admin"}
          />
          <DetailRow
            label="Nominal transfer pembeli"
            value={formatCurrency(transaction.settlement?.buyerTransferAmount || transaction.price)}
          />
        </DetailCard>

        {transaction.uploads?.length ? (
          <DetailCard title="Bukti Pembayaran">
            <ul className="space-y-2">
              {transaction.uploads.map((file) => (
                <li key={file.id}>
                  <a href={file.url} target="_blank" rel="noreferrer" className="text-sm text-accent-blue underline">
                    {file.name}
                  </a>
                </li>
              ))}
            </ul>
          </DetailCard>
        ) : null}

        <div className="grid grid-cols-1 gap-2 pt-2">
          <button
            type="button"
            onClick={() => router.push("/?support=1")}
            className="min-h-touch rounded-xl bg-accent-blue px-4 py-3 text-sm font-semibold text-white"
          >
            Hubungi Admin
          </button>
          <button
            type="button"
            onClick={openDispute}
            className="min-h-touch rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger"
          >
            Buka Sengketa
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-white/90">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function DetailRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-white/45">{label}</span>
      <span className={`max-w-[65%] text-right ${highlight ? "font-semibold text-success" : "text-white/90"}`}>
        {value}
      </span>
    </div>
  );
}
