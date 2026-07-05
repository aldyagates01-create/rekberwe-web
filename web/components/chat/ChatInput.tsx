"use client";

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onAttach: () => void;
  disabled?: boolean;
  sending?: boolean;
};

export function ChatInput({
  value,
  onChange,
  onSend,
  onAttach,
  disabled = false,
  sending = false,
}: ChatInputProps) {
  return (
    <div className="shrink-0 border-t border-border bg-card px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={onAttach}
          aria-label="Lampirkan file"
          className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-xl text-lg"
        >
          📎
        </button>
        <textarea
          rows={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
          placeholder="Tulis pesan..."
          disabled={disabled || sending}
          className="max-h-28 min-h-touch flex-1 resize-none rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-accent-blue/40"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={disabled || sending || !value.trim()}
          aria-label="Kirim pesan"
          className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-full bg-accent-blue text-base font-bold text-white disabled:opacity-40"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
