"use client";

type ChatHeaderProps = {
  code: string;
  status: string;
  onBack: () => void;
};

export function ChatHeader({ code, status, onBack }: ChatHeaderProps) {
  return (
    <header className="flex min-h-[56px] shrink-0 items-center gap-2 border-b border-border bg-[#07111f] px-2 py-1.5">
      <button
        type="button"
        onClick={onBack}
        aria-label="Kembali"
        className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-xl text-2xl font-light text-white/90"
      >
        ←
      </button>

      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[15px] font-semibold text-white">Transaksi #{code}</p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-success">
          <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-success" aria-hidden="true" />
          <span className="truncate">Online</span>
        </p>
      </div>

      <span
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-success/15 text-sm font-bold text-success ring-1 ring-success/20"
        aria-label={status}
      >
        ✓
      </span>
      <button
        type="button"
        aria-label="Menu"
        className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-xl text-2xl leading-none text-white/80"
      >
        ⋮
      </button>
    </header>
  );
}
