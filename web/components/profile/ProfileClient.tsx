"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WhatsAppVerification } from "@/components/profile/WhatsAppVerification";
import { getSession } from "@/lib/transaction";
import { getWhatsappStatus, type WhatsappOtpState } from "@/lib/whatsapp-otp";
import type { SessionUser } from "@/lib/types";

export function ProfileClient() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [otpState, setOtpState] = useState<WhatsappOtpState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const session = await getSession();
        if (!session.user) {
          window.location.href = `/?returnTo=${encodeURIComponent("/profil")}`;
          return;
        }
        const status = await getWhatsappStatus();
        if (!active) return;
        setUser(status.user);
        setOtpState(status.state);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Gagal memuat profil.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [router]);

  if (loading) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-6">
        <p className="text-sm text-white/60">Memuat profil...</p>
      </main>
    );
  }

  if (error || !user || !otpState) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-6">
        <p className="text-sm text-danger">{error || "Profil tidak tersedia."}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-6">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.12em] text-white/50">Profil</p>
        <h1 className="mt-1 text-2xl font-bold">{user.displayName}</h1>
        <p className="mt-1 text-sm text-white/60">{user.email || user.provider}</p>
      </div>

      <div className="grid gap-4">
        <section className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-white/50">Informasi akun</p>
          <div className="mt-3 grid gap-2 text-sm">
            <div className="flex justify-between gap-3"><span className="text-white/55">Nama KTP</span><strong>{user.legalName || "-"}</strong></div>
            <div className="flex justify-between gap-3"><span className="text-white/55">Provider</span><strong>{user.provider || "-"}</strong></div>
            <div className="flex justify-between gap-3"><span className="text-white/55">Status KTP</span><strong>{user.verificationStatus || "unverified"}</strong></div>
          </div>
        </section>

        <WhatsAppVerification
          initialUser={user}
          initialState={otpState}
          onUserUpdated={(nextUser, nextState) => {
            setUser(nextUser);
            setOtpState(nextState);
          }}
        />
      </div>
    </main>
  );
}
