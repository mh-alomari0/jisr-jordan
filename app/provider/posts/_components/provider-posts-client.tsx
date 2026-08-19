"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  ImagePlus,
  Images,
  Lightbulb,
  Megaphone,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
  confirmMarketplaceImageUploadAction,
  createProviderPostAction,
  deleteProviderPostAction,
  prepareMarketplaceImageUploadAction,
  setProviderPostPublicationAction,
} from "@/lib/actions/provider-content";
import type {
  PostType,
  ServiceListing,
} from "@/lib/marketplace";

interface ProviderPostRow {
  id: string;
  listing_id: string | null;
  content: string;
  post_type: PostType;
  status:
    | "DRAFT"
    | "PENDING_REVIEW"
    | "PUBLISHED"
    | "DEACTIVATED"
    | "REJECTED";
  moderation_notes: string | null;
  created_at: string;
  service_listings?: {
    id: string;
    slug: string;
    title: string;
  } | null;
}

const postLabels: Record<PostType, string> = {
  TEXT: "تحديث مهني",
  IMAGE: "صورة عمل",
  BEFORE_AFTER: "قبل وبعد",
  PORTFOLIO: "معرض أعمال",
  TIP: "نصيحة تعليمية",
  PROMOTION: "ترويج خدمة",
};

const visual: Record<
  PostType,
  { icon: typeof FileText; tone: string }
> = {
  TEXT: {
    icon: FileText,
    tone: "bg-surface-muted text-muted",
  },
  IMAGE: {
    icon: Images,
    tone: "bg-[rgb(var(--primary-soft))] text-brand",
  },
  BEFORE_AFTER: {
    icon: Sparkles,
    tone: "bg-[#f8e0d6] text-[#9a5048]",
  },
  PORTFOLIO: {
    icon: Images,
    tone: "bg-[#e9edf9] text-[#5f5b98]",
  },
  TIP: {
    icon: Lightbulb,
    tone: "bg-[#fff0d7] text-[#9a6d22]",
  },
  PROMOTION: {
    icon: Megaphone,
    tone: "bg-[#e5f4ea] text-[#347b55]",
  },
};

