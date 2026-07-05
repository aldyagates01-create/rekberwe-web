import { TransactionDetailClient } from "@/components/chat/TransactionDetailClient";

type PageProps = {
  params: Promise<{ code: string }>;
};

export default async function TransactionDetailPage({ params }: PageProps) {
  const { code } = await params;
  return <TransactionDetailClient code={code.toUpperCase()} />;
}
