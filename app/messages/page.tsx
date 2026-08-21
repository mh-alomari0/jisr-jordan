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
  Sparkles,
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
  if (diff < 3_600_000)
    return `منذ ${Math.floor(diff / 60_000)} د`;
  if (diff < 86_400_000)
    return `منذ ${Math.floor(diff / 3_600_000)} س`;

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

  const result = await getConversationInboxAction({
    archived,
  });

  const now = new Date();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="relative overflow-hidden rounded-[2.1rem] bg-[#0b817a] p-6 text-white sm:p-8">
        <div className="absolute -left-16 -top-20 h-52 w-52 rounded-full border-[22px] border-white/10" />

        <div className="relative">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
            <MessageCircle size={20} />
          </span>

          <p className="mt-6 text-[10px] font-bold text-[#c9eee8]">
            رسائلك على جسر
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-[-.05em] sm:text-5xl">
            كل حكيك
            <span className="text-[#ffc985]"> بمكان واحد.</span>
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#d9f2ee]">
            احكي، ابعث صور وفيديو وصوت، وخلي تفاصيل الشغل محفوظة عندك.
          </p>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold text-brand">
              صندوق الرسائل
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              {archived ? "الأرشيف" : "محادثاتك"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={archived ? "/messages" : "/messages?view=archived"}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-theme bg-surface px-3 text-xs font-bold text-brand"
            >
              <Archive size={14} />
              {archived ? "الرسائل" : "الأرشيف"}
            </Link>

            <Link
              href="/discover"
              className="inline-flex items-center gap-1 text-xs font-bold text-brand"
            >
              اكتشف الخدمات
              <ArrowLeft size={14} />
            </Link>
          </div>
        </div>

        {!result.success ? (
          <div
            role="alert"
            className="rounded-[1.8rem] border border-theme bg-surface p-8 text-center text-sm"
          >
            {result.error}
            <Link
              href="/login"
              className="ms-1 font-bold text-brand"
            >
              تسجيل الدخول
            </Link>
          </div>
        ) : result.conversations.length === 0 ? (
          <div className="rounded-[1.8rem] border border-dashed border-[rgb(var(--primary)/0.28)] bg-[rgb(var(--primary)/0.025)] px-6 py-14 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgb(var(--primary-soft))] text-brand">
              {archived ? (
                <Archive size={25} />
              ) : (
                <Sparkles size={25} />
              )}
            </span>

            <h2 className="mt-5 text-lg font-bold">
              {archived
                ? "الأرشيف فاضي"
                : "لسا ما بلشت أي محادثة"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-muted">
              {archived
                ? "أي محادثة بتأرشفها رح تلاقيها هون."
                : "لما تلاقي مقدم خدمة مناسب، افتح عرضه وابعتله."}
            </p>

            {!archived && (
              <Link
                href="/discover"
                className="brand-button mt-5"
              >
                شوف مين بناسبك
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-visible rounded-[1.8rem] border border-theme bg-surface shadow-soft">
            {result.conversations.map((conversation) => {
              const pinned = Boolean(conversation.pinned_at);
              const muted =
                Boolean(conversation.muted_until) &&
                new Date(
                  conversation.muted_until as string,
                ).getTime() > now.getTime();

              return (
                <div
                  key={conversation.conversation_id}
                  className="relative flex items-center border-b border-theme last:border-b-0 hover:bg-surface-muted"
                >
                  <Link
                    href={`/messages/${conversation.conversation_id}`}
                    className="group flex min-h-24 min-w-0 flex-1 items-center gap-3 px-4 py-4 sm:px-5"
                  >
                    <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[rgb(var(--primary-soft))] text-xl font-bold text-brand">
                      {conversation.counterpart_avatar_url ? (
                        <Image
                          src={conversation.counterpart_avatar_url}
                          alt=""
                          fill
                          sizes="56px"
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
                            className="h-4 w-4 shrink-0 text-[rgb(var(--success))]"
                            aria-label="موثّق"
                          />
                        )}

                        {pinned && (
                          <Pin
                            size={12}
                            className="shrink-0 text-brand"
                            aria-label="مثبتة"
                          />
                        )}

                        {muted && (
                          <BellOff
                            size={12}
                            className="shrink-0 text-muted"
                            aria-label="مكتومة"
                          />
                        )}
                      </span>

                      {conversation.listing_title && (
                        <span className="mt-0.5 block truncate text-[10px] font-bold text-brand">
                          {conversation.listing_title}
                        </span>
                      )}

                      <span className="mt-1 block truncate text-xs text-muted">
                        {conversation.last_message_preview ||
                          "ابدأ الحكي واحكيله شو محتاج"}
                      </span>
                    </span>

                    <span className="flex shrink-0 flex-col items-end gap-2 text-[9px] text-muted">
                      <time>
                        {relativeDate(
                          conversation.last_message_at,
                        )}
                      </time>

                      {conversation.unread_count > 0 && (
                        <span className="inline-flex min-w-5 justify-center rounded-full bg-[rgb(var(--primary))] px-1.5 py-0.5 font-bold text-white">
                          {conversation.unread_count}
                        </span>
                      )}
                    </span>
                  </Link>

                  <div className="flex items-center gap-1 pe-3">
                    <ConversationActionsButton
                      conversationId={conversation.conversation_id}
                      pinned={pinned}
                      archived={archived}
                      muted={muted}
                    />

                    <DeleteConversationButton
                      conversationId={
                        conversation.conversation_id
                      }
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
