"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { createConversationAction } from "@/lib/actions/messaging";

export default function MessageProviderButton({ providerId, listingId, bookingId, className = "secondary-button" }: {
  providerId: string; listingId?: string | null; bookingId?: string | null; className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const start = () => startTransition(async () => {
    setError("");
    const result = await createConversationAction({ providerId, listingId, bookingId });
    if (result.success) router.push(`/messages/${result.conversationId}`);
    else if ("requiresLogin" in result && result.requiresLogin) router.push(`/login?redirect=${encodeURIComponent(location.pathname)}`);
    else setError(result.error || "تعذر بدء المحادثة");
  });
  return <div className="min-w-0">
    <button type="button" onClick={start} disabled={pending} className={className}>
      <MessageCircle className="me-2 h-4 w-4" aria-hidden="true" />
      {pending ? "جاري الفتح…" : "راسلني"}
    </button>
    {error && <p role="alert" className="mt-1 max-w-56 text-[10px] leading-5 text-[rgb(var(--danger))]">{error}</p>}
  </div>;
}
