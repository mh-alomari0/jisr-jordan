"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Image from "next/image";
import Link from "next/link";
import * as tus from "tus-js-client";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCheck,
  Flag,
  LoaderCircle,
  MessageCircle,
  Mic,
  Images,
  MoreHorizontal,
  Pause,
  Play,
  Reply,
  Send,
  ShieldCheck,
  SmilePlus,
  Trash2,
  X,
  Camera,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import ConversationSearch from "./conversation-search";
import {
  deleteMessageForEveryoneAction,
  getConversationAction,
  markConversationReadAction,
  prepareMessageMediaUploadAction,
  reportMessageAction,
  sendMediaMessageAction,
  sendTextMessageAction,
  setConversationTypingAction,
  toggleMessageReactionAction,
  type ConversationMessageItem,
  type MessageReactionSummary,
} from "@/lib/actions/messaging";

type Context = Record<string, unknown> & {
  counterpart_name?: string;
  counterpart_avatar_url?: string | null;
  counterpart_verified?: boolean;
  listing_title?: string | null;
  listing_slug?: string | null;
  booking_id?: string | null;
  contact_allowed?: boolean;
  counterpart_read_at?: string | null;
  counterpart_typing_until?: string | null;
};

type PendingMedia = {
  id: string;
  file: File;
  previewUrl: string;
  kind: "IMAGE" | "VIDEO" | "AUDIO";
};

const IMAGE_LIMIT = 25 * 1024 * 1024;
const AUDIO_LIMIT = 25 * 1024 * 1024;
const VIDEO_LIMIT = 500 * 1024 * 1024;
const RESUMABLE_VIDEO_THRESHOLD = 6 * 1024 * 1024;
const MAX_SELECTED_FILES = 10;

const reactionOptions: {
  key: MessageReactionSummary["reaction"];
  emoji: string;
}[] = [
  { key: "LIKE", emoji: "👍" },
  { key: "LOVE", emoji: "❤️" },
  { key: "LAUGH", emoji: "😂" },
  { key: "WOW", emoji: "😮" },
  { key: "SAD", emoji: "😢" },
];

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("ar-JO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getSupabaseTusEndpoint() {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!projectUrl) {
    throw new Error("Supabase URL is missing");
  }

  const hostname = new URL(projectUrl).hostname;
  const projectRef = hostname.split(".")[0];

  if (!projectRef) {
    throw new Error("Supabase project reference is missing");
  }

  return `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`;
}

function resumableUpload({
  file,
  bucket,
  path,
  token,
  onProgress,
}: {
  file: File;
  bucket: string;
  path: string;
  token: string;
  onProgress: (percent: number) => void;
}) {
  return new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: getSupabaseTusEndpoint(),
      retryDelays: [0, 3000, 5000, 10_000, 20_000],
      headers: {
        "x-signature": token,
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,
      metadata: {
        bucketName: bucket,
        objectName: path,
        contentType: file.type,
        cacheControl: "3600",
      },
      onError(error) {
        reject(error);
      },
      onProgress(bytesUploaded, bytesTotal) {
        const percent =
          bytesTotal > 0
            ? Math.min(
                100,
                Math.round((bytesUploaded / bytesTotal) * 100),
              )
            : 0;

        onProgress(percent);
      },
      onSuccess() {
        onProgress(100);
        resolve();
      },
    });

    void upload
      .findPreviousUploads()
      .then((previousUploads) => {
        if (previousUploads.length > 0) {
          upload.resumeFromPreviousUpload(previousUploads[0]);
        }

        upload.start();
      })
      .catch(reject);
  });
}

function reactionEmoji(
  reaction: MessageReactionSummary["reaction"],
) {
  return (
    reactionOptions.find((item) => item.key === reaction)?.emoji ||
    "👍"
  );
}

