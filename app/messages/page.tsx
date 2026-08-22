import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Archive,
  ArrowLeft,
  BellOff,
  MessageCircle,
  Pin,
  ShieldCheck,
} from "lucide-react";
import { getConversationInboxAction } from "@/lib/actions/messaging";
import DeleteConversationButton from "./_components/delete-conversation-button";
import ConversationActionsButton from "./_components/conversation-actions-button";

export const metadata: Metadata = { title: "الرسائل" };
export const dynamic = "force-dynamic";

function relativeDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const diff = Date.now() - date.getTime();

  if (diff < 60_000) return "الآن";
  if (diff < 3_600_000) return `منذ ${Math.floor(diff / 60_000)} د`;
  if (diff < 86_400_000) return `منذ ${Math.floor(diff / 3_600_000)} س`;

  return date.toLocaleDateString("ar-JO", {
    month: "short",
    day: "numeric",
  });
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const archived = params.view === "archived";

  const result = await getConversationInboxAction({ archived });
  const now = new Date();

  return (
    <main className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
      <header className="border-b border-theme pb-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold text-brand">الرسائل</p>
            <h1 className="mt-1 text-3xl font-black tracking-[-.05em]">
              {archived ? "المحادثات المؤرشفة" : "محادثاتك"}
            </h1>
            <p className="mt-2 max-w-xl text-xs leading-6 text-muted">
              كل تفاصيل الشغل، الصور والاتفاقات بتظل محفوظة هون.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={archived ? "/messages" : "/messages?view=archived"}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand"
            >
              <Archive size={14} />
              {archived ? "رجوع للرسائل" : "الأرشيف"}
            </Link>

            <Link
              href="/discover"
              className="inline-flex items-center gap-1 text-xs font-bold text-brand"
            >
              دور على خدمة
              <ArrowLeft size={14} />
            </Link>
          </div>
        </div>
      </header>

      <section className="mt-6">
        {!result.success ? (
          <div
            role="alert"
            className="border-s-2 border-[rgb(var(--danger))] bg-[rgb(var(--danger)/0.04)] px-4 py-4 text-sm"
          >
            {result.error}
            <Link href="/login" className="ms-1 font-bold text-brand">
              تسجيل الدخول
            </Link>
          </div>
        ) : result.conversations.length === 0 ? (
          <div className="py-16 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[rgb(var(--primary-soft))] text-brand">
              {archived ? <Archive size={20} /> : <MessageCircle size={20} />}
            </span>

            <h2 className="mt-4 text-lg font-black">
              {archived ? "ما عندك محادثات بالأرشيف" : "لسه ما في محادثات"}
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-muted">
              {archived
                ? "لما تأرشف محادثة، رح تلاقيها هون."
                : "لما تلاقي مقدم خدمة مناسب، ابعثله من صفحته واحكيله شو محتاج."}
            </p>

            {!archived && (
              <Link href="/discover" className="brand-button mt-5">
                استكشف الخدمات
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[rgb(var(--border))] border-y border-theme">
            {result.conversations.map((conversation) => {
              const pinned = Boolean(conversation.pinned_at);
              const muted =
                Boolean(conversation.muted_until) &&
                new Date(conversation.muted_until as string).getTime() > now.getTime();

              return (
                <div
                  key={conversation.conversation_id}
                  className="relative flex items-center transition-colors hover:bg-surface-muted"
                >
                  <Link
                    href={`/messages/${conversation.conversation_id}`}
                    className="group flex min-h-24 min-w-0 flex-1 items-center gap-3 py-4 pe-2"
                  >
                    <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[rgb(var(--primary-soft))] text-base font-black text-brand">
                      {conversation.counterpart_avatar_url ? (
                        <Image
                          src={conversation.counterpart_avatar_url}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        conversation.counterpart_name.slice(0, 1)
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <strong className="truncate text-sm">
                          {conversation.counterpart_name}
                        </strong>

                        {conversation.counterpart_verified && (
                          <ShieldCheck
                            className="h-3.5 w-3.5 shrink-0 text-[rgb(var(--success))]"
                            aria-label="موثّق"
                          />
                        )}

                        {pinned && (
                          <Pin size={11} className="shrink-0 text-brand" aria-label="مثبتة" />
                        )}

                        {muted && (
                          <BellOff size={11} className="shrink-0 text-muted" aria-label="مكتومة" />
                        )}
                      </span>

                      {conversation.listing_title && (
                        <span className="mt-0.5 block truncate text-[10px] font-bold text-brand">
                          {conversation.listing_title}
                        </span>
                      )}

                      <span className="mt-1 block truncate text-xs text-muted">
                        {conversation.last_message_preview || "افتح المحادثة وابدأ الحكي"}
                      </span>
                    </span>

                    <span className="flex shrink-0 flex-col items-end gap-2 text-[9px] text-muted">
                      <time>{relativeDate(conversation.last_message_at)}</time>

                      {conversation.unread_count > 0 && (
                        <span className="inline-flex min-w-5 justify-center rounded-full bg-[rgb(var(--primary))] px-1.5 py-0.5 font-bold text-white">
                          {conversation.unread_count}
                        </span>
                      )}
                    </span>
                  </Link>

                  <div className="flex items-center gap-1 ps-1">
                    <ConversationActionsButton
                      conversationId={conversation.conversation_id}
                      pinned={pinned}
                      archived={archived}
                      muted={muted}
                    />

                    <DeleteConversationButton
                      conversationId={conversation.conversation_id}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
