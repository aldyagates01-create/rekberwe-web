import { TransactionUserProfileClient } from "@/components/chat/TransactionUserProfileClient";
import type { ProfileRole } from "@/lib/profile";

type PageProps = {
  params: Promise<{ code: string; role: string }>;
};

export default async function TransactionUserProfilePage({ params }: PageProps) {
  const { code, role } = await params;
  const normalizedRole = role === "buyer" || role === "seller" ? role : "buyer";
  return (
    <TransactionUserProfileClient
      code={code.toUpperCase()}
      role={normalizedRole as ProfileRole}
    />
  );
}
