import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getConversationAction } from "@/lib/actions/messaging";
import ConversationClient from "./conversation-client";

export const metadata: Metadata = { title: "محادثة جسر" };
export const dynamic = "force-dynamic";

export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const result = await getConversationAction(conversationId);
  if (!result.success || !result.context || !result.currentUserId) notFound();
  return <ConversationClient
    conversationId={conversationId}
    currentUserId={result.currentUserId}
    context={result.context}
    initialMessages={result.messages}
    initialHasMore={result.hasMore}
    initialCursor={result.nextCursor}
  />;
}
