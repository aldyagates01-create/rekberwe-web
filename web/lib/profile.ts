import type { Transaction, User } from "@/lib/types";

export type ProfileRole = "buyer" | "seller";

export type TransactionProfile = User & {
  title: string;
  role: ProfileRole | "admin";
  verified: boolean;
};

export function isUserVerified(user?: User | null) {
  return user?.verificationStatus === "verified" || Boolean(user?.verified);
}

export function getTransactionProfile(
  transaction: Transaction | null,
  role: ProfileRole,
): TransactionProfile | null {
  if (!transaction) return null;
  if (role === "buyer" && transaction.buyer) {
    return normalizeProfileDetails(transaction.buyer, "Pembeli", "buyer");
  }
  if (role === "seller" && transaction.seller) {
    return normalizeProfileDetails(transaction.seller, "Penjual", "seller");
  }
  return null;
}

function normalizeProfileDetails(
  user: User,
  title: string,
  role: ProfileRole,
): TransactionProfile {
  return {
    ...user,
    title,
    role,
    displayName: user.displayName || "Pengguna",
    verified: isUserVerified(user),
  };
}

export function countCompletedTransactionsForUser(userId: string, transactions: Transaction[]) {
  if (!userId) return 0;
  return transactions.filter(
    (item) =>
      item.paymentStatus === "Selesai"
      && (item.buyer?.id === userId || item.seller?.id === userId),
  ).length;
}

export type ProfileStatusRow = {
  label: string;
  done: boolean;
};

export function buildProfileStatusRows(profile: TransactionProfile): ProfileStatusRow[] {
  const connectedProviders = new Set(
    [profile.provider, ...(profile.linkedProviders || []).map((item) => item.provider)].filter(Boolean),
  );
  return [
    { label: "Google / Gmail", done: connectedProviders.has("Google") },
    { label: "Facebook", done: connectedProviders.has("Facebook") },
    { label: "Discord", done: connectedProviders.has("Discord") },
    { label: "Telegram", done: connectedProviders.has("Telegram") },
    { label: "WhatsApp", done: Boolean(profile.whatsapp) },
    { label: "Lokasi terverifikasi", done: Boolean(profile.locationVerified) },
    { label: "Foto KTP", done: Boolean(profile.ktpPhotoUrl) },
    { label: "Video selfie KTP", done: Boolean(profile.ktpVideoUrl) },
  ];
}
