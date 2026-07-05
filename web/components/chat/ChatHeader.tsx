"use client";

type ChatHeaderProps = {
  code: string;
  status: string;
  onBack: () => void;
};

export function ChatHeader({ code, status, onBack }: ChatHeaderProps) {
  return (
    <header className="flex min-h-[56px] shrink-0 items-center gap-2 border-b border-border bg-card px-2 py-1.5">
      <button
        type="button"
        onClick={onBack}
        aria-label="Kembali"
        className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-xl text-lg text-white/90"
      >
        ←
      </button>

      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-semibold text-white">Transaksi #{code}</p>
        <p className="mt-0.5 flex items-center gap-1 text-[10px] text-white/45">
          <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-success" aria-hidden="true" />
          <span className="truncate">{status} · Online</span>
        </p>
      </div>

      <button
        type="button"
        aria-label="Menu"
        className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-xl text-lg text-white/80"
      >
        ⋮
      </button>
    </header>
  );
}
