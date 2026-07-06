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
  sendPresenceAway,
  sendPresenceHeartbeat,
  sendTypingState,
  updateSellerBankDetails,
  uploadProof,
} from "@/lib/transaction";
import type { TransactionActionKey } from "@/lib/transaction";
import type { SessionUser, Transaction, TransactionMessage } from "@/lib/types";
import {
  getCounterpartyPresenceText,
  PRESENCE_HEARTBEAT_MS,
  PRESENCE_UI_TICK_MS,
} from "@/lib/presence";
import { ensureWebPushEnabled } from "@/lib/push";

type TransactionChatClientProps = {
  code: string;
};

export function TransactionChatClient({ code }: TransactionChatClientProps) {
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notificationUnlockedRef = useRef(false);
  const lastMessageCountRef = useRef(0);
  const userRef = useRef<SessionUser | null>(null);
  const typingStopRef = useRef<number | null>(null);
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
  const [presenceTick, setPresenceTick] = useState(0);

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
  const typingIndicatorText = useMemo(
    () => (transaction && user?.id ? buildTypingIndicatorText(transaction, user.id) : ""),
    [transaction, user?.id],
  );
  const presenceText = useMemo(
    () => getCounterpartyPresenceText(transaction, role, Date.now()),
    [transaction, role, presenceTick],
  );

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
          ensureWebPushEnabled("user").catch(() => {});
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
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    lastMessageCountRef.current = transaction?.messages?.length || 0;
  }, [transaction?.messages?.length]);

  useEffect(() => {
    const unlock = () => {
      notificationUnlockedRef.current = true;
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
      ensureWebPushEnabled("user").catch(() => {});
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    sendPresenceHeartbeat(code).catch(() => {});
    const timer = window.setInterval(() => {
      sendPresenceHeartbeat(code).catch(() => {});
    }, PRESENCE_HEARTBEAT_MS);
    const presenceTimer = window.setInterval(() => {
      setPresenceTick((value) => value + 1);
    }, PRESENCE_UI_TICK_MS);
    const handleAway = () => {
      sendPresenceAway(code).catch(() => {});
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        sendPresenceHeartbeat(code).catch(() => {});
        setPresenceTick((value) => value + 1);
      }
    };
    window.addEventListener("pagehide", handleAway);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(presenceTimer);
      window.removeEventListener("pagehide", handleAway);
      document.removeEventListener("visibilitychange", handleVisibility);
      sendPresenceAway(code).catch(() => {});
    };
  }, [code, user]);

  useEffect(() => {
    const source = new EventSource("/api/events", { withCredentials: true });
    source.onmessage = async (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "transaction_updated" && payload.code === code) {
          if (payload.transaction) {
            maybePlayIncomingNotification(payload.transaction);
            setTransaction(payload.transaction);
          } else {
            await refresh();
          }
        }
        if (payload.type === "typing_updated" && payload.code === code) {
          setTransaction((current) => current ? { ...current, typing: payload.typing || {} } : current);
        }
        if (payload.type === "presence_updated") {
          setTransaction((current) => {
            if (!current) return current;
            const buyerId = current.buyer?.id;
            const sellerId = current.seller?.id;
            if (payload.userId !== buyerId && payload.userId !== sellerId) {
              return current;
            }
            return updateTransactionPresence(current, payload.userId, payload.presence, payload.adminPresence);
          });
        }
      } catch {
        // ignore malformed events
      }
    };
    return () => source.close();
  }, [code, refresh]);

  useEffect(() => {
    if (!user) return;
    if (typingStopRef.current) window.clearTimeout(typingStopRef.current);
    if (!message.trim()) {
      sendTypingState(code, false).catch(() => {});
      return;
    }
    sendTypingState(code, true).catch(() => {});
    typingStopRef.current = window.setTimeout(() => {
      sendTypingState(code, false).catch(() => {});
    }, 1600);
    return () => {
      if (typingStopRef.current) window.clearTimeout(typingStopRef.current);
    };
  }, [code, message, user]);

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
      await sendTypingState(code, false).catch(() => {});
      setTransaction(payload.transaction);
      setMessage("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Gagal mengirim pesan.");
    } finally {
      setSending(false);
    }
  }

  function maybePlayIncomingNotification(nextTransaction: Transaction) {
    const previousCount = lastMessageCountRef.current;
    const nextCount = nextTransaction.messages?.length || 0;
    const lastMessage = nextTransaction.messages?.[nextCount - 1];
    if (nextCount <= previousCount || !lastMessage || lastMessage.senderUserId === userRef.current?.id) return;
    playMobileNotificationSound();
    if (document.hidden && "Notification" in window && Notification.permission === "granted") {
      new Notification("Pesan baru RekberWE", {
        body: `${lastMessage.sender}: ${lastMessage.text || "Mengirim pesan baru."}`,
      });
    }
  }

  function playMobileNotificationSound() {
    if (!notificationUnlockedRef.current) return;
    if (navigator.vibrate) navigator.vibrate([80, 40, 120]);
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    context.resume?.().catch(() => {});
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 920;
    gain.gain.value = 0.001;
    oscillator.connect(gain);
    gain.connect(context.destination);
    const start = context.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.08, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.32);
    oscillator.start(start);
    oscillator.stop(start + 0.34);
    oscillator.onended = () => context.close().catch(() => {});
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
        title={transaction.title}
        code={transaction.code}
        status={transaction.paymentStatus}
        presenceText={presenceText}
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

      {typingIndicatorText ? (
        <p className="shrink-0 border-b border-white/5 bg-[#0d1524] px-4 py-2 text-[11px] font-medium text-accent-blue">
          {typingIndicatorText}
        </p>
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

function buildTypingIndicatorText(transaction: Transaction, excludeUserId: string) {
  const labels = Object.keys(transaction.typing || {})
    .filter((userId) => userId !== excludeUserId)
    .map((userId) => {
      if (transaction.buyer?.id === userId) return transaction.buyer.displayName || "Pembeli";
      if (transaction.seller?.id === userId) return transaction.seller.displayName || "Penjual";
      return "Admin";
    });
  if (!labels.length) return "";
  if (labels.length === 1) return `${labels[0]} sedang mengetik...`;
  if (labels.length === 2) return `${labels[0]} & ${labels[1]} sedang mengetik...`;
  return `${labels.slice(0, -1).join(", ")} & ${labels[labels.length - 1]} sedang mengetik...`;
}

function getActionConfirmation(action: TransactionActionKey) {
  if (action === "open_dispute") return "Ajukan sengketa untuk transaksi ini?";
  if (action === "cancel_transaction") return "Batalkan transaksi ini?";
  if (action === "account_delivered") return "Konfirmasi bahwa data / item sudah diserahkan ke pembeli?";
  if (action === "goods_received") return "Konfirmasi bahwa item sudah diterima dan aman?";
  if (action === "mark_paid") return "Konfirmasi bahwa pembayaran sudah dikirim ke admin?";
  return "";
}

function updateTransactionPresence(
  transaction: Transaction | null,
  userId?: string,
  presence?: Transaction["adminPresence"],
  adminPresence?: Transaction["adminPresence"],
) {
  if (!transaction) return transaction;
  const next = { ...transaction };
  const buyer = next.buyer;
  if (buyer && buyer.id === userId) {
    next.buyer = { ...buyer, presence };
  }
  const seller = next.seller;
  if (seller && seller.id === userId) {
    next.seller = { ...seller, presence };
  }
  if (adminPresence) {
    next.adminPresence = adminPresence;
  }
  return next;
}
