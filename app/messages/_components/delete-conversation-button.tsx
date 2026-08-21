// app/messages/_components/delete-conversation-button.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { deleteConversationAction } from "@/lib/actions/conversation-delete";

export default function DeleteConversationButton({
  conversationId,
}: {
  conversationId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const remove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = window.confirm(
      "هل أنت متأكد من حذف هذه المحادثة من قائمتك؟",
    );

    if (!confirmed) return;

    startTransition(async () => {
      setError("");
      const result = await deleteConversationAction(conversationId);

      if (!result.success) {
        setError(result.error || "تعذر حذف المحادثة.");
        alert(result.error || "تعذر حذف المحادثة");
      } else {
        // تحديث الواجهة فوراً وحذف العنصر من الشاشة
        router.refresh();
      }
    });
  };

  return (
    <div className="shrink-0">
      <button
        type="button"
        disabled={pending}
        onClick={remove}
        className="flex h-9 w-9 items-center justify-center rounded-2xl text-muted transition-all duration-200 hover:bg-[rgb(var(--danger)/0.1)] hover:text-[rgb(var(--danger))] active:scale-90 disabled:opacity-40"
        aria-label="حذف المحادثة"
        title="حذف المحادثة"
      >
        {pending ? (
          <Loader2 size={15} className="animate-spin text-[rgb(var(--danger))]" />
        ) : (
          <Trash2 size={15} />
        )}
      </button>

      {error && (
        <span className="sr-only" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}