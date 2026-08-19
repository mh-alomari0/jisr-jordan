"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Camera, Flag, ImageIcon, LoaderCircle, MessageCircle, Send, ShieldCheck, Video } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
  getConversationAction, markConversationReadAction, prepareMessageMediaUploadAction,
  reportMessageAction, sendMediaMessageAction, sendTextMessageAction,
  type ConversationMessageItem,
} from "@/lib/actions/messaging";

type Context = Record<string, unknown> & {
  counterpart_name?: string; counterpart_avatar_url?: string | null; counterpart_verified?: boolean;
  listing_title?: string | null; listing_slug?: string | null; booking_id?: string | null; contact_allowed?: boolean;
};

function time(value: string) { return new Date(value).toLocaleTimeString("ar-JO", { hour: "2-digit", minute: "2-digit" }); }

export default function ConversationClient({ conversationId, currentUserId, context, initialMessages, initialHasMore, initialCursor }: {
  conversationId: string; currentUserId: string; context: Context; initialMessages: ConversationMessageItem[];
  initialHasMore: boolean; initialCursor: string | null;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [cursor, setCursor] = useState(initialCursor);
  const [pending, startTransition] = useTransition();

  const syncLatest = useCallback(async () => {
    const result = await getConversationAction(conversationId);
    if (!result.success) return;
    setMessages(result.messages);
    setHasMore(result.hasMore);
    setCursor(result.nextCursor);
    void markConversationReadAction(conversationId);
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }));
  }, [conversationId]);

  useEffect(() => {
    void markConversationReadAction(conversationId);
    bottomRef.current?.scrollIntoView({ block: "end" });
    const channel = supabase.channel(`conversation:${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversation_messages", filter: `conversation_id=eq.${conversationId}` }, () => { void syncLatest(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [conversationId, syncLatest]);

  const send = () => startTransition(async () => {
    setError("");
    const result = await sendTextMessageAction({ conversationId, body });
    if (!result.success) { setError(result.error || "تعذر إرسال الرسالة"); return; }
    setBody(""); await syncLatest();
  });

  const upload = async (file: File) => {
    setError(""); setUploadProgress("جاري تجهيز المرفق…");
    const prepared = await prepareMessageMediaUploadAction({ conversationId, mimeType: file.type as never, sizeBytes: file.size });
    if (!prepared.success) { setUploadProgress(""); setError(prepared.error || "تعذر تجهيز المرفق"); return; }
    setUploadProgress("جاري رفع المرفق بأمان…");
    const { error: uploadError } = await supabase.storage.from(prepared.bucket).uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: file.type });
    if (uploadError) { setUploadProgress(""); setError("تعذر رفع المرفق"); return; }
    setUploadProgress("جاري إرسال المرفق…");
    const sent = await sendMediaMessageAction({ conversationId, path: prepared.path, mimeType: file.type as never, sizeBytes: file.size });
    setUploadProgress("");
    if (!sent.success) { setError(sent.error || "تعذر إرسال المرفق"); return; }
    await syncLatest();
  };

  const loadOlder = () => startTransition(async () => {
    if (!cursor) return;
    const result = await getConversationAction(conversationId, cursor);
    if (!result.success) { setError(result.error || "تعذر تحميل الرسائل السابقة"); return; }
    setMessages((current) => [...result.messages, ...current]); setHasMore(result.hasMore); setCursor(result.nextCursor);
  });

  const report = (id: string) => startTransition(async () => {
    const result = await reportMessageAction(id, "CONTACT_SHARING");
    setError(result.success ? "تم إرسال البلاغ للمراجعة." : result.error || "تعذر إرسال البلاغ");
  });

  return <div className="mx-auto flex h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] max-w-5xl flex-col bg-surface md:my-6 md:h-[calc(100dvh-8rem)] md:overflow-hidden md:rounded-3xl md:border md:border-theme">
    <header className="flex min-h-20 items-center gap-3 border-b border-theme bg-surface px-3 sm:px-5">
      <Link href="/messages" aria-label="العودة إلى الرسائل" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-muted"><ArrowRight className="h-5 w-5" /></Link>
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[rgb(var(--primary-soft))] font-black text-brand">
        {context.counterpart_avatar_url ? <Image src={context.counterpart_avatar_url} alt="" fill sizes="44px" className="object-cover" /> : String(context.counterpart_name || "ج").slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1"><div className="flex items-center gap-1"><h1 className="truncate text-sm font-black">{String(context.counterpart_name || "محادثة جسر")}</h1>{Boolean(context.counterpart_verified) && <ShieldCheck className="h-4 w-4 text-[rgb(var(--success))]" aria-label="موثّق" />}</div>{context.listing_title && <p className="truncate text-[10px] font-bold text-brand">{String(context.listing_title)}</p>}</div>
      {context.booking_id ? <Link href={`/bookings/${context.booking_id}`} className="secondary-button !min-h-9 !px-3 !py-1.5 text-xs"><CalendarDays className="me-1 h-4 w-4" /> الحجز</Link>
        : context.listing_slug ? <Link href={`/listings/${context.listing_slug}`} className="brand-button !min-h-9 !px-3 !py-1.5 text-xs">اطلب الخدمة</Link> : null}
    </header>

    {!context.contact_allowed && <div className="border-b border-[rgb(var(--primary)/0.2)] bg-[rgb(var(--primary-soft)/0.5)] px-4 py-2 text-center text-[11px] leading-5 text-muted">للحفاظ على حقوق الطرفين، خليك داخل جسر ولا تشارك رقم أو بريد أو وسيلة دفع خارجية قبل تأكيد الحجز.</div>}

    <main className="min-h-0 flex-1 overflow-y-auto bg-[rgb(var(--canvas))] px-3 py-4 sm:px-6" aria-live="polite">
      {hasMore && <div className="mb-4 text-center"><button type="button" onClick={loadOlder} disabled={pending} className="secondary-button !min-h-9 text-xs">تحميل الرسائل السابقة</button></div>}
      {messages.length === 0 && <div className="mx-auto max-w-sm py-16 text-center"><MessageCircle className="mx-auto h-10 w-10 text-brand" /><h2 className="mt-4 font-black">ابدأ المحادثة</h2><p className="mt-2 text-xs leading-6 text-muted">احكيله شو محتاج، أو ابعث صورة أو فيديو قصير يوضح المشكلة.</p></div>}
      <div className="space-y-2.5">{messages.map((message) => {
        const own = message.sender_id === currentUserId;
        return <div key={message.id} className={`group flex ${own ? "justify-start" : "justify-end"}`}>
          <article className={`relative max-w-[84%] rounded-2xl px-3.5 py-2.5 shadow-sm ${own ? "rounded-br-md bg-[rgb(var(--primary))] text-white" : "rounded-bl-md border border-theme bg-surface"}`}>
            {message.message_type === "IMAGE" && message.media_url && <button type="button" onClick={() => window.open(message.media_url!, "_blank", "noopener,noreferrer")} className="relative mb-2 block aspect-[4/3] w-56 max-w-full overflow-hidden rounded-xl bg-black/10" aria-label="فتح الصورة"><Image src={message.media_url} alt="مرفق داخل المحادثة" fill sizes="224px" className="object-cover" /></button>}
            {message.message_type === "VIDEO" && message.media_url && <video src={message.media_url} controls preload="metadata" className="mb-2 max-h-72 w-64 max-w-full rounded-xl" aria-label="فيديو داخل المحادثة" />}
            {message.body && <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p>}
            <div className={`mt-1 flex items-center justify-between gap-4 text-[9px] ${own ? "text-white/75" : "text-muted"}`}><time>{time(message.created_at)}</time>{!own && <button type="button" onClick={() => report(message.id)} className="opacity-60 hover:opacity-100" aria-label="الإبلاغ عن الرسالة"><Flag className="h-3 w-3" /></button>}</div>
          </article>
        </div>;
      })}</div><div ref={bottomRef} />
    </main>

    <footer className="border-t border-theme bg-surface px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
      {(error || uploadProgress) && <p role="status" className={`mb-2 rounded-xl px-3 py-2 text-[11px] ${error === "تم إرسال البلاغ للمراجعة." ? "bg-[rgb(var(--success)/0.1)] text-[rgb(var(--success))]" : "bg-[rgb(var(--primary-soft))] text-[rgb(var(--text-main))]"}`}>{uploadProgress || error}</p>}
      <div className="flex items-end gap-2">
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = ""; }} />
        <button type="button" onClick={() => fileInput.current?.click()} disabled={Boolean(uploadProgress)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-theme text-brand hover:bg-surface-muted" aria-label="إرفاق صورة أو فيديو"><Camera className="h-5 w-5" /></button>
        <label className="min-w-0 flex-1"><span className="sr-only">اكتب رسالتك</span><textarea value={body} onChange={(event) => setBody(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (body.trim()) send(); } }} rows={1} maxLength={4000} placeholder="اكتب رسالتك…" className="form-field max-h-32 resize-none !rounded-2xl" /></label>
        <button type="button" onClick={send} disabled={pending || !body.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--primary))] text-white disabled:opacity-40" aria-label="إرسال الرسالة">{pending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}</button>
      </div>
      <div className="mt-1 flex gap-3 px-14 text-[9px] text-muted"><span className="inline-flex items-center gap-1"><ImageIcon className="h-3 w-3" /> JPG/PNG/WebP · 8MB</span><span className="inline-flex items-center gap-1"><Video className="h-3 w-3" /> MP4/WebM · 25MB</span></div>
    </footer>
  </div>;
}
