"use client";

import Link from "next/link";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getShortStatus, getTransactionProgress } from "@/lib/transaction";
import type { Transaction } from "@/lib/types";

type TransactionSummaryCollapseProps = {
  transaction: Transaction;
  expanded: boolean;
  onToggle: () => void;
};

export function TransactionSummaryCollapse({
  transaction,
  expanded,
  onToggle,
}: TransactionSummaryCollapseProps) {
  const progress = getTransactionProgress(transaction);
  const shortStatus = getShortStatus(transaction);

  return (
    <section className="shrink-0 border-b border-border bg-card px-3 py-2.5">
      {!expanded ? (
        <div className="flex items-center gap-2 text-sm">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-success">{formatCurrency(transaction.price)}</span>
            <span className="truncate text-accent-blue">{shortStatus}</span>
            <span className="text-white/45">
              {progress.current}/{progress.total}
            </span>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-accent-blue"
          >
            Lihat Detail ▼
          </button>
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <SummaryRow label="Nilai" value={formatCurrency(transaction.price)} />
            <SummaryRow label="Status" value={shortStatus} />
            <SummaryRow label="Progress" value={`${progress.current}/${progress.total}`} />
            <SummaryRow label="Tipe" value={transaction.type} />
          </div>
          <div className="space-y-2 rounded-xl border border-border bg-bg/60 p-3">
            <SummaryRow label="Pembeli" value={transaction.buyer?.displayName || "Menunggu pembeli"} />
            <SummaryRow label="Penjual" value={transaction.seller?.displayName || "Menunggu penjual"} />
            <SummaryRow label="Admin" value="RekberWE.id" />
            <SummaryRow label="Nomor transaksi" value={transaction.code} />
            <SummaryRow label="Dibuat" value={formatDateTime(transaction.createdAt)} />
            <SummaryRow label="Judul" value={transaction.title} />
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/transaksi/${transaction.code}/detail`}
              className="inline-flex min-h-touch flex-1 items-center justify-center rounded-xl bg-accent-blue/15 px-3 text-xs font-semibold text-accent-blue"
            >
              Buka halaman detail →
            </Link>
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex min-h-touch items-center justify-center rounded-xl border border-border px-4 text-xs text-white/70"
            >
              Tutup ▲
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-white/40">{label}</p>
      <p className="truncate font-medium text-white/90">{value}</p>
    </div>
  );
}
