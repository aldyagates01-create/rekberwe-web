"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  OTP_LOCK_MESSAGE,
  OTP_SUPPORT_MESSAGE,
  changeWhatsappNumber,
  getWhatsappStatus,
  sendWhatsappOtp,
  verifyWhatsappOtp,
  type WhatsappOtpState,
} from "@/lib/whatsapp-otp";
import type { SessionUser } from "@/lib/types";

function formatTimer(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = String(Math.floor(safe / 60)).padStart(2, "0");
  const seconds = String(safe % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

type WhatsAppVerificationProps = {
  initialUser: SessionUser;
  initialState: WhatsappOtpState;
  onUserUpdated?: (user: SessionUser, state: WhatsappOtpState) => void;
};

export function WhatsAppVerification({
  initialUser,
  initialState,
  onUserUpdated,
}: WhatsAppVerificationProps) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [state, setState] = useState(initialState);
  const [phoneInput, setPhoneInput] = useState(initialState.phoneDisplay || initialUser.whatsapp || "");
  const [otpInput, setOtpInput] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const resendCooldown = useMemo(() => {
    void tick;
    return state.resendCooldownSeconds;
  }, [state.resendCooldownSeconds, tick]);

  const lockRemaining = useMemo(() => {
    void tick;
    if (!state.lockedUntil) return state.lockRemainingSeconds;
    const remaining = Math.ceil((new Date(state.lockedUntil).getTime() - Date.now()) / 1000);
    return Math.max(0, remaining);
  }, [state.lockedUntil, state.lockRemainingSeconds, tick]);

  const showLockoutHelp = state.maxResendReached || lockRemaining > 0;

  const applyPayload = useCallback((payload: { user: SessionUser; state: WhatsappOtpState; message?: string }) => {
    setUser(payload.user);
    setState(payload.state);
    onUserUpdated?.(payload.user, payload.state);
    if (payload.message) setSuccess(payload.message);
  }, [onUserUpdated]);

  async function handleSendOtp() {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const payload = await sendWhatsappOtp(phoneInput);
      applyPayload(payload);
      setModalOpen(true);
      setOtpInput("");
    } catch (sendError) {
      const body = sendError as Error & { state?: WhatsappOtpState };
      if (body.state) setState(body.state);
      setError(body.message || "Gagal mengirim OTP.");
      if (body.state?.maxResendReached) setModalOpen(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const payload = await verifyWhatsappOtp(otpInput);
      applyPayload(payload);
      setModalOpen(false);
      setOtpInput("");
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Verifikasi OTP gagal.");
      const refreshed = await getWhatsappStatus();
      setState(refreshed.state);
      setUser(refreshed.user);
    } finally {
      setLoading(false);
    }
  }

  async function handleChangeNumber() {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const payload = await changeWhatsappNumber(phoneInput);
      applyPayload(payload);
      setModalOpen(false);
      setOtpInput("");
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : "Gagal mengganti nomor.");
    } finally {
      setLoading(false);
    }
  }

  function handleContactAdmin() {
    const params = new URLSearchParams({
      support: "1",
      prefill: OTP_SUPPORT_MESSAGE,
    });
    router.push(`/?${params.toString()}`);
  }

  if (state.phoneVerified || user.phoneVerified) {
    return (
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-white/50">Nomor WhatsApp</p>
            <h2 className="mt-1 text-lg font-semibold">{state.phoneDisplay || phoneInput}</h2>
          </div>
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-success/15 text-sm font-bold text-success"
            aria-label="WhatsApp terverifikasi"
            title="WhatsApp terverifikasi"
          >
            ✓
          </span>
        </div>
        <p className="mt-3 text-sm text-success">✅ Nomor WhatsApp berhasil diverifikasi.</p>
      </section>
    );
  }

  return (
    <>
      <section className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-[0.12em] text-white/50">Nomor WhatsApp</p>
        <h2 className="mt-1 text-lg font-semibold">Verifikasi nomor HP</h2>
        <p className="mt-2 text-sm text-white/65">
          Verifikasi nomor WhatsApp sekali saja untuk keamanan transaksi dan kepercayaan lawan bicara.
        </p>

        <label className="mt-4 block text-sm text-white/70">
          Input Nomor WhatsApp
          <input
            type="tel"
            value={phoneInput}
            onChange={(event) => setPhoneInput(event.target.value)}
            placeholder="08xxxxxxxxxx"
            className="mt-2 w-full rounded-xl border border-border bg-bg px-4 py-3 text-white outline-none ring-accent-blue focus:ring-2"
            disabled={loading || lockRemaining > 0}
          />
        </label>

        <div className="mt-4 rounded-xl border border-border bg-bg/70 px-4 py-3 text-sm">
          <p className="text-white/55">Status</p>
          <p className="mt-1 font-medium text-warning">❌ Belum Diverifikasi</p>
        </div>

        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        {success ? <p className="mt-3 text-sm text-success">{success}</p> : null}

        {showLockoutHelp ? (
          <div className="mt-4 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-white/80">
            <p>{OTP_LOCK_MESSAGE}</p>
            {lockRemaining > 0 ? (
              <p className="mt-2 font-semibold text-warning">Coba lagi dalam {formatTimer(lockRemaining)}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleChangeNumber}
                disabled={loading}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-white hover:bg-white/5 disabled:opacity-50"
              >
                Ganti Nomor
              </button>
              <button
                type="button"
                onClick={handleContactAdmin}
                className="rounded-xl border border-accent-blue/40 bg-accent-blue/10 px-4 py-2 text-sm font-medium text-accent-blue"
              >
                Hubungi Admin
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSendOtp}
            disabled={loading || !phoneInput.trim()}
            className="mt-4 w-full rounded-xl bg-accent-blue px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Memproses..." : "Verifikasi WhatsApp"}
          </button>
        )}
      </section>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <h3 className="text-lg font-semibold">Verifikasi WhatsApp</h3>
            <p className="mt-2 text-sm text-white/65">
              Masukkan kode OTP yang telah dikirim ke WhatsApp Anda.
            </p>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otpInput}
              onChange={(event) => setOtpInput(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="______"
              className="mt-4 w-full rounded-xl border border-border bg-bg px-4 py-4 text-center text-2xl tracking-[0.5em] text-white outline-none ring-accent-purple focus:ring-2"
            />

            <p className="mt-3 text-center text-sm text-white/55">
              Timer kirim ulang: {formatTimer(resendCooldown)}
            </p>

            {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={loading || otpInput.length !== 6 || !state.canVerify}
              className="mt-4 w-full rounded-xl bg-accent-purple px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Memverifikasi..." : "Verifikasi"}
            </button>

            <button
              type="button"
              onClick={handleSendOtp}
              disabled={loading || state.resendDisabled || resendCooldown > 0 || lockRemaining > 0}
              className="mt-3 w-full text-sm font-medium text-accent-blue disabled:opacity-40"
            >
              Kirim Ulang OTP
            </button>

            {showLockoutHelp ? (
              <div className="mt-4 border-t border-border pt-4 text-sm text-white/70">
                <p>{OTP_LOCK_MESSAGE}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={handleChangeNumber} className="rounded-lg border border-border px-3 py-2">
                    Ganti Nomor
                  </button>
                  <button type="button" onClick={handleContactAdmin} className="rounded-lg border border-accent-blue/40 px-3 py-2 text-accent-blue">
                    Hubungi Admin
                  </button>
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="mt-4 w-full text-sm text-white/50"
            >
              Tutup
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
