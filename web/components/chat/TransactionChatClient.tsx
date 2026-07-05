"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
