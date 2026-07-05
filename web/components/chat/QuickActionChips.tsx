"use client";

import type { TransactionActionButton } from "@/lib/transaction";

type QuickActionChipsProps = {
  actions: TransactionActionButton[];
  onAction: (action: TransactionActionButton["action"]) => void;
  disabled?: boolean;
};

export function QuickActionChips({
  actions,
  onAction,
  disabled = false,
}: QuickActionChipsProps) {
  if (!actions.length) return null;

  return (
    <div className="shrink-0 border-t border-border bg-bg/95 px-3 py-1.5">
      <div className="flex gap-2 overflow-x-auto scrollbar-none">
        {actions.map((item) => (
          <Chip
            key={item.action}
            onClick={() => onAction(item.action)}
            disabled={disabled || item.disabled}
            variant={item.variant}
            title={item.reason}
          >
            {item.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({
  children,
  onClick,
  disabled = false,
  variant = "default",
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "success" | "danger";
  title?: string;
}) {
  const colors =
    variant === "success"
      ? "border-success/30 text-success"
      : variant === "danger"
        ? "border-danger/30 text-danger"
        : "border-warning/30 text-warning";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-full border bg-card px-3 text-[11px] font-semibold disabled:opacity-40 ${colors}`}
    >
      {children}
    </button>
  );
}
