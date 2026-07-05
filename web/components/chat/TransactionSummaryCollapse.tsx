"use client";

import { formatCurrency, getInitials } from "@/lib/format";
import { getShortStatus, getTransactionProgress } from "@/lib/transaction";
import type { Transaction, User } from "@/lib/types";

const ADMIN_AVATAR_URL = "/assets/rekberwe-logo-header.svg";

type TransactionSummaryCollapseProps = {
  transaction: Transaction;
  expanded: boolean;
  onToggle: () => void;
};

export function TransactionSummaryCollapse({
  transaction,
  expanded: _expanded,
  onToggle: _onToggle,
}: TransactionSummaryCollapseProps) {
  const progress = getTransactionProgress(transaction);
  const shortStatus = getShortStatus(transaction);
  const steps = [
    { label: "Pesanan Dibuat", icon: "▣" },
    { label: "Dana Diamankan", icon: "●" },
    { label: "Akun Diperiksa", icon: "⌕" },
    { label: "Selesai", icon: "✓" },
  ];

  return (
    <section className="shrink-0 space-y-1.5 bg-bg px-2.5 pb-1.5 pt-1.5">
      <div className="rounded-xl border border-border bg-card/95 shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
        <div className="grid grid-cols-2 gap-2 border-b border-border px-3 py-2">
          <div className="min-w-0">
            <p className="text-[10px] text-white/45">Status Transaksi</p>
            <p className="mt-0.5 inline-flex max-w-full truncate rounded-md bg-accent-blue/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent-blue">
              {shortStatus}
            </p>
          </div>
          <div className="min-w-0 text-right">
            <p className="text-[10px] text-white/45">Nilai Transaksi</p>
            <p className="mt-0.5 truncate text-sm font-bold text-success">{formatCurrency(transaction.price)}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-border border-b border-border px-1.5 py-2">
          <Participant label="Pembeli" user={transaction.buyer} fallbackName="Menunggu Pembeli" accent="blue" />
          <Participant label="Admin Rekber" fallbackName="Qhead Admin" badge="ADMIN" accent="gold" />
          <Participant label="Penjual" user={transaction.seller} fallbackName="Menunggu Penjual" accent="green" />
        </div>

        <div className="grid grid-cols-4 gap-1 px-2 py-2">
          {steps.map((step, index) => {
            const active = index + 1 <= progress.current;
            return (
              <div key={step.label} className="relative flex min-w-0 flex-col items-center gap-1 text-center">
                {index > 0 ? (
                  <span
                    className={`absolute right-1/2 top-3.5 h-px w-full -translate-x-4 ${
                      active ? "bg-accent-blue/50" : "bg-white/10"
                    }`}
                    aria-hidden="true"
                  />
                ) : null}
                <span
                  className={`relative z-10 inline-flex h-7 w-7 items-center justify-center rounded-lg text-[10px] ring-1 ${
                    active
                      ? "bg-accent-blue/20 text-accent-blue ring-accent-blue/25"
                      : "bg-white/5 text-white/35 ring-white/10"
                  }`}
                >
                  {step.icon}
                </span>
                <span className="max-w-[58px] text-[9px] font-medium leading-tight text-white/60">{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 rounded-xl border border-accent-blue/15 bg-accent-blue/10 px-2.5 py-1.5">
        <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent-blue/20 text-[9px] font-bold text-accent-blue">
          ✓
        </span>
        <p className="text-[10px] leading-snug text-white/65">
          <span className="font-semibold text-accent-blue">Semua komunikasi berada di bawah perlindungan RekberWe.</span>{" "}
          Jangan pernah melakukan transaksi di luar platform.
        </p>
      </div>
    </section>
  );
}

function Participant({
  label,
  user,
  fallbackName,
  badge,
  accent,
}: {
  label: string;
  user?: User | null;
  fallbackName: string;
  badge?: string;
  accent: "blue" | "gold" | "green";
}) {
  const name = user?.displayName || fallbackName;
  const accentClass = {
    blue: "bg-accent-blue/20 text-accent-blue",
    gold: "bg-warning/15 text-warning",
    green: "bg-success/15 text-success",
  }[accent];

  return (
    <div className="flex min-w-0 flex-col items-center px-1 text-center">
      <div className={`mb-0.5 inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full text-[10px] font-bold ${accentClass}`}>
        {badge ? (
          <img src={ADMIN_AVATAR_URL} alt={name} className="h-full w-full object-contain p-0.5" />
        ) : user?.avatar ? (
          <img src={user.avatar} alt={name} className="h-full w-full object-cover" />
        ) : (
          getInitials(name)
        )}
      </div>
      <span className="text-[9px] text-white/40">{label}</span>
      <strong className="max-w-full truncate text-[10px] text-white">{name}</strong>
      {badge ? (
        <span className="mt-0.5 rounded-full bg-accent-purple/15 px-1.5 py-0.5 text-[8px] font-bold text-accent-purple">
          {badge}
        </span>
      ) : (
        <span className="mt-0.5 flex items-center gap-1 text-[9px] text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
          Online
        </span>
      )}
    </div>
  );
}