export default function ConversationClient({
  conversationId,
  currentUserId,
  context: initialContext,
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
  const typingThrottleRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  const [context, setContext] = useState(initialContext);
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [cursor, setCursor] = useState(initialCursor);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  const [viewer, setViewer] = useState<{
    url: string;
    kind: "IMAGE" | "VIDEO";
  } | null>(null);
  const [replyTo, setReplyTo] =
    useState<ConversationMessageItem | null>(null);
  const [reactionTarget, setReactionTarget] = useState<string | null>(
    null,
  );
  const [menuTarget, setMenuTarget] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [mediaGalleryOpen, setMediaGalleryOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const isUploading = Boolean(uploadProgress);

  const selectedTotal = useMemo(
    () =>
      pendingMedia.reduce(
        (total, item) => total + item.file.size,
        0,
      ),
    [pendingMedia],
  );

  const galleryMedia = useMemo(
    () =>
      messages.filter(
        (message) =>
          !message.is_deleted_for_everyone &&
          Boolean(message.media_url) &&
          ["IMAGE", "VIDEO", "AUDIO"].includes(message.message_type),
      ),
    [messages],
  );

  const counterpartTyping = Boolean(
    context.counterpart_typing_until,
  );

  const syncLatest = useCallback(async () => {
    const result = await getConversationAction(conversationId);

    if (!result.success) return;

    setMessages(result.messages);
    setHasMore(result.hasMore);
    setCursor(result.nextCursor);

    if (result.context) {
      setContext(result.context as Context);
    }

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

    const messageChannel = supabase
      .channel(`conversation-messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => void syncLatest(),
      )
      .subscribe();

    const conversationChannel = supabase
      .channel(`conversation-state:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
          filter: `id=eq.${conversationId}`,
        },
        () => void syncLatest(),
      )
      .subscribe();

    const reactionChannel = supabase
      .channel(`conversation-reactions:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_message_reactions",
        },
        () => void syncLatest(),
      )
      .subscribe();

    const timer = window.setInterval(() => {
      if (
        context.counterpart_typing_until &&
        new Date(context.counterpart_typing_until).getTime() <=
          Date.now()
      ) {
        setContext((current) => ({
          ...current,
          counterpart_typing_until: null,
        }));
      }
    }, 1000);

    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(messageChannel);
      void supabase.removeChannel(conversationChannel);
      void supabase.removeChannel(reactionChannel);
    };
  }, [
    conversationId,
    context.counterpart_typing_until,
    syncLatest,
  ]);

  useEffect(
    () => () => {
      pendingMedia.forEach((item) =>
        URL.revokeObjectURL(item.previewUrl),
      );
    },
    [pendingMedia],
  );

  useEffect(
    () => () => {
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
      }

      if (
        recorderRef.current &&
        recorderRef.current.state !== "inactive"
      ) {
        recorderRef.current.stop();
      }
    },
    [],
  );

  const recordingLabel = `${Math.floor(recordingSeconds / 60)
    .toString()
    .padStart(2, "0")}:${(recordingSeconds % 60)
    .toString()
    .padStart(2, "0")}`;

  const startRecording = async () => {
    setError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("التسجيل الصوتي مش مدعوم على هذا الجهاز.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ];

      const mimeType =
        candidates.find((candidate) =>
          MediaRecorder.isTypeSupported(candidate),
        ) || "";

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );

      recorderChunksRef.current = [];
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recorderChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());

        const finalType =
          recorder.mimeType.split(";")[0] || "audio/webm";

        const blob = new Blob(recorderChunksRef.current, {
          type: finalType,
        });

        if (blob.size > 0) {
          const extension =
            finalType === "audio/ogg"
              ? "ogg"
              : finalType === "audio/mp4"
                ? "m4a"
                : "webm";

          const file = new File(
            [blob],
            `voice-${crypto.randomUUID()}.${extension}`,
            { type: finalType },
          );

          if (file.size > AUDIO_LIMIT) {
            setError("التسجيل الصوتي أكبر من 25 ميجابايت.");
          } else {
            setPendingMedia((current) => [
              ...current,
              {
                id: crypto.randomUUID(),
                file,
                previewUrl: URL.createObjectURL(file),
                kind: "AUDIO",
              },
            ]);
          }
        }

        recorderChunksRef.current = [];
        recorderRef.current = null;
      };

      recorder.start(500);
      setRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((current) => current + 1);
      }, 1000);
    } catch {
      setError("ما قدرنا نوصل للمايك. تأكد إنك معطي جسر إذن استخدامه.");
    }
  };

  const stopRecording = () => {
    if (
      recorderRef.current &&
      recorderRef.current.state !== "inactive"
    ) {
      recorderRef.current.stop();
    }

    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setRecording(false);
  };

  const cancelRecording = () => {
    recorderChunksRef.current = [];

    if (
      recorderRef.current &&
      recorderRef.current.state !== "inactive"
    ) {
      const recorder = recorderRef.current;
      recorder.ondataavailable = null;
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach((track) => track.stop());
        recorderRef.current = null;
      };
      recorder.stop();
    }

    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setRecording(false);
    setRecordingSeconds(0);
  };

  const pingTyping = () => {
    const now = Date.now();

    if (now - typingThrottleRef.current < 2200) return;

    typingThrottleRef.current = now;
    void setConversationTypingAction(conversationId);
  };

  const send = () =>
    startTransition(async () => {
      if (!body.trim()) return;

      setError("");
      const currentBody = body;
      const currentReply = replyTo;
      setBody("");
      setReplyTo(null);

      const result = await sendTextMessageAction({
        conversationId,
        body: currentBody,
        replyToMessageId: currentReply?.id || null,
      });

      if (!result.success) {
        setError(result.error || "تعذر إرسال الرسالة");
        setBody(currentBody);
        setReplyTo(currentReply);
        return;
      }

      await syncLatest();
    });

  const addFiles = (files: FileList | File[]) => {
    const selected = Array.from(files).slice(
      0,
      Math.max(
        0,
        MAX_SELECTED_FILES - pendingMedia.length,
      ),
    );

    const accepted: PendingMedia[] = [];

    for (const file of selected) {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const isAudio = file.type.startsWith("audio/");

      if (!isImage && !isVideo && !isAudio) {
        setError("جسر بدعم الصور والفيديو والتسجيلات الصوتية.");
        continue;
      }

      const allowed =
        (isImage && file.size <= IMAGE_LIMIT) ||
        (isAudio && file.size <= AUDIO_LIMIT) ||
        (isVideo && file.size <= VIDEO_LIMIT);

      if (!allowed) {
        setError(
          isImage
            ? "الصورة أكبر من 25 ميجابايت."
            : isAudio
              ? "التسجيل الصوتي أكبر من 25 ميجابايت."
              : "الفيديو أكبر من 500 ميجابايت.",
        );
        continue;
      }

      accepted.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        kind: isImage ? "IMAGE" : isAudio ? "AUDIO" : "VIDEO",
      });
    }

    setPendingMedia((current) => [...current, ...accepted]);
  };

  const removePending = (id: string) => {
    setPendingMedia((current) => {
      const target = current.find((item) => item.id === id);

      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return current.filter((item) => item.id !== id);
    });
  };

  const uploadOne = async (
    item: PendingMedia,
    index: number,
    total: number,
    replyId: string | null,
  ) => {
    setUploadProgress(`بنرفع ${index + 1} من ${total}…`);

    const prepared =
      await prepareMessageMediaUploadAction({
        conversationId,
        mimeType: item.file.type as never,
        sizeBytes: item.file.size,
      });

    if (!prepared.success) {
      throw new Error(prepared.error || "تعذر تجهيز الملف");
    }

    if (
      item.kind === "VIDEO" &&
      item.file.size >= RESUMABLE_VIDEO_THRESHOLD
    ) {
      await resumableUpload({
        file: item.file,
        bucket: prepared.bucket,
        path: prepared.path,
        token: prepared.token,
        onProgress: (percent) => {
          setUploadProgress(
            `بنرفع ${index + 1} من ${total} • ${percent}%`,
          );
        },
      });
    } else {
      const { error: uploadError } = await supabase.storage
        .from(prepared.bucket)
        .uploadToSignedUrl(
          prepared.path,
          prepared.token,
          item.file,
          {
            contentType: item.file.type,
            cacheControl: "3600",
          },
        );

      if (uploadError) {
        throw new Error("تعذر رفع الملف");
      }
    }

    const sent = await sendMediaMessageAction({
      conversationId,
      path: prepared.path,
      mimeType: item.file.type as never,
      sizeBytes: item.file.size,
      replyToMessageId: replyId,
    });

    if (!sent.success) {
      throw new Error(sent.error || "تعذر إرسال الملف");
    }
  };

  const sendSelectedMedia = async () => {
    if (!pendingMedia.length || isUploading) return;

    setError("");

    const snapshot = [...pendingMedia];
    const replyId = replyTo?.id || null;

    try {
      for (let index = 0; index < snapshot.length; index += 1) {
        await uploadOne(
          snapshot[index],
          index,
          snapshot.length,
          replyId,
        );
      }

      snapshot.forEach((item) =>
        URL.revokeObjectURL(item.previewUrl),
      );
      setPendingMedia([]);
      setReplyTo(null);
      setUploadProgress("");
      await syncLatest();
    } catch (uploadError) {
      setUploadProgress("");
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "تعذر إرسال الملفات",
      );
    }
  };

  const loadOlder = () =>
    startTransition(async () => {
      if (!cursor) return;

      const result = await getConversationAction(
        conversationId,
        cursor,
      );

      if (!result.success) {
        setError(
          result.error || "تعذر تحميل الرسائل السابقة",
        );
        return;
      }

      setMessages((current) => [
        ...result.messages,
        ...current,
      ]);
      setHasMore(result.hasMore);
      setCursor(result.nextCursor);
    });

  const report = (id: string) =>
    startTransition(async () => {
      const result = await reportMessageAction(
        id,
        "CONTACT_SHARING",
      );

      setError(
        result.success
          ? "وصل البلاغ، وبنراجعه."
          : result.error || "تعذر إرسال البلاغ",
      );
    });

  const react = (messageId: string, reaction: MessageReactionSummary["reaction"]) =>
    startTransition(async () => {
      setReactionTarget(null);

      const result = await toggleMessageReactionAction({
        messageId,
        reaction,
      });

      if (!result.success) {
        setError(result.error || "ما قدرنا نحفظ التفاعل");
        return;
      }

      await syncLatest();
    });

  const removeForEveryone = (messageId: string) =>
    startTransition(async () => {
      const confirmed = window.confirm(
        "بدك تحذف هاي الرسالة عند الطرفين؟",
      );

      if (!confirmed) return;

      setMenuTarget(null);

      const result =
        await deleteMessageForEveryoneAction(messageId);

      if (!result.success) {
        setError(result.error || "ما قدرنا نحذف الرسالة");
        return;
      }

      await syncLatest();
    });

  const lastOwnMessageId = [...messages]
    .reverse()
    .find(
      (message) =>
        message.sender_id === currentUserId &&
        !message.is_deleted_for_everyone,
    )?.id;

  return (
    <>
      <div className="mx-auto flex h-[calc(100dvh-4.2rem-env(safe-area-inset-bottom))] max-w-5xl flex-col bg-[rgb(var(--canvas))] md:my-6 md:h-[calc(100dvh-8rem)] md:overflow-hidden md:rounded-[2.4rem] md:border md:border-theme md:shadow-lift">
        <header className="flex min-h-[68px] items-center justify-between border-b border-theme bg-[rgb(var(--surface)/0.92)] px-3.5 backdrop-blur-2xl sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/messages"
              aria-label="العودة إلى الرسائل"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface-muted text-muted transition active:scale-95"
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
                String(
                  context.counterpart_name || "ج",
                ).slice(0, 1)
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-sm font-black">
                  {String(
                    context.counterpart_name || "محادثة جسر",
                  )}
                </h1>

                {Boolean(context.counterpart_verified) && (
                  <ShieldCheck
                    className="h-4 w-4 text-[rgb(var(--success))]"
                    aria-label="موثّق"
                  />
                )}
              </div>

              <p
                className={`truncate text-[10px] font-bold ${
                  counterpartTyping
                    ? "text-brand"
                    : "text-muted"
                }`}
              >
                {counterpartTyping
                  ? "يكتب الآن…"
                  : context.listing_title
                    ? String(context.listing_title)
                    : "متصل بجسر"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ConversationSearch conversationId={conversationId} />

            <button
              type="button"
              onClick={() => setMediaGalleryOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-theme bg-surface text-muted transition hover:text-brand active:scale-95"
              aria-label="وسائط المحادثة"
              title="وسائط المحادثة"
            >
              <Images size={17} />
            </button>

            {context.booking_id ? (
              <Link
                href={`/bookings/${context.booking_id}`}
                className="secondary-button !min-h-[38px] !rounded-xl !px-3 text-xs font-bold"
              >
                <CalendarDays className="me-1 h-3.5 w-3.5 text-brand" />
                <span className="hidden sm:inline">
                  تفاصيل الحجز
                </span>
              </Link>
            ) : context.listing_slug ? (
              <Link
                href={`/listings/${context.listing_slug}`}
                className="brand-button !min-h-[38px] !rounded-xl !px-3 text-xs font-bold"
              >
                <span className="hidden sm:inline">
                  عرض الخدمة
                </span>
              </Link>
            ) : null}
          </div>
        </header>

        {!context.contact_allowed && (
          <div className="border-b border-[rgb(var(--primary)/0.2)] bg-[rgb(var(--primary-soft)/0.6)] px-4 py-2 text-center text-[10px] font-bold text-brand">
            🔒 خلّي الاتفاق والطلب داخل جسر عشان تضل حقوقك محفوظة.
          </div>
        )}

        <main
          className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-6"
          aria-live="polite"
          onClick={() => {
            setReactionTarget(null);
            setMenuTarget(null);
          }}
        >
          {hasMore && (
            <div className="text-center">
              <button
                type="button"
                onClick={loadOlder}
                disabled={pending}
                className="secondary-button !min-h-[34px] !rounded-full text-[11px]"
              >
                {pending ? "بنحمّل..." : "هات الرسائل الأقدم"}
              </button>
            </div>
          )}

          {messages.length === 0 && (
            <div className="mx-auto max-w-xs py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[rgb(var(--primary-soft))] text-brand shadow-sm">
                <MessageCircle size={28} />
              </div>
              <h2 className="mt-4 text-base font-black">
                احكيله 👋
              </h2>
              <p className="mt-1 text-xs leading-6 text-muted">
                اسأل، ابعث صورة، أو ورّيه المشكلة بفيديو.
              </p>
            </div>
          )}

          {messages.map((message) => {
            const own = message.sender_id === currentUserId;
            const isDeleted = message.is_deleted_for_everyone;
            const isLastOwn = message.id === lastOwnMessageId;
            const seen =
              own &&
              Boolean(context.counterpart_read_at) &&
              new Date(message.created_at).getTime() <=
                new Date(
                  context.counterpart_read_at as string,
                ).getTime();

            return (
              <div
                key={message.id}
                onTouchStart={(event) => {
                  touchStartXRef.current =
                    event.touches[0]?.clientX ?? null;
                }}
                onTouchEnd={(event) => {
                  const start = touchStartXRef.current;
                  const end =
                    event.changedTouches[0]?.clientX ?? null;

                  touchStartXRef.current = null;

                  if (
                    start !== null &&
                    end !== null &&
                    Math.abs(end - start) > 70 &&
                    !message.is_deleted_for_everyone
                  ) {
                    setReplyTo(message);
                  }
                }}
                className={`group flex ${
                  own ? "justify-start" : "justify-end"
                }`}
              >
                <div className="relative max-w-[90%] sm:max-w-[74%]">
                  {!isDeleted && (
                    <div
                      className={`mb-1 flex items-center gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100 ${
                        own ? "justify-start" : "justify-end"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setReplyTo(message);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-muted shadow-sm"
                        title="رد"
                      >
                        <Reply size={13} />
                      </button>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setReactionTarget(
                              reactionTarget === message.id
                                ? null
                                : message.id,
                            );
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-muted shadow-sm"
                          title="تفاعل"
                        >
                          <SmilePlus size={13} />
                        </button>

                        {reactionTarget === message.id && (
                          <div
                            className="absolute bottom-9 z-30 flex gap-1 rounded-full border border-theme bg-surface p-1.5 shadow-xl"
                            onClick={(event) =>
                              event.stopPropagation()
                            }
                          >
                            {reactionOptions.map((item) => (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() =>
                                  react(message.id, item.key)
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-full text-lg transition hover:scale-125"
                              >
                                {item.emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {own && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setMenuTarget(
                                menuTarget === message.id
                                  ? null
                                  : message.id,
                              );
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-muted shadow-sm"
                            title="خيارات"
                          >
                            <MoreHorizontal size={13} />
                          </button>

                          {menuTarget === message.id && (
                            <div
                              className="absolute bottom-9 z-30 min-w-40 rounded-2xl border border-theme bg-surface p-1.5 shadow-xl"
                              onClick={(event) =>
                                event.stopPropagation()
                              }
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  removeForEveryone(message.id)
                                }
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-[rgb(var(--danger))] hover:bg-[rgb(var(--danger)/0.08)]"
                              >
                                <Trash2 size={14} />
                                حذف عند الطرفين
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <article
                    className={`relative rounded-[1.35rem] shadow-sm ${
                      own
                        ? "rounded-br-sm bg-gradient-to-l from-[#0b8f87] to-[#07766f] text-white"
                        : "rounded-bl-sm border border-theme bg-surface text-[rgb(var(--text-main))]"
                    } ${
                      message.media_url && !isDeleted
                        ? "overflow-hidden p-1.5"
                        : "p-3.5"
                    }`}
                  >
                    {message.reply_to_message_id &&
                      !isDeleted && (
                        <div
                          className={`mb-2 rounded-xl border-s-4 px-3 py-2 text-[10px] ${
                            own
                              ? "border-white/70 bg-white/10 text-white/85"
                              : "border-[rgb(var(--primary))] bg-surface-muted text-muted"
                          }`}
                        >
                          <p className="mb-0.5 font-black">
                            رد على رسالة
                          </p>
                          <p className="line-clamp-2">
                            {message.reply_preview ||
                              (message.reply_message_type === "IMAGE"
                                ? "صورة"
                                : message.reply_message_type === "VIDEO"
                                  ? "فيديو"
                                  : message.reply_message_type === "AUDIO"
                                    ? "تسجيل صوتي"
                                    : "رسالة")}
                          </p>
                        </div>
                      )}

                    {isDeleted ? (
                      <p
                        className={`flex items-center gap-2 text-xs italic ${
                          own ? "text-white/70" : "text-muted"
                        }`}
                      >
                        <Trash2 size={13} />
                        تم حذف هذه الرسالة
                      </p>
                    ) : (
                      <>
                        {message.message_type === "IMAGE" &&
                          message.media_url && (
                            <button
                              type="button"
                              onClick={() =>
                                setViewer({
                                  url: message.media_url!,
                                  kind: "IMAGE",
                                })
                              }
                              className="relative block max-h-[62dvh] w-[min(72vw,390px)] overflow-hidden rounded-[1rem] bg-black/10"
                            >
                              <img
                                src={message.media_url}
                                alt="صورة داخل المحادثة"
                                loading="lazy"
                                className="block max-h-[62dvh] w-full object-contain"
                              />
                            </button>
                          )}

                        {message.message_type === "VIDEO" &&
                          message.media_url && (
                            <div className="relative w-[min(72vw,390px)] overflow-hidden rounded-[1rem] bg-black">
                              <video
                                src={message.media_url}
                                controls
                                playsInline
                                preload="metadata"
                                className="max-h-[62dvh] w-full"
                              />
                            </div>
                          )}

                        {message.message_type === "AUDIO" &&
                          message.media_url && (
                            <div className="min-w-[240px] max-w-[72vw] px-2 py-2">
                              <audio
                                src={message.media_url}
                                controls
                                preload="metadata"
                                className="w-full"
                              />
                            </div>
                          )}

                        {message.body && (
                          <p
                            className={`whitespace-pre-wrap break-words text-xs font-medium leading-6 sm:text-sm ${
                              message.media_url
                                ? "px-2 pb-1 pt-2"
                                : ""
                            }`}
                          >
                            {message.body}
                          </p>
                        )}
                      </>
                    )}

                    <div
                      className={`flex items-center justify-between gap-3 px-1 pb-0.5 pt-1.5 text-[10px] ${
                        own ? "text-white/75" : "text-muted"
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <time>{formatTime(message.created_at)}</time>

                        {own &&
                          (seen ? (
                            <span className="flex items-center gap-1 font-bold">
                              <CheckCheck className="h-3.5 w-3.5" />
                              {isLastOwn && "تمت المشاهدة"}
                            </span>
                          ) : (
                            <Check className="h-3 w-3" />
                          ))}
                      </div>

                      {!own && !isDeleted && (
                        <button
                          type="button"
                          onClick={() => report(message.id)}
                          className="opacity-40 transition hover:opacity-100"
                          title="إبلاغ"
                        >
                          <Flag className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </article>

                  {message.reactions?.length > 0 && !isDeleted && (
                    <div
                      className={`-mt-2 flex flex-wrap gap-1 px-2 ${
                        own ? "justify-start" : "justify-end"
                      }`}
                    >
                      {message.reactions.map((reaction) => (
                        <button
                          key={reaction.reaction}
                          type="button"
                          onClick={() =>
                            react(message.id, reaction.reaction)
                          }
                          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] shadow-sm ${
                            reaction.reacted_by_me
                              ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary-soft))] text-brand"
                              : "border-theme bg-surface text-muted"
                          }`}
                        >
                          <span>
                            {reactionEmoji(reaction.reaction)}
                          </span>
                          <span>{reaction.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div ref={bottomRef} />
        </main>

        <footer className="border-t border-theme bg-[rgb(var(--surface)/0.97)] px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-2xl sm:px-5">
          {(error || uploadProgress) && (
            <p
              role="status"
              className="mb-2 rounded-xl bg-[rgb(var(--primary-soft))] px-3 py-2 text-[11px] font-bold text-brand"
            >
              {uploadProgress || error}
            </p>
          )}

          {replyTo && (
            <div className="mb-2 flex items-center justify-between gap-3 rounded-2xl border border-theme bg-surface-muted px-3 py-2">
              <div className="min-w-0 border-s-4 border-brand ps-3">
                <p className="text-[10px] font-black text-brand">
                  عم ترد على
                </p>
                <p className="truncate text-[11px] text-muted">
                  {replyTo.body ||
                    (replyTo.message_type === "IMAGE"
                      ? "صورة"
                      : replyTo.message_type === "VIDEO"
                        ? "فيديو"
                        : replyTo.message_type === "AUDIO"
                          ? "تسجيل صوتي"
                          : "رسالة")}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-muted"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {pendingMedia.length > 0 && (
            <div className="mb-2 rounded-2xl border border-theme bg-surface-muted p-2">
              <div className="mb-2 flex items-center justify-between gap-3 px-1">
                <p className="text-[10px] font-bold text-muted">
                  {pendingMedia.length} ملف •{" "}
                  {formatBytes(selectedTotal)}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    pendingMedia.forEach((item) =>
                      URL.revokeObjectURL(item.previewUrl),
                    );
                    setPendingMedia([]);
                  }}
                  className="text-[10px] font-bold text-[rgb(var(--danger))]"
                >
                  امسح الكل
                </button>
              </div>

              <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
                {pendingMedia.map((item) => (
                  <div
                    key={item.id}
                    className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-black/10"
                  >
                    {item.kind === "IMAGE" ? (
                      <img
                        src={item.previewUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : item.kind === "AUDIO" ? (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-[rgb(var(--primary-soft))] text-brand">
                        <Mic size={24} />
                        <span className="mt-1 text-[9px] font-black">
                          تسجيل صوتي
                        </span>
                      </div>
                    ) : (
                      <>
                        <video
                          src={item.previewUrl}
                          muted
                          preload="metadata"
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white">
                            <Play
                              size={15}
                              fill="currentColor"
                            />
                          </span>
                        </span>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => removePending(item.id)}
                      className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white"
                      aria-label="إزالة"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => void sendSelectedMedia()}
                disabled={isUploading}
                className="brand-button mt-2 w-full !rounded-xl"
              >
                {isUploading
                  ? uploadProgress
                  : `ابعث ${
                      pendingMedia.length === 1
                        ? "الملف"
                        : "الملفات"
                    }`}
              </button>
            </div>
          )}

          {recording && (
            <div className="mb-2 flex items-center gap-3 rounded-2xl border border-[rgb(var(--danger)/0.18)] bg-[rgb(var(--danger)/0.06)] px-3 py-2">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[rgb(var(--danger))]" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black">
                  عم نسجل… {recordingLabel}
                </p>
                <p className="text-[10px] text-muted">
                  احكي براحتك، ولما تخلص اضغط إيقاف.
                </p>
              </div>
              <button
                type="button"
                onClick={cancelRecording}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-muted"
                aria-label="إلغاء التسجيل"
              >
                <X size={15} />
              </button>
              <button
                type="button"
                onClick={stopRecording}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgb(var(--danger))] text-white"
                aria-label="إيقاف التسجيل"
              >
                <Pause size={15} fill="currentColor" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2">
            <input
              ref={fileInput}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,audio/webm,audio/ogg,audio/mp4"
              className="sr-only"
              onChange={(event) => {
                if (event.target.files?.length) {
                  addFiles(event.target.files);
                }
                event.currentTarget.value = "";
              }}
            />

            <button
              type="button"
              onClick={() =>
                recording
                  ? stopRecording()
                  : void startRecording()
              }
              disabled={isUploading}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition active:scale-95 ${
                recording
                  ? "border-[rgb(var(--danger))] bg-[rgb(var(--danger))] text-white"
                  : "border-theme bg-surface text-muted hover:text-brand"
              }`}
              aria-label={
                recording
                  ? "إيقاف التسجيل"
                  : "تسجيل صوتي"
              }
            >
              {recording ? (
                <Pause className="h-5 w-5" fill="currentColor" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={isUploading || recording}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-theme bg-surface text-muted transition hover:text-brand active:scale-95"
              aria-label="صورة أو فيديو"
            >
              <Camera className="h-5 w-5" />
            </button>

            <label className="min-w-0 flex-1">
              <span className="sr-only">اكتب رسالتك</span>
              <textarea
                value={body}
                disabled={recording}
                onChange={(event) => {
                  setBody(event.target.value);
                  if (event.target.value.trim()) {
                    pingTyping();
                  }
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey
                  ) {
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
              disabled={pending || recording || !body.trim()}
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

      {mediaGalleryOpen && (
        <div
          className="fixed inset-0 z-[95] bg-black/55 p-3 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="وسائط المحادثة"
        >
          <div className="mx-auto flex h-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-theme px-4 py-3 sm:px-6">
              <div>
                <h2 className="text-base font-black">
                  وسائط المحادثة
                </h2>
                <p className="text-[10px] text-muted">
                  الصور والفيديوهات والتسجيلات الصوتية
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMediaGalleryOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-muted"
                aria-label="إغلاق"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
              {galleryMedia.length === 0 ? (
                <div className="flex min-h-72 flex-col items-center justify-center text-center">
                  <Images size={34} className="text-muted" />
                  <h3 className="mt-3 text-sm font-black">
                    لسا ما في وسائط هون
                  </h3>
                  <p className="mt-1 text-xs text-muted">
                    أول صورة أو فيديو أو تسجيل صوتي رح يبين هون.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {galleryMedia.map((message) => (
                    <button
                      key={message.id}
                      type="button"
                      onClick={() => {
                        if (!message.media_url) return;

                        if (message.message_type === "IMAGE") {
                          setViewer({
                            url: message.media_url,
                            kind: "IMAGE",
                          });
                        } else if (message.message_type === "VIDEO") {
                          setViewer({
                            url: message.media_url,
                            kind: "VIDEO",
                          });
                        }
                      }}
                      className="overflow-hidden rounded-2xl border border-theme bg-surface-muted text-start"
                    >
                      {message.message_type === "IMAGE" &&
                        message.media_url && (
                          <img
                            src={message.media_url}
                            alt=""
                            className="aspect-square w-full object-cover"
                          />
                        )}

                      {message.message_type === "VIDEO" &&
                        message.media_url && (
                          <div className="relative aspect-square bg-black">
                            <video
                              src={message.media_url}
                              muted
                              preload="metadata"
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute inset-0 flex items-center justify-center">
                              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white">
                                <Play
                                  size={16}
                                  fill="currentColor"
                                />
                              </span>
                            </span>
                          </div>
                        )}

                      {message.message_type === "AUDIO" &&
                        message.media_url && (
                          <div className="flex aspect-square flex-col items-center justify-center p-3 text-brand">
                            <Mic size={30} />
                            <audio
                              src={message.media_url}
                              controls
                              preload="metadata"
                              className="mt-3 w-full"
                              onClick={(event) =>
                                event.stopPropagation()
                              }
                            />
                          </div>
                        )}

                      <div className="px-3 py-2 text-[10px] text-muted">
                        {formatTime(message.created_at)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {viewer && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3"
          role="dialog"
          aria-modal="true"
          aria-label="عرض الوسائط"
        >
          <button
            type="button"
            onClick={() => setViewer(null)}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur"
            aria-label="إغلاق"
          >
            <X size={22} />
          </button>

          {viewer.kind === "IMAGE" ? (
            <img
              src={viewer.url}
              alt=""
              className="max-h-[92dvh] max-w-[96vw] object-contain"
            />
          ) : (
            <video
              src={viewer.url}
              controls
              autoPlay
              playsInline
              className="max-h-[92dvh] max-w-[96vw]"
            />
          )}
        </div>
      )}
    </>
  );
}