export default function ProviderPostsClient({
  posts,
  listings,
}: {
  posts: ProviderPostRow[];
  listings: ServiceListing[];
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [postType, setPostType] =
    useState<PostType>("TEXT");
  const [listingId, setListingId] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const create = async () => {
    setPending(true);
    setMessage("");

    const result = await createProviderPostAction({
      content,
      postType,
      listingId: listingId || null,
    });

    setPending(false);

    if (!result.success) {
      setMessage(result.error || "تعذر إنشاء المنشور");
      return;
    }

    setContent("");
    setListingId("");
    router.refresh();
  };

  const publication = async (
    post: ProviderPostRow,
    publish: boolean,
  ) => {
    const result =
      await setProviderPostPublicationAction(
        post.id,
        publish,
      );

    if (!result.success)
      setMessage(
        result.error || "تعذر تغيير الحالة",
      );
    else router.refresh();
  };

  const remove = async (post: ProviderPostRow) => {
    if (!window.confirm("حذف هذه المسودة؟")) return;

    const result =
      await deleteProviderPostAction(post.id);

    if (!result.success)
      setMessage(result.error || "تعذر الحذف");
    else router.refresh();
  };

  const upload = async (
    post: ProviderPostRow,
    file: File | undefined,
  ) => {
    if (!file) return;

    setMessage("");

    const prepared =
      await prepareMarketplaceImageUploadAction({
        listingId: null,
        postId: post.id,
        fileName: file.name,
        mimeType: file.type as
          | "image/jpeg"
          | "image/png"
          | "image/webp",
        sizeBytes: file.size,
      });

    if (!prepared.success) {
      setMessage(
        prepared.error || "تعذر تجهيز الصورة",
      );
      return;
    }

    const { error } = await supabase.storage
      .from(prepared.bucket)
      .uploadToSignedUrl(
        prepared.path,
        prepared.token,
        file,
        { contentType: file.type },
      );

    if (error) {
      setMessage("تعذر رفع الصورة");
      return;
    }

    const confirmed =
      await confirmMarketplaceImageUploadAction(
        prepared.mediaId,
      );

    if (!confirmed.success)
      setMessage(
        confirmed.error || "تعذر اعتماد الصورة",
      );
    else router.refresh();
  };

  const NewIcon = visual[postType].icon;

  return (
    <div className="grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
      <section className="self-start rounded-[2rem] border border-theme bg-surface p-5 shadow-soft sm:p-6 lg:sticky lg:top-24">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${visual[postType].tone}`}
          >
            <NewIcon size={18} />
          </span>
          <div>
            <p className="text-[10px] font-bold text-brand">
              منشور جديد
            </p>
            <h2 className="text-lg font-bold">
              شارك شغلك
            </h2>
          </div>
        </div>

        <label className="mt-5 block text-xs font-bold">
          نوع المنشور
          <select
            value={postType}
            onChange={(event) =>
              setPostType(
                event.target.value as PostType,
              )
            }
            className="form-field mt-1.5"
          >
            {Object.entries(postLabels).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="mt-4 block text-xs font-bold">
          المحتوى
          <textarea
            value={content}
            onChange={(event) =>
              setContent(event.target.value)
            }
            minLength={3}
            maxLength={3000}
            rows={7}
            className="form-field mt-1.5"
            placeholder="شارك نتيجة عمل، نصيحة مفيدة، أو شرحاً لخدمة..."
          />
        </label>

        <label className="mt-4 block text-xs font-bold">
          خدمة مرتبطة
          <select
            value={listingId}
            onChange={(event) =>
              setListingId(event.target.value)
            }
            className="form-field mt-1.5"
          >
            <option value="">بدون ارتباط</option>
            {listings.map((listing) => (
              <option
                key={listing.id}
                value={listing.id}
              >
                {listing.title}
              </option>
            ))}
          </select>
        </label>

        {message && (
          <p
            role="alert"
            className="mt-4 rounded-2xl bg-[rgb(var(--danger)/0.1)] p-3 text-xs text-[rgb(var(--danger))]"
          >
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={create}
          disabled={pending || content.trim().length < 3}
          className="brand-button mt-5 w-full"
        >
          {pending
            ? "جارٍ الحفظ..."
            : "حفظ كمسودة"}
        </button>

        <p className="mt-3 text-[9px] leading-5 text-muted">
          بعد إنشاء المسودة، ارفع صورة من البطاقة ثم أرسل
          المحتوى للنشر.
        </p>
      </section>

      <section>
        <div className="mb-5">
          <p className="text-[10px] font-bold text-brand">
            محتواك
          </p>
          <h2 className="mt-1 text-2xl font-bold">
            الأعمال والمسودات
          </h2>
          <p className="mt-1 text-[10px] text-muted">
            {posts.length} منشور
          </p>
        </div>

        {posts.length ? (
          <div className="space-y-4">
            {posts.map((post) => {
              const Icon = visual[post.post_type].icon;

              return (
                <article
                  key={post.id}
                  className="rounded-[1.8rem] border border-theme bg-surface p-5 shadow-soft"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-2xl ${visual[post.post_type].tone}`}
                      >
                        <Icon size={17} />
                      </span>

                      <div>
                        <p className="text-[10px] font-bold">
                          {postLabels[post.post_type]}
                        </p>
                        <span className="text-[9px] text-muted">
                          {post.status}
                        </span>
                      </div>
                    </div>

                    <time className="text-[9px] text-muted">
                      {new Date(
                        post.created_at,
                      ).toLocaleDateString("ar-JO")}
                    </time>
                  </div>

                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7">
                    {post.content}
                  </p>

                  {post.service_listings?.title && (
                    <p className="mt-3 rounded-xl bg-surface-muted px-3 py-2 text-[10px] font-bold text-brand">
                      مرتبط بـ:{" "}
                      {post.service_listings.title}
                    </p>
                  )}

                  {post.moderation_notes && (
                    <p className="mt-3 rounded-xl bg-[rgb(var(--warning)/0.1)] p-3 text-xs">
                      {post.moderation_notes}
                    </p>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2 border-t border-theme pt-4">
                    {post.status === "PUBLISHED" ||
                    post.status ===
                      "PENDING_REVIEW" ? (
                      <button
                        type="button"
                        onClick={() =>
                          publication(post, false)
                        }
                        className="secondary-button !min-h-9 !px-3"
                      >
                        إيقاف
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          publication(post, true)
                        }
                        className="brand-button !min-h-9 gap-1 !px-3 !py-1"
                      >
                        <Send size={14} />
                        نشر
                      </button>
                    )}

                    <label className="secondary-button !min-h-9 cursor-pointer gap-1 !px-3">
                      <ImagePlus size={14} />
                      صورة
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(event) => {
                          void upload(
                            post,
                            event.target.files?.[0],
                          );
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>

                    {["DRAFT", "REJECTED"].includes(
                      post.status,
                    ) && (
                      <button
                        type="button"
                        onClick={() => remove(post)}
                        className="secondary-button !min-h-9 gap-1 !px-3 text-[rgb(var(--danger))]"
                      >
                        <Trash2 size={14} />
                        حذف
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[1.8rem] border border-dashed border-[rgb(var(--primary)/0.28)] bg-[rgb(var(--primary)/0.025)] p-10 text-center">
            <Images className="mx-auto h-8 w-8 text-brand" />
            <h3 className="mt-3 font-bold">
              لسه ما نشرت أي شيء
            </h3>
            <p className="mt-2 text-xs text-muted">
              أول منشور مهني رح يظهر هون وفي ملفك العام بعد
              النشر.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
