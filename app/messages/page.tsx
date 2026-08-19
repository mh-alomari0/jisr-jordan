import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getConversationInboxAction } from "@/lib/actions/messaging";
import DeleteConversationButton from "./_components/delete-conversation-button";

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

export default async function MessagesPage() {
  const result = await getConversationInboxAction();

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
            كل محادثاتك
            <span className="text-[#ffc985]"> بمكان واحد.</span>
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#d9f2ee]">
            تواصل مع مقدم الخدمة وشارك التفاصيل والمرفقات
            المرتبطة بالطلب.
          </p>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold text-brand">
              صندوق الوارد
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              محادثاتك
            </h2>
          </div>

          <Link
            href="/discover"
            className="inline-flex items-center gap-1 text-xs font-bold text-brand"
          >
            اكتشف الخدمات
            <ArrowLeft size={14} />
          </Link>
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
              <Sparkles size={25} />
            </span>

            <h2 className="mt-5 text-lg font-bold">
              لسه ما بلشت أي محادثة
            </h2>

            <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-muted">
              لما تلاقي مقدم خدمة مناسب، افتح عرضه واضغط رسالة.
            </p>

            <Link href="/discover" className="brand-button mt-5">
              استكشف مقدمي الخدمة
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[1.8rem] border border-theme bg-surface shadow-soft">
            {result.conversations.map((conversation) => (
              <div
                key={conversation.conversation_id}
                className="flex items-center border-b border-theme last:border-b-0 hover:bg-surface-muted"
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
                    </span>

                    {conversation.listing_title && (
                      <span className="mt-0.5 block truncate text-[10px] font-bold text-brand">
                        {conversation.listing_title}
                      </span>
                    )}

                    <span className="mt-1 block truncate text-xs text-muted">
                      {conversation.last_message_preview ||
                        "ابدأ المحادثة واحكيله شو محتاج"}
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

                <div className="pe-3">
                  <DeleteConversationButton
                    conversationId={
                      conversation.conversation_id
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
