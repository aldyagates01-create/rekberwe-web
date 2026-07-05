import { TransactionChatClient } from "@/components/chat/TransactionChatClient";

type PageProps = {
  params: Promise<{ code: string }>;
};

export default async function TransactionChatPage({ params }: PageProps) {
  const { code } = await params;
  return <TransactionChatClient code={code.toUpperCase()} />;
}
