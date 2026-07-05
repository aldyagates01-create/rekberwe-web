import { getInitials, formatTime } from "@/lib/format";

export const ADMIN_AVATAR_URL = "/assets/rekberwe-logo-header.svg";

type AvatarProps = {
  name: string;
  avatarUrl?: string;
  size?: number;
};

export function Avatar({ name, avatarUrl, size = 28 }: AvatarProps) {
  const style = { width: size, height: size };
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={style}
        className="shrink-0 rounded-full object-cover ring-1 ring-border"
      />
    );
  }
  return (
    <span
      style={style}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-accent-blue/20 text-xs font-semibold text-accent-blue ring-1 ring-border"
    >
      {getInitials(name)}
    </span>
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
};

export function ChatBubble({
  sender,
  senderTitle,
  text,
  time,
  isMine,
  isAdmin,
  avatarUrl,
}: ChatBubbleProps) {
  const align = isMine && !isAdmin ? "justify-end" : "justify-start";
  const bubbleClass = isAdmin
    ? "bg-card border border-border text-white/90"
    : isMine
      ? "bg-success/15 border border-success/25 text-white"
      : "bg-card border border-border text-white/90";

  return (
    <div className={`flex ${align} gap-2 px-3 py-1`}>
      {!isMine || isAdmin ? <Avatar name={sender} avatarUrl={avatarUrl} /> : null}
      <div className={`max-w-bubble rounded-xl px-3 py-2 ${bubbleClass}`}>
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold">{sender}</span>
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
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{text}</p>
        <p className="mt-1 text-right text-[10px] text-white/40">{formatTime(time)}</p>
      </div>
      {isMine && !isAdmin ? <Avatar name={sender} avatarUrl={avatarUrl} /> : null}
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
}: {
  sender: string;
  senderTitle: string;
  fileName: string;
  fileUrl: string;
  time: string;
  isMine: boolean;
  isAdmin: boolean;
  avatarUrl?: string;
}) {
  const isImage = isImageFile(fileName, fileUrl);

  return (
    <div className={`flex ${isMine && !isAdmin ? "justify-end" : "justify-start"} gap-2 px-3 py-1`}>
      {!isMine || isAdmin ? <Avatar name={sender} avatarUrl={avatarUrl} /> : null}
      <div className="max-w-bubble overflow-hidden rounded-xl border border-border bg-card px-3 py-2">
        <p className="text-xs font-semibold">{sender} · {senderTitle}</p>
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
      {isMine && !isAdmin ? <Avatar name={sender} avatarUrl={avatarUrl} /> : null}
    </div>
  );
}

function isImageFile(fileName: string, fileUrl: string) {
  const value = `${fileName} ${fileUrl}`.split("?")[0].toLowerCase();
  return /\.(apng|avif|gif|jpe?g|png|webp)$/i.test(value);
}
