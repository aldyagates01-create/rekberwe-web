"use client";

type QuickActionChipsProps = {
  onUpload: () => void;
  onDetail: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  onReport: () => void;
  confirmDisabled?: boolean;
};

export function QuickActionChips({
  onUpload,
  onDetail,
  onConfirm,
  confirmLabel = "Konfirmasi",
  onReport,
  confirmDisabled = false,
}: QuickActionChipsProps) {
  return (
    <div className="shrink-0 border-t border-border bg-bg/95 px-3 py-2">
      <div className="flex gap-2 overflow-x-auto scrollbar-none">
        <Chip onClick={onUpload}>Upload Bukti</Chip>
        <Chip onClick={onDetail}>Detail Pesanan</Chip>
        {onConfirm ? (
          <Chip onClick={onConfirm} disabled={confirmDisabled} variant="success">
            {confirmLabel}
          </Chip>
        ) : null}
        <Chip onClick={onReport} variant="danger">
          Lapor
        </Chip>
      </div>
    </div>
  );
}

function Chip({
  children,
  onClick,
  disabled = false,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "success" | "danger";
}) {
  const colors =
    variant === "success"
      ? "border-success/30 text-success"
      : variant === "danger"
        ? "border-danger/30 text-danger"
        : "border-border text-white/85";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full border bg-card px-4 text-xs font-medium disabled:opacity-40 ${colors}`}
    >
      {children}
    </button>
  );
}
