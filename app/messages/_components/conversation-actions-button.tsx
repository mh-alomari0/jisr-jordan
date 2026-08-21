"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  BellOff,
  BellRing,
  LoaderCircle,
  MoreVertical,
  Pin,
  PinOff,
  RotateCcw,
} from "lucide-react";
import { updateConversationPreferenceAction } from "@/lib/actions/messaging";

export default function ConversationActionsButton({
  conversationId,
  pinned,
  archived,
  muted,
}: {
  conversationId: string;
  pinned: boolean;
  archived: boolean;
  muted: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (
    action:
      | "PIN"
      | "UNPIN"
      | "ARCHIVE"
      | "UNARCHIVE"
      | "MUTE_8H"
      | "MUTE_7D"
      | "UNMUTE",
  ) =>
    startTransition(async () => {
      const result =
        await updateConversationPreferenceAction({
          conversationId,
          action,
        });

      if (!result.success) {
        window.alert(
          result.error || "ما قدرنا نحفظ التغيير.",
        );
        return;
      }

      setOpen(false);
      router.refresh();
    });

  return (
    <div className="relative">
      <button
        type="button"
        disabled={pending}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className="flex h-9 w-9 items-center justify-center rounded-2xl text-muted transition hover:bg-surface-muted hover:text-brand active:scale-90"
        aria-label="خيارات المحادثة"
      >
        {pending ? (
          <LoaderCircle
            size={15}
            className="animate-spin"
          />
        ) : (
          <MoreVertical size={16} />
        )}
      </button>

      {open && (
        <div
          className="absolute end-0 top-11 z-40 w-48 rounded-2xl border border-theme bg-surface p-1.5 shadow-xl"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <button
            type="button"
            onClick={() =>
              run(pinned ? "UNPIN" : "PIN")
            }
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold hover:bg-surface-muted"
          >
            {pinned ? (
              <PinOff size={15} />
            ) : (
              <Pin size={15} />
            )}
            {pinned ? "فك التثبيت" : "ثبّت المحادثة"}
          </button>

          <button
            type="button"
            onClick={() =>
              run(archived ? "UNARCHIVE" : "ARCHIVE")
            }
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold hover:bg-surface-muted"
          >
            {archived ? (
              <RotateCcw size={15} />
            ) : (
              <Archive size={15} />
            )}
            {archived ? "رجّعها للوارد" : "أرشف المحادثة"}
          </button>

          {muted ? (
            <button
              type="button"
              onClick={() => run("UNMUTE")}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold hover:bg-surface-muted"
            >
              <BellRing size={15} />
              رجّع التنبيهات
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => run("MUTE_8H")}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold hover:bg-surface-muted"
              >
                <BellOff size={15} />
                سكّت 8 ساعات
              </button>
              <button
                type="button"
                onClick={() => run("MUTE_7D")}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold hover:bg-surface-muted"
              >
                <BellOff size={15} />
                سكّت أسبوع
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
