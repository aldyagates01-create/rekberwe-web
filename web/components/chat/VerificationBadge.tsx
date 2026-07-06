type VerificationBadgeProps = {
  verified: boolean;
  size?: "sm" | "md";
};

export function VerificationBadge({ verified, size = "sm" }: VerificationBadgeProps) {
  const sizeClass = size === "md" ? "h-5 w-5 text-[11px]" : "h-4 w-4 text-[10px]";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${sizeClass} ${
        verified ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
      }`}
      aria-label={verified ? "Terverifikasi" : "Belum terverifikasi"}
      title={verified ? "Terverifikasi" : "Belum terverifikasi"}
    >
      {verified ? "✓" : "✕"}
    </span>
  );
}
