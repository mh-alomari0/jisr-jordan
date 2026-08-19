import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle, ShieldCheck } from "lucide-react";
import { getConversationInboxAction } from "@/lib/actions/messaging";

export const metadata: Metadata = { title: "الرسائل" };
export const dynamic = "force-dynamic";

function relativeDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "الآن";
  if (diff < 3_600_000) return `منذ ${Math.floor(diff / 60_000)} د`;
  if (diff < 86_400_000) return `منذ ${Math.floor(diff / 3_600_000)} س`;
  return date.toLocaleDateString("ar-JO", { month: "short", day: "numeric" });
}

export default async function MessagesPage() {
  const result = await getConversationInboxAction();
  return <div className="mx-auto min-h-[70vh] max-w-3xl px-4 py-6 sm:py-10">
    <header className="mb-6">
      <p className="text-xs font-black text-brand">تواصل بأمان داخل جسر</p>
      <h1 className="mt-1 text-3xl font-black">الرسائل</h1>
      <p className="mt-2 text-sm leading-7 text-muted">ابعث صور المشكلة أو فيديو قصير، واتفق على التفاصيل قبل الحجز بدون مشاركة معلومات التواصل.</p>
    </header>
    {!result.success ? <div role="alert" className="surface-card p-8 text-center text-sm">{result.error} <Link href="/login" className="ms-1 font-black text-brand">تسجيل الدخول</Link></div>
      : result.conversations.length === 0 ? <section className="surface-card px-6 py-14 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgb(var(--primary-soft))] text-brand"><MessageCircle className="h-7 w-7" /></span>
        <h2 className="mt-5 text-lg font-black">لسا ما بلشت أي محادثة 👋</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted">لما تلاقي مقدم خدمة مناسب، ابعثله واحكيله شو محتاج.</p>
        <Link href="/discover" className="brand-button mt-5">استكشف مقدمي الخدمة</Link>
      </section> : <div className="overflow-hidden rounded-3xl border border-theme bg-surface">
        {result.conversations.map((conversation) => <Link key={conversation.conversation_id} href={`/messages/${conversation.conversation_id}`}
          className="group flex min-h-24 items-center gap-3 border-b border-theme px-4 py-3 last:border-b-0 hover:bg-surface-muted focus-visible:bg-surface-muted">
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[rgb(var(--primary-soft))] text-xl font-black text-brand">
            {conversation.counterpart_avatar_url ? <Image src={conversation.counterpart_avatar_url} alt="" fill sizes="56px" className="object-cover" /> : conversation.counterpart_name.slice(0, 1)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5"><strong className="truncate text-sm">{conversation.counterpart_name}</strong>{conversation.counterpart_verified && <ShieldCheck className="h-4 w-4 shrink-0 text-[rgb(var(--success))]" aria-label="موثّق" />}</span>
            {conversation.listing_title && <span className="mt-0.5 block truncate text-[10px] font-bold text-brand">{conversation.listing_title}</span>}
            <span className="mt-1 block truncate text-xs text-muted">{conversation.last_message_preview || "ابدأ المحادثة واحكيله شو محتاج"}</span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-2 text-[10px] text-muted"><time>{relativeDate(conversation.last_message_at)}</time>{conversation.unread_count > 0 && <span className="inline-flex min-w-5 justify-center rounded-full bg-[rgb(var(--primary))] px-1.5 py-0.5 font-black text-white" aria-label={`${conversation.unread_count} رسائل غير مقروءة`}>{conversation.unread_count}</span>}</span>
        </Link>)}
      </div>}
  </div>;
}
