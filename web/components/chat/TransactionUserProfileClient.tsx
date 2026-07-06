"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { VerificationBadge } from "@/components/chat/VerificationBadge";
import { getInitials } from "@/lib/format";
import {
  buildProfileStatusRows,
  getTransactionProfile,
  type ProfileRole,
} from "@/lib/profile";
import { getSession, getTransaction } from "@/lib/transaction";
import type { Transaction } from "@/lib/types";

type TransactionUserProfileClientProps = {
  code: string;
  role: ProfileRole;
};

export function TransactionUserProfileClient({ code, role }: TransactionUserProfileClientProps) {
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
        if (!active) return;
        setTransaction(payload);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Gagal memuat profil pengguna.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [code, router]);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-bg text-sm text-white/60">
        Memuat profil...
      </div>
    );
  }

  const profile = getTransactionProfile(transaction, role);
  if (!profile || error) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
        <p className="text-sm text-white/70">{error || "Profil pengguna tidak ditemukan."}</p>
        <button
          type="button"
          onClick={() => router.push(`/transaksi/${encodeURIComponent(code)}`)}
          className="rounded-xl bg-accent-blue px-4 py-2 text-sm font-semibold text-white"
        >
          Kembali ke chat
        </button>
      </div>
    );
  }

  const statusRows = buildProfileStatusRows(profile);

  return (
    <div className="min-h-[100dvh] bg-bg text-white">
      <header className="sticky top-0 z-20 border-b border-border bg-[#0b1322]/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/transaksi/${encodeURIComponent(code)}`)}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-white/80"
          >
            ← Kembali
          </button>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-white/45">Profil {profile.title}</p>
            <h1 className="truncate text-sm font-bold">{profile.displayName}</h1>
          </div>
        </div>
      </header>

      <main className="space-y-4 px-4 py-4 pb-8">
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-accent-blue/15 ring-1 ring-border">
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.displayName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-lg font-bold text-accent-blue">{getInitials(profile.displayName)}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-lg font-bold">{profile.displayName}</h2>
                <VerificationBadge verified={profile.verified} size="md" />
              </div>
              <p className="text-xs text-white/55">{profile.title} · {transaction?.code}</p>
              <p className="mt-1 text-xs font-semibold text-white/75">
                {profile.verified ? "Akun terverifikasi" : "Akun belum terverifikasi"}
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <StatCard label="Status akun" value={profile.verified ? "Verified ✓" : "Unverified ✕"} />
          <StatCard label="Provider utama" value={profile.provider || "-"} />
          <StatCard label="WhatsApp" value={profile.whatsapp || "Belum diisi"} />
          <StatCard label="Email" value={profile.email || "Belum diisi"} />
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-bold">Status data terhubung</h3>
          <div className="space-y-2">
            {statusRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-bg/60 px-3 py-2.5"
              >
                <span className="text-xs text-white/80">{row.label}</span>
                <VerificationBadge verified={row.done} size="md" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-border bg-card px-3 py-3">
      <p className="text-[10px] uppercase tracking-wide text-white/45">{label}</p>
      <p className="mt-1 text-xs font-semibold text-white break-words">{value}</p>
    </article>
  );
}
