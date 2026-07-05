"use client";

type ChatHeaderProps = {
  code: string;
  status: string;
  onBack: () => void;
};

export function ChatHeader({ code, status, onBack }: ChatHeaderProps) {
  return (
    <header className="shrink-0 border-b border-border bg-card px-3 py-2 max-h-[70px]">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Kembali"
          className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl text-lg text-white/90"
        >
          ←
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">Transaksi #{code}</p>
          <p className="truncate text-[10px] font-medium uppercase tracking-wide text-accent-blue">
            {status}
          </p>
        </div>
        <button
          type="button"
          aria-label="Menu"
          className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl text-lg text-white/80"
        >
          ⋮
        </button>
      </div>
      <p className="mt-0.5 truncate text-[10px] text-white/45">
        Pembeli • Penjual • Admin · <span className="text-success">Online</span>
      </p>
    </header>
  );
}
