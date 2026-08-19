"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteConversationAction } from "@/lib/actions/conversation-delete";

export default function DeleteConversationButton({
  conversationId,
}: {
  conversationId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const remove = () => {
    const confirmed = window.confirm(
      "حذف هذه المحادثة من قائمة رسائلك؟ إذا وصلت رسالة جديدة لاحقاً ستظهر المحادثة من جديد.",
    );

    if (!confirmed) return;

    startTransition(async () => {
      setError("");
      const result =
        await deleteConversationAction(conversationId);

      if (!result.success) {
        setError(result.error || "تعذر حذف المحادثة.");
      }
    });
  };

  return (
    <div className="shrink-0">
      <button
        type="button"
        disabled={pending}
        onClick={remove}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-[rgb(var(--danger)/0.08)] hover:text-[rgb(var(--danger))] active:scale-[0.92] disabled:opacity-40"
        aria-label="حذف المحادثة"
        title="حذف المحادثة"
      >
        <Trash2 size={15} />
      </button>

      {error && (
        <span className="sr-only" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
