"use client";

type ChatHeaderProps = {
  code: string;
  status: string;
  presenceText?: string;
  isTyping?: boolean;
  onBack: () => void;
};

export function ChatHeader({ code, status, presenceText = "Offline", isTyping = false, onBack }: ChatHeaderProps) {
  return (
    <header className="flex min-h-[48px] shrink-0 items-center gap-1.5 border-b border-border bg-[#07111f] px-2 py-1">
      <button
        type="button"
        onClick={onBack}
        aria-label="Kembali"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xl font-light text-white/90"
      >
        ←
      </button>

      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-semibold text-white">Transaksi #{code}</p>
        <p className={`flex items-center gap-1 text-[10px] font-medium ${isTyping ? "text-accent-blue" : presenceText === "Online" || presenceText.includes("online") ? "text-success" : "text-white/50"}`}>
          <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${isTyping ? "bg-accent-blue" : presenceText === "Online" || presenceText.includes("online") ? "bg-success" : "bg-white/35"}`} aria-hidden="true" />
          <span className="truncate">{isTyping ? "Sedang mengetik..." : presenceText}</span>
        </p>
      </div>

      <span
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-success/15 text-xs font-bold text-success ring-1 ring-success/20"
        aria-label={status}
      >
        ✓
      </span>
      <button
        type="button"
        aria-label="Menu"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xl leading-none text-white/80"
      >
        ⋮
      </button>
    </header>
  );
}
