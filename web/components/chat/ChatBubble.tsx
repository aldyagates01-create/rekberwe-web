"use client";

import { getInitials, formatTime } from "@/lib/format";
import { VerificationBadge } from "@/components/chat/VerificationBadge";

export const ADMIN_AVATAR_URL = "/assets/rekberwe-logo-shield.png?v=7";

type AvatarProps = {
  name: string;
  avatarUrl?: string;
  size?: number;
  onClick?: () => void;
};

export function Avatar({ name, avatarUrl, size = 28, onClick }: AvatarProps) {
  const style = { width: size, height: size };
  const image = avatarUrl ? (
    <img
      src={avatarUrl}
      alt={name}
      style={{ ...style, ...(avatarUrl.includes("rekberwe-logo") ? { objectPosition: "center" } : {}) }}
      className="shrink-0 rounded-full object-cover ring-1 ring-border"
    />
  ) : (
    <span
      style={style}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-accent-blue/20 text-xs font-semibold text-accent-blue ring-1 ring-border"
    >
      {getInitials(name)}
    </span>
  );

  if (!onClick) return image;
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-full border-0 bg-transparent p-0"
      aria-label={`Lihat profil ${name}`}
    >
      {image}
    </button>
  );
}

type ChatBubbleProps = {
  sender: string;
  senderTitle: string;
  text: string;
  time: string;
  isMine: boolean;
  isAdmin: boolean;
  avatarUrl?: string;
  senderVerified?: boolean;
  onAvatarClick?: () => void;
};

export function ChatBubble({
  sender,
  senderTitle,
  text,
  time,
  isMine,
  isAdmin,
  avatarUrl,
  senderVerified = false,
  onAvatarClick,
}: ChatBubbleProps) {
  const align = isMine && !isAdmin ? "justify-end" : "justify-start";
  const bubbleClass = isAdmin
    ? "bg-card border border-border text-white/90"
    : isMine
      ? "bg-success/15 border border-success/25 text-white"
      : "bg-card border border-border text-white/90";

  return (
    <div className={`flex ${align} gap-2 px-3 py-1`}>
      {!isMine || isAdmin ? (
        <Avatar name={sender} avatarUrl={avatarUrl} onClick={onAvatarClick} />
      ) : null}
      <div className={`max-w-bubble rounded-xl px-3 py-2 ${bubbleClass}`}>
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-xs font-semibold">
            {sender}
            {!isAdmin ? <VerificationBadge verified={senderVerified} /> : null}
          </span>
          {isAdmin ? (
            <span className="rounded-full bg-accent-purple/20 px-2 py-0.5 text-[10px] font-bold uppercase text-accent-purple">
              Admin
            </span>
          ) : (
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
              {senderTitle}
            </span>
          )}
        </div>
        <MessageText text={text} />
        <p className="mt-1 text-right text-[10px] text-white/40">{formatTime(time)}</p>
      </div>
      {isMine && !isAdmin ? (
        <Avatar name={sender} avatarUrl={avatarUrl} onClick={onAvatarClick} />
      ) : null}
    </div>
  );
}

function MessageText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+|\/(?:terms|security-guide)(?:[^\s]*)?)/g);
  const shareUrl = parts.find((part) => isSafeHttpUrl(part));
  return (
    <div>
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
        {parts.map((part, index) => {
          if (isSafeHttpUrl(part)) {
            return (
              <a
                key={`${part}-${index}`}
                href={part}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-accent-blue underline"
              >
                {part}
              </a>
            );
          }
          return <span key={`${part}-${index}`}>{part}</span>;
        })}
      </p>
      {shareUrl ? <ShareLinkActions url={shareUrl} /> : null}
    </div>
  );
}

function isSafeHttpUrl(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return false;
  if (/^\/(?!\/)/.test(raw)) {
    return /^\/(?:terms|security-guide)(?:[^\s]*)?$/.test(raw.split(/[\s"'<>]/)[0] || "");
  }
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function ShareLinkActions({ url }: { url: string }) {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`Silakan buka link transaksi RekberWe ini: ${url}`);
  const links = [
    { label: "WA", href: `https://wa.me/?text=${encodedText}` },
    { label: "FB", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: "Telegram", href: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent("Link transaksi RekberWe")}` },
  ];

  async function copyLink() {
    await navigator.clipboard?.writeText(url);
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={copyLink}
        className="rounded-full border border-border bg-bg/70 px-2.5 py-1 text-[10px] font-semibold text-white/80"
      >
        Copy
      </button>
      {links.map((item) => (
        <a
          key={item.label}
          href={item.href}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-accent-blue/25 bg-accent-blue/10 px-2.5 py-1 text-[10px] font-semibold text-accent-blue"
        >
          {item.label}
        </a>
      ))}
    </div>
  );
}

export function SystemMessage({ text, icon }: { text: string; icon: string }) {
  return (
    <div className="mx-auto my-2 max-w-[92%] rounded-xl border border-border bg-card/80 px-3 py-2 text-center text-xs leading-relaxed text-white/75">
      <span className="mr-1">{icon}</span>
      {text}
    </div>
  );
}

export function UploadBubble({
  sender,
  senderTitle,
  fileName,
  fileUrl,
  time,
  isMine,
  isAdmin,
  avatarUrl,
  senderVerified = false,
  onAvatarClick,
}: {
  sender: string;
  senderTitle: string;
  fileName: string;
  fileUrl: string;
  time: string;
  isMine: boolean;
  isAdmin: boolean;
  avatarUrl?: string;
  senderVerified?: boolean;
  onAvatarClick?: () => void;
}) {
  const isImage = isImageFile(fileName, fileUrl);

  return (
    <div className={`flex ${isMine && !isAdmin ? "justify-end" : "justify-start"} gap-2 px-3 py-1`}>
      {!isMine || isAdmin ? (
        <Avatar name={sender} avatarUrl={avatarUrl} onClick={onAvatarClick} />
      ) : null}
      <div className="max-w-bubble overflow-hidden rounded-xl border border-border bg-card px-3 py-2">
        <p className="inline-flex items-center gap-1 text-xs font-semibold">
          {sender}
          {!isAdmin ? <VerificationBadge verified={senderVerified} /> : null}
          <span className="text-white/45">· {senderTitle}</span>
        </p>
        {isImage ? (
          <a href={fileUrl} target="_blank" rel="noreferrer" className="mt-2 block">
            <img
              src={fileUrl}
              alt={fileName}
              className="max-h-64 w-full rounded-lg object-cover ring-1 ring-border"
              loading="lazy"
            />
            <span className="mt-1 block break-all text-xs text-white/50">{fileName}</span>
          </a>
        ) : (
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block break-all text-sm text-accent-blue underline"
          >
            📎 {fileName}
          </a>
        )}
        <p className="mt-1 text-right text-[10px] text-white/40">{formatTime(time)}</p>
      </div>
      {isMine && !isAdmin ? (
        <Avatar name={sender} avatarUrl={avatarUrl} onClick={onAvatarClick} />
      ) : null}
    </div>
  );
}

function isImageFile(fileName: string, fileUrl: string) {
  const value = `${fileName} ${fileUrl}`.split("?")[0].toLowerCase();
  return /\.(apng|avif|gif|jpe?g|png|webp)$/i.test(value);
}
