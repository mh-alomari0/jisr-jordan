"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Send, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { confirmMarketplaceImageUploadAction, createProviderPostAction, deleteProviderPostAction, prepareMarketplaceImageUploadAction, setProviderPostPublicationAction } from "@/lib/actions/provider-content";
import type { PostType, ServiceListing } from "@/lib/marketplace";

interface ProviderPostRow {
  id: string; listing_id: string | null; content: string; post_type: PostType;
  status: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "DEACTIVATED" | "REJECTED";
  moderation_notes: string | null; created_at: string;
  service_listings?: { id: string; slug: string; title: string } | null;
}

const postLabels: Record<PostType, string> = {
  TEXT: "تحديث مهني", IMAGE: "صورة عمل", BEFORE_AFTER: "قبل وبعد",
  PORTFOLIO: "معرض أعمال", TIP: "نصيحة تعليمية", PROMOTION: "ترويج خدمة",
};

export default function ProviderPostsClient({ posts, listings }: { posts: ProviderPostRow[]; listings: ServiceListing[] }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<PostType>("TEXT");
  const [listingId, setListingId] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const create = async () => {
    setPending(true); setMessage("");
    const result = await createProviderPostAction({ content, postType, listingId: listingId || null });
    setPending(false);
    if (!result.success) { setMessage(result.error || "تعذر إنشاء المنشور"); return; }
    setContent(""); setListingId(""); router.refresh();
  };
  const publication = async (post: ProviderPostRow, publish: boolean) => {
    const result = await setProviderPostPublicationAction(post.id, publish);
    if (!result.success) setMessage(result.error || "تعذر تغيير الحالة"); else router.refresh();
  };
  const remove = async (post: ProviderPostRow) => {
    if (!window.confirm("حذف هذه المسودة؟")) return;
    const result = await deleteProviderPostAction(post.id);
    if (!result.success) setMessage(result.error || "تعذر الحذف"); else router.refresh();
  };
  const upload = async (post: ProviderPostRow, file: File | undefined) => {
    if (!file) return;
    setMessage("");
    const prepared = await prepareMarketplaceImageUploadAction({
      listingId: null, postId: post.id, fileName: file.name,
      mimeType: file.type as "image/jpeg" | "image/png" | "image/webp", sizeBytes: file.size,
    });
    if (!prepared.success) { setMessage(prepared.error || "تعذر تجهيز الصورة"); return; }
    const { error } = await supabase.storage.from(prepared.bucket).uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: file.type });
    if (error) { setMessage("تعذر رفع الصورة"); return; }
    const confirmed = await confirmMarketplaceImageUploadAction(prepared.mediaId);
    if (!confirmed.success) setMessage(confirmed.error || "تعذر اعتماد الصورة"); else router.refresh();
  };

  return (
    <div className="space-y-6">
      <section className="surface-card p-5 sm:p-6">
        <h2 className="text-lg font-black">منشور مهني جديد</h2>
        <p className="mt-1 text-xs text-muted">انشر محتوى يساعد العميل على تقييم خبرتك واتخاذ قرار خدمة، وليس محتوى اجتماعياً عاماً.</p>
        <label className="mt-5 block text-xs font-bold">المحتوى<textarea value={content} onChange={(event) => setContent(event.target.value)} minLength={3} maxLength={3000} rows={5} className="form-field mt-1.5" placeholder="شارك نتيجة عمل، نصيحة مفيدة، أو شرحاً لخدمة..." /></label>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold">نوع المنشور<select value={postType} onChange={(event) => setPostType(event.target.value as PostType)} className="form-field mt-1.5">{Object.entries(postLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="text-xs font-bold">عرض مرتبط (اختياري)<select value={listingId} onChange={(event) => setListingId(event.target.value)} className="form-field mt-1.5"><option value="">بدون ارتباط</option>{listings.map((listing) => <option key={listing.id} value={listing.id}>{listing.title}</option>)}</select></label>
        </div>
        {message && <p role="alert" className="mt-4 rounded-xl bg-[rgb(var(--danger)/0.1)] p-3 text-xs text-[rgb(var(--danger))]">{message}</p>}
        <button type="button" onClick={create} disabled={pending} className="brand-button mt-4">{pending ? "جارٍ الحفظ..." : "حفظ كمسودة"}</button>
      </section>
      <section>
        <h2 className="mb-4 text-lg font-black">المحتوى المنشور والمسودات</h2>
        {posts.length ? <div className="grid gap-4 lg:grid-cols-2">{posts.map((post) => (
          <article key={post.id} className="surface-card p-5">
            <div className="flex items-center justify-between gap-2"><span className="status-pill bg-surface-muted">{post.status}</span><span className="text-[10px] text-muted">{postLabels[post.post_type]}</span></div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{post.content}</p>
            {post.service_listings?.title && <p className="mt-2 text-[11px] font-bold text-brand">مرتبط بـ: {post.service_listings.title}</p>}
            {post.moderation_notes && <p className="mt-3 rounded-xl bg-[rgb(var(--warning)/0.1)] p-3 text-xs">{post.moderation_notes}</p>}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-theme pt-4">
              {post.status === "PUBLISHED" || post.status === "PENDING_REVIEW" ? <button type="button" onClick={() => publication(post, false)} className="secondary-button !min-h-9 !px-3">إيقاف</button> : <button type="button" onClick={() => publication(post, true)} className="brand-button !min-h-9 gap-1 !px-3 !py-1"><Send className="h-3.5 w-3.5" /> نشر</button>}
              <label className="secondary-button !min-h-9 cursor-pointer gap-1 !px-3"><ImagePlus className="h-3.5 w-3.5" /> صورة<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { void upload(post, event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>
              {["DRAFT", "REJECTED"].includes(post.status) && <button type="button" onClick={() => remove(post)} className="secondary-button !min-h-9 gap-1 !px-3 text-[rgb(var(--danger))]"><Trash2 className="h-3.5 w-3.5" /> حذف</button>}
            </div>
          </article>
        ))}</div> : <div className="surface-card p-10 text-center text-sm text-muted">لا يوجد محتوى بعد.</div>}
      </section>
    </div>
  );
}

