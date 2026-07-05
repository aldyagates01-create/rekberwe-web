"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_AVATAR_URL, ChatBubble, SystemMessage, UploadBubble } from "@/components/chat/ChatBubble";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatInput } from "@/components/chat/ChatInput";
import { QuickActionChips } from "@/components/chat/QuickActionChips";
import { TransactionSummaryCollapse } from "@/components/chat/TransactionSummaryCollapse";
import {
  buildTimeline,
  getSession,
  getSystemMessageIcon,
  getTransaction,
  getTransactionActions,
  getUserRole,
  isSystemMessage,
  runAction,
  sendMessage,
  updateSellerBankDetails,
  uploadProof,
} from "@/lib/transaction";
import type { TransactionActionKey } from "@/lib/transaction";
import type { SessionUser, Transaction, TransactionMessage } from "@/lib/types";

type TransactionChatClientProps = {
  code: string;
};

export function TransactionChatClient({ code }: TransactionChatClientProps) {
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [message, setMessage] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankNumber, setBankNumber] = useState("");
  const [bankHolder, setBankHolder] = useState("");
  const [editingBank, setEditingBank] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const role = useMemo(
    () => (transaction ? getUserRole(transaction, user?.id) : null),
    [transaction, user?.id],
  );

  const actionButtons = useMemo(
    () => (transaction ? getTransactionActions(transaction, role) : []),
    [transaction, role],
  );

  const timeline = useMemo(
    () => (transaction ? buildTimeline(transaction) : []),
    [transaction],
  );

  const showSellerBankForm = Boolean(
    transaction
    && role === "seller"
    && transaction.buyerConfirmedReceived
    && !transaction.sellerPayoutSent
    && transaction.paymentStatus !== "Selesai",
  );
  const hasSellerBankDetails = Boolean(
    transaction?.sellerBankName
    && transaction?.sellerBankNumber
    && transaction?.sellerBankHolder,
  );
  const showSellerBankEditor = showSellerBankForm && (!hasSellerBankDetails || editingBank);
  const showSellerBankSummary = showSellerBankForm && hasSellerBankDetails && !editingBank;

  const getAvatarUrl = useCallback(
    (senderUserId: string | null, senderTitle: string) => {
      if (senderTitle === "Admin") return ADMIN_AVATAR_URL;
      if (!transaction || !senderUserId) return undefined;
      if (transaction.buyer?.id === senderUserId) return transaction.buyer.avatar;
      if (transaction.seller?.id === senderUserId) return transaction.seller.avatar;
      return undefined;
    },
    [transaction],
  );

  const refresh = useCallback(async () => {
    const payload = await getTransaction(code);
    setTransaction(payload);
  }, [code]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await getSession();
        if (!session.user) {
          router.replace(`/?trx=${encodeURIComponent(code)}`);
          return;
        }
        if (active) {
          setUser(session.user);
          await refresh();
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Gagal memuat transaksi.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [code, refresh, router]);

  useEffect(() => {
    const source = new EventSource("/api/events", { withCredentials: true });
    source.onmessage = async (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "transaction_updated" && payload.code === code) {
          if (payload.transaction) {
            setTransaction(payload.transaction);
          } else {
            await refresh();
          }
        }
      } catch {
        // ignore malformed events
      }
    };
    return () => source.close();
  }, [code, refresh]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [timeline.length, transaction?.paymentStatus]);

  useEffect(() => {
    if (!transaction) return;
    setBankName(transaction.sellerBankName || "");
    setBankNumber(transaction.sellerBankNumber || "");
    setBankHolder(transaction.sellerBankHolder || "");
    if (transaction.sellerPayoutSent || transaction.paymentStatus === "Selesai") {
      setEditingBank(false);
    }
  }, [
    transaction?.code,
    transaction?.sellerBankName,
    transaction?.sellerBankNumber,
    transaction?.sellerBankHolder,
    transaction?.sellerPayoutSent,
    transaction?.paymentStatus,
  ]);

  async function handleSend() {
    const text = message.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");
    try {
      const payload = await sendMessage(code, text);
      setTransaction(payload.transaction);
      setMessage("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Gagal mengirim pesan.");
    } finally {
      setSending(false);
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length || sending) return;
    setSending(true);
    setError("");
    try {
      const payload = await uploadProof(code, files);
      setTransaction(payload.transaction);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload gagal.");
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleTransactionAction(action: TransactionActionKey) {
    if (sending) return;
    const confirmation = getActionConfirmation(action);
    if (confirmation && !window.confirm(confirmation)) return;

    setSending(true);
    setError("");
    try {
      const payload = await runAction(code, action);
      setTransaction(payload.transaction);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Aksi gagal.");
    } finally {
      setSending(false);
    }
  }

  async function handleSellerBankSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setError("");
    try {
      const payload = await updateSellerBankDetails(code, {
        bankName: bankName.trim(),
        bankNumber: bankNumber.trim(),
        bankHolder: bankHolder.trim(),
      });
      setTransaction(payload.transaction);
      setEditingBank(false);
    } catch (bankError) {
      setError(bankError instanceof Error ? bankError.message : "Gagal mengirim data rekening.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-bg text-sm text-white/60">
        Memuat ruang chat...
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
        <p className="text-sm text-white/70">{error || "Transaksi tidak ditemukan."}</p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-xl bg-accent-blue px-4 py-2 text-sm font-semibold"
        >
          Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-bg">
      <ChatHeader
        code={transaction.code}
        status={transaction.paymentStatus}
        onBack={() => router.push("/")}
      />

      <TransactionSummaryCollapse
        transaction={transaction}
        expanded={expanded}
        onToggle={() => setExpanded((value) => !value)}
      />

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2">
        {timeline.map((item) => {
          if (item.kind === "upload") {
            const isAdmin = item.senderTitle === "Admin";
            const isMine = Boolean(user?.id && item.senderUserId === user.id);
            return (
              <UploadBubble
                key={`upload-${item.id}`}
                sender={item.sender}
                senderTitle={item.senderTitle}
                fileName={item.name}
                fileUrl={item.url}
                time={item.time}
                isMine={isMine}
                isAdmin={isAdmin}
                avatarUrl={getAvatarUrl(item.senderUserId, item.senderTitle)}
              />
            );
          }

          if (item.kind === "message" && isSystemMessage(item)) {
            return (
              <SystemMessage
                key={`system-${item.id}`}
                text={item.text}
                icon={getSystemMessageIcon(item.text)}
              />
            );
          }

          if (item.kind !== "message") {
            return null;
          }

          const isAdmin = item.senderTitle === "Admin";
          const isMine = Boolean(user?.id && item.senderUserId === user.id);
          return (
            <ChatBubble
              key={`message-${item.id}`}
              sender={item.sender}
              senderTitle={item.senderTitle}
              text={item.text}
              time={item.time}
              isMine={isMine}
              isAdmin={isAdmin}
              avatarUrl={getAvatarUrl(item.senderUserId, item.senderTitle)}
            />
          );
        })}
        <div ref={chatEndRef} />
      </main>

      {error ? (
        <p className="shrink-0 border-t border-danger/20 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      ) : null}

      {showSellerBankSummary ? (
        <div className="shrink-0 border-t border-border bg-card px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 text-xs">
              <p className="font-semibold text-white">Rekening pencairan sudah dikirim</p>
              <p className="truncate text-white/55">
                {transaction?.sellerBankName} • {transaction?.sellerBankNumber} • {transaction?.sellerBankHolder}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditingBank(true)}
              disabled={sending}
              className="shrink-0 rounded-full border border-accent-blue/30 px-3 py-1.5 text-[11px] font-semibold text-accent-blue disabled:opacity-50"
            >
              Edit rekening
            </button>
          </div>
        </div>
      ) : null}

      {showSellerBankEditor ? (
        <form
          onSubmit={handleSellerBankSubmit}
          className="shrink-0 border-t border-border bg-card px-3 py-2"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-white">Data rekening penjual untuk pencairan dana</p>
            {hasSellerBankDetails ? (
              <button
                type="button"
                onClick={() => setEditingBank(false)}
                className="text-[11px] text-white/55"
              >
                Batal
              </button>
            ) : null}
          </div>
          <div className="grid gap-2">
            <input
              value={bankName}
              onChange={(event) => setBankName(event.target.value)}
              placeholder="Nama bank, contoh: BCA"
              className="h-10 rounded-xl border border-border bg-bg px-3 text-xs text-white placeholder:text-white/35"
              required
            />
            <input
              value={bankNumber}
              onChange={(event) => setBankNumber(event.target.value)}
              placeholder="Nomor rekening"
              className="h-10 rounded-xl border border-border bg-bg px-3 text-xs text-white placeholder:text-white/35"
              required
            />
            <input
              value={bankHolder}
              onChange={(event) => setBankHolder(event.target.value)}
              placeholder="Atas nama rekening"
              className="h-10 rounded-xl border border-border bg-bg px-3 text-xs text-white placeholder:text-white/35"
              required
            />
            <button
              type="submit"
              disabled={sending}
              className="h-10 rounded-xl bg-accent-blue text-xs font-semibold text-white disabled:opacity-50"
            >
              {hasSellerBankDetails ? "Simpan perubahan rekening" : "Kirim data rekening ke admin"}
            </button>
          </div>
        </form>
      ) : null}

      <QuickActionChips
        actions={actionButtons}
        onAction={handleTransactionAction}
        disabled={sending}
      />

      <ChatInput
        value={message}
        onChange={setMessage}
        onSend={handleSend}
        onAttach={() => fileInputRef.current?.click()}
        disabled={!user}
        sending={sending}
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => handleUpload(event.target.files)}
      />
    </div>
  );
}

function getActionConfirmation(action: TransactionActionKey) {
  if (action === "open_dispute") return "Ajukan sengketa untuk transaksi ini?";
  if (action === "cancel_transaction") return "Batalkan transaksi ini?";
  if (action === "account_delivered") return "Konfirmasi bahwa data / item sudah diserahkan ke pembeli?";
  if (action === "goods_received") return "Konfirmasi bahwa item sudah diterima dan aman?";
  if (action === "mark_paid") return "Konfirmasi bahwa pembayaran sudah dikirim ke admin?";
  return "";
}
