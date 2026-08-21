"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  Check,
  CheckCheck,
  Flag,
  ImageIcon,
  LoaderCircle,
  MessageCircle,
  Paperclip,
  Send,
  ShieldCheck,
  Video,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
  getConversationAction,
  markConversationReadAction,
  prepareMessageMediaUploadAction,
  reportMessageAction,
  sendMediaMessageAction,
  sendTextMessageAction,
  type ConversationMessageItem,
} from "@/lib/actions/messaging";

type Context = Record<string, unknown> & {
  counterpart_name?: string;
  counterpart_avatar_url?: string | null;
  counterpart_verified?: boolean;
  listing_title?: string | null;
  listing_slug?: string | null;
  booking_id?: string | null;
  contact_allowed?: boolean;
};

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("ar-JO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ConversationClient({
  conversationId,
  currentUserId,
  context,
  initialMessages,
  initialHasMore,
  initialCursor,
}: {
  conversationId: string;
  currentUserId: string;
  context: Context;
  initialMessages: ConversationMessageItem[];
  initialHasMore: boolean;
  initialCursor: string | null;
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

    requestAnimationFrame(() =>
      bottomRef.current?.scrollIntoView({
        block: "end",
        behavior: "smooth",
      }),
    );
  }, [conversationId]);

  useEffect(() => {
    void markConversationReadAction(conversationId);
    bottomRef.current?.scrollIntoView({ block: "end" });

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => void syncLatest(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, syncLatest]);

  const send = () =>
    startTransition(async () => {
      if (!body.trim()) return;
      setError("");

      const currentBody = body;
      setBody("");

      const result = await sendTextMessageAction({
        conversationId,
        body: currentBody,
      });

      if (!result.success) {
        setError(result.error || "تعذر إرسال الرسالة");
        setBody(currentBody);
        return;
      }

      await syncLatest();
    });

  const upload = async (file: File) => {
    setError("");
    setUploadProgress("جاري تجهيز المرفق…");

    const prepared = await prepareMessageMediaUploadAction({
      conversationId,
      mimeType: file.type as never,
      sizeBytes: file.size,
    });

    if (!prepared.success) {
      setUploadProgress("");
      setError(prepared.error || "تعذر تجهيز المرفق");
      return;
    }

    setUploadProgress("جاري رفع المرفق بأمان…");

    const { error: uploadError } = await supabase.storage
      .from(prepared.bucket)
      .uploadToSignedUrl(
        prepared.path,
        prepared.token,
        file,
        { contentType: file.type },
      );

    if (uploadError) {
      setUploadProgress("");
      setError("تعذر رفع المرفق");
      return;
    }

    setUploadProgress("جاري إرسال المرفق…");

    const sent = await sendMediaMessageAction({
      conversationId,
      path: prepared.path,
      mimeType: file.type as never,
      sizeBytes: file.size,
    });

    setUploadProgress("");

    if (!sent.success) {
      setError(sent.error || "تعذر إرسال المرفق");
      return;
    }

    await syncLatest();
  };

  const loadOlder = () =>
    startTransition(async () => {
      if (!cursor) return;

      const result = await getConversationAction(conversationId, cursor);

      if (!result.success) {
        setError(result.error || "تعذر تحميل الرسائل السابقة");
        return;
      }

      setMessages((current) => [...result.messages, ...current]);
      setHasMore(result.hasMore);
      setCursor(result.nextCursor);
    });

  const report = (id: string) =>
    startTransition(async () => {
      const result = await reportMessageAction(id, "CONTACT_SHARING");
      setError(
        result.success
          ? "تم إرسال البلاغ للمراجعة."
          : result.error || "تعذر إرسال البلاغ",
      );
    });

  return (
    <div className="mx-auto flex h-[calc(100dvh-4.2rem-env(safe-area-inset-bottom))] max-w-5xl flex-col bg-[rgb(var(--canvas))] md:my-6 md:h-[calc(100dvh-8rem)] md:overflow-hidden md:rounded-[2.4rem] md:border md:border-theme md:shadow-lift">
      {/* Header */}
      <header className="flex min-h-[68px] items-center justify-between border-b border-theme bg-[rgb(var(--surface)/0.92)] px-3.5 backdrop-blur-2xl sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/messages"
            aria-label="العودة إلى الرسائل"
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-muted text-muted transition active:scale-95"
          >
            <ArrowRight className="h-5 w-5" />
          </Link>

          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[rgb(var(--primary-soft))] font-black text-brand shadow-sm">
            {context.counterpart_avatar_url ? (
              <Image
                src={context.counterpart_avatar_url}
                alt=""
                fill
                sizes="44px"
                className="object-cover"
              />
            ) : (
              String(context.counterpart_name || "ج").slice(0, 1)
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-sm font-black">
                {String(context.counterpart_name || "محادثة جسر")}
              </h1>

              {Boolean(context.counterpart_verified) && (
                <ShieldCheck
                  className="h-4 w-4 text-[rgb(var(--success))]"
                  aria-label="موثّق"
                />
              )}
            </div>

            {context.listing_title && (
              <p className="truncate text-[10px] font-bold text-brand">
                {String(context.listing_title)}
              </p>
            )}
          </div>
        </div>

        <div>
          {context.booking_id ? (
            <Link
              href={`/bookings/${context.booking_id}`}
              className="secondary-button !min-h-[38px] !rounded-xl !px-3 text-xs font-bold"
            >
              <CalendarDays className="me-1 h-3.5 w-3.5 text-brand" />
              تفاصيل الحجز
            </Link>
          ) : context.listing_slug ? (
            <Link
              href={`/listings/${context.listing_slug}`}
              className="brand-button !min-h-[38px] !rounded-xl !px-3 text-xs font-bold"
            >
              عرض الخدمة
            </Link>
          ) : null}
        </div>
      </header>

      {/* Security notice */}
      {!context.contact_allowed && (
        <div className="border-b border-[rgb(var(--primary)/0.2)] bg-[rgb(var(--primary-soft)/0.6)] px-4 py-2 text-center text-[10px] font-bold text-brand">
          🔒 الحماية مفعلة: يرجى إتمام الاتفاق داخل منصة جسر لضمان حقوقك ومتابعة الطلب بأمان.
        </div>
      )}

      {/* Messages Scroll Area */}
      <main
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 space-y-3"
        aria-live="polite"
      >
        {hasMore && (
          <div className="text-center">
            <button
              type="button"
              onClick={loadOlder}
              disabled={pending}
              className="secondary-button !min-h-[34px] !rounded-full text-[11px]"
            >
              {pending ? "جارٍ التحميل..." : "تحميل الرسائل السابقة"}
            </button>
          </div>
        )}

        {messages.length === 0 && (
          <div className="mx-auto max-w-xs py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[rgb(var(--primary-soft))] text-brand shadow-sm">
              <MessageCircle size={28} />
            </div>
            <h2 className="mt-4 text-base font-black">ابدأ المحادثة الآن</h2>
            <p className="mt-1 text-xs leading-6 text-muted">
              استفسر عن التفاصيل، حدد الموعد، أو أرسل صورة توضح طلبك.
            </p>
          </div>
        )}

        {messages.map((message) => {
          const own = message.sender_id === currentUserId;

          return (
            <div
              key={message.id}
              className={`flex ${own ? "justify-start" : "justify-end"}`}
            >
              <article
                className={`relative max-w-[85%] sm:max-w-[75%] rounded-[1.4rem] p-3.5 shadow-sm transition-transform active:scale-[0.99] ${
                  own
                    ? "rounded-br-sm bg-gradient-to-l from-[#0b8f87] to-[#07766f] text-white"
                    : "rounded-bl-sm border border-theme bg-surface text-[rgb(var(--text-main))]"
                }`}
              >
                {message.message_type === "IMAGE" && message.media_url && (
                  <button
                    type="button"
                    onClick={() => window.open(message.media_url!, "_blank")}
                    className="relative mb-2 block aspect-[4/3] w-64 max-w-full overflow-hidden rounded-2xl bg-black/10 shadow-inner"
                  >
                    <Image
                      src={message.media_url}
                      alt="مرفق صورة"
                      fill
                      sizes="256px"
                      className="object-cover"
                    />
                  </button>
                )}

                {message.message_type === "VIDEO" && message.media_url && (
                  <video
                    src={message.media_url}
                    controls
                    preload="metadata"
                    className="mb-2 max-h-72 w-64 max-w-full rounded-2xl"
                  />
                )}

                {message.body && (
                  <p className="whitespace-pre-wrap break-words text-xs sm:text-sm leading-6 font-medium">
                    {message.body}
                  </p>
                )}

                <div
                  className={`mt-1.5 flex items-center justify-between gap-3 text-[10px] ${
                    own ? "text-white/75" : "text-muted"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <time>{formatTime(message.created_at)}</time>
                    {own && <CheckCheck className="h-3 w-3" />}
                  </div>

                  {!own && (
                    <button
                      type="button"
                      onClick={() => report(message.id)}
                      className="opacity-50 hover:opacity-100 transition"
                      title="إبلاغ"
                    >
                      <Flag className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </article>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </main>

      {/* Input Bar */}
      <footer className="border-t border-theme bg-[rgb(var(--surface)/0.95)] px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-2xl sm:px-5">
        {(error || uploadProgress) && (
          <p
            role="status"
            className="mb-2 rounded-xl bg-[rgb(var(--primary-soft))] px-3 py-1.5 text-[11px] font-bold text-brand"
          >
            {uploadProgress || error}
          </p>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.currentTarget.value = "";
            }}
          />

          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={Boolean(uploadProgress)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-theme bg-surface text-muted transition hover:text-brand active:scale-95"
            aria-label="إرفاق صورة أو فيديو"
          >
            <Camera className="h-5 w-5" />
          </button>

          <label className="min-w-0 flex-1">
            <span className="sr-only">اكتب رسالتك</span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (body.trim()) send();
                }
              }}
              rows={1}
              maxLength={4000}
              placeholder="اكتب رسالتك…"
              className="form-field max-h-28 resize-none !rounded-2xl py-3"
            />
          </label>

          <button
            type="button"
            onClick={send}
            disabled={pending || !body.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgb(var(--primary))] text-white shadow-md transition active:scale-95 disabled:opacity-40"
            aria-label="إرسال"
          >
            {pending ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5 rotate-180" />
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}