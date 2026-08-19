"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { confirmMarketplaceImageUploadAction, prepareMarketplaceImageUploadAction } from "@/lib/actions/provider-content";
import { createProviderListingAction, deleteProviderListingAction, setProviderListingPublicationAction, updateProviderListingAction } from "@/lib/actions/provider-listings";
import { deliveryTypeLabels, listingStatusLabels, pricingModelLabels, type MarketplaceCategory, type ServiceListing } from "@/lib/marketplace";

const empty = {
  title: "", shortDescription: "", description: "", categoryId: "", deliveryType: "ON_SITE",
  pricingModel: "FIXED", basePrice: "", estimatedDurationMinutes: "60", serviceAreas: "عمّان",
};

export default function ProviderListingsClient({ listings, categories }: { listings: ServiceListing[]; categories: MarketplaceCategory[] }) {
  const router = useRouter();
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  const field = (name: keyof typeof empty, value: string) => setForm((current) => ({ ...current, [name]: value }));
  const reset = () => { setForm(empty); setEditingId(null); setMessage(""); };
  const edit = (listing: ServiceListing) => {
    setEditingId(listing.id);
    setForm({
      title: listing.title,
      shortDescription: listing.short_description,
      description: listing.description,
      categoryId: listing.category_id,
      deliveryType: listing.delivery_type,
      pricingModel: listing.pricing_model,
      basePrice: listing.base_price == null ? "" : String(listing.base_price),
      estimatedDurationMinutes: listing.estimated_duration_minutes == null ? "" : String(listing.estimated_duration_minutes),
      serviceAreas: listing.service_areas.join("، "),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    setPending(true); setMessage("");
    const payload = {
      title: form.title,
      shortDescription: form.shortDescription,
      description: form.description,
      categoryId: form.categoryId,
      deliveryType: form.deliveryType as "ON_SITE" | "REMOTE" | "HYBRID" | "SESSION" | "PROJECT",
      pricingModel: form.pricingModel as "FIXED" | "STARTING_FROM" | "HOURLY" | "PER_SESSION" | "QUOTE_REQUIRED",
      basePrice: form.basePrice ? Number(form.basePrice) : null,
      estimatedDurationMinutes: form.estimatedDurationMinutes ? Number(form.estimatedDurationMinutes) : null,
      serviceAreas: form.serviceAreas.split(/[،,]/).map((item) => item.trim()).filter(Boolean),
    };
    const result = editingId ? await updateProviderListingAction(editingId, payload) : await createProviderListingAction(payload);
    setPending(false);
    if (!result.success) { setMessage(result.error || "تعذر حفظ العرض"); return; }
    reset(); router.refresh();
  };

  const publication = async (listing: ServiceListing, publish: boolean) => {
    setMessage("");
    const result = await setProviderListingPublicationAction(listing.id, publish);
    if (!result.success) setMessage(result.error || "تعذر تغيير الحالة");
    else router.refresh();
  };
  const remove = async (listing: ServiceListing) => {
    if (!window.confirm("حذف هذه المسودة نهائياً؟")) return;
    const result = await deleteProviderListingAction(listing.id);
    if (!result.success) setMessage(result.error || "تعذر الحذف"); else router.refresh();
  };
  const upload = async (listing: ServiceListing, file: File | undefined) => {
    if (!file) return;
    setMessage("");
    const prepared = await prepareMarketplaceImageUploadAction({
      listingId: listing.id, postId: null, fileName: file.name, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp", sizeBytes: file.size,
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
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="text-lg font-black">{editingId ? "تعديل عرض الخدمة" : "إنشاء عرض جديد"}</h2><p className="mt-1 text-xs text-muted">يُحفظ أولاً كمسودة، ثم يمكنك طلب نشره.</p></div>
          {editingId && <button type="button" onClick={reset} className="secondary-button !min-h-9 !px-3">إلغاء التعديل</button>}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold sm:col-span-2">عنوان العرض<input value={form.title} onChange={(event) => field("title", event.target.value)} maxLength={120} className="form-field mt-1.5" /></label>
          <label className="text-xs font-bold sm:col-span-2">وصف مختصر<input value={form.shortDescription} onChange={(event) => field("shortDescription", event.target.value)} maxLength={240} className="form-field mt-1.5" /></label>
          <label className="text-xs font-bold sm:col-span-2">التفاصيل<textarea value={form.description} onChange={(event) => field("description", event.target.value)} maxLength={4000} rows={5} className="form-field mt-1.5" /></label>
          <label className="text-xs font-bold">التصنيف الفرعي<select value={form.categoryId} onChange={(event) => field("categoryId", event.target.value)} className="form-field mt-1.5"><option value="">اختر</option>{categories.map((parent) => <optgroup key={parent.id} label={parent.name_ar}>{(parent.children || []).map((child) => <option key={child.id} value={child.id}>{child.name_ar}</option>)}</optgroup>)}</select></label>
          <label className="text-xs font-bold">طريقة التقديم<select value={form.deliveryType} onChange={(event) => field("deliveryType", event.target.value)} className="form-field mt-1.5">{Object.entries(deliveryTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="text-xs font-bold">نظام التسعير<select value={form.pricingModel} onChange={(event) => field("pricingModel", event.target.value)} className="form-field mt-1.5">{Object.entries(pricingModelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="text-xs font-bold">السعر بالدينار<input value={form.basePrice} onChange={(event) => field("basePrice", event.target.value)} disabled={form.pricingModel === "QUOTE_REQUIRED"} type="number" min="1" step="0.01" className="form-field mt-1.5" /></label>
          <label className="text-xs font-bold">المدة التقديرية بالدقائق<input value={form.estimatedDurationMinutes} onChange={(event) => field("estimatedDurationMinutes", event.target.value)} type="number" min="15" className="form-field mt-1.5" /></label>
          <label className="text-xs font-bold">مناطق الخدمة (افصل بفاصلة)<input value={form.serviceAreas} onChange={(event) => field("serviceAreas", event.target.value)} disabled={form.deliveryType === "REMOTE"} className="form-field mt-1.5" /></label>
        </div>
        {message && <p role="alert" className="mt-4 rounded-xl bg-[rgb(var(--danger)/0.1)] p-3 text-xs text-[rgb(var(--danger))]">{message}</p>}
        <button type="button" onClick={submit} disabled={pending} className="brand-button mt-5 gap-2"><Plus className="h-4 w-4" />{pending ? "جارٍ الحفظ..." : editingId ? "حفظ التعديلات" : "إنشاء المسودة"}</button>
      </section>

      <section>
        <div className="mb-4"><h2 className="text-lg font-black">عروضي</h2><p className="mt-1 text-xs text-muted">{listings.length} عرض</p></div>
        {listings.length ? <div className="grid gap-4 xl:grid-cols-2">{listings.map((listing) => (
          <article key={listing.id} className="surface-card p-5">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="status-pill bg-surface-muted">{listingStatusLabels[listing.status]}</span><h3 className="mt-2 truncate font-black">{listing.title}</h3><p className="mt-1 text-xs text-muted">{listing.service_categories?.name_ar} · {pricingModelLabels[listing.pricing_model]}</p></div><strong className="shrink-0 text-sm text-brand">{listing.base_price ? listing.base_price + " د.أ" : "عرض سعر"}</strong></div>
            {listing.moderation_notes && <p className="mt-3 rounded-xl bg-[rgb(var(--warning)/0.1)] p-3 text-xs">ملاحظة المراجعة: {listing.moderation_notes}</p>}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-theme pt-4">
              {listing.status !== "PUBLISHED" && <button type="button" onClick={() => edit(listing)} className="secondary-button !min-h-9 gap-1 !px-3"><Pencil className="h-3.5 w-3.5" /> تعديل</button>}
              {listing.status === "PUBLISHED" || listing.status === "PENDING_REVIEW" ? <button type="button" onClick={() => publication(listing, false)} className="secondary-button !min-h-9 !px-3">إيقاف</button> : <button type="button" onClick={() => publication(listing, true)} className="brand-button !min-h-9 gap-1 !px-3 !py-1"><Send className="h-3.5 w-3.5" /> نشر</button>}
              <label className="secondary-button !min-h-9 cursor-pointer gap-1 !px-3"><ImagePlus className="h-3.5 w-3.5" /> صورة<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { void upload(listing, event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>
              {["DRAFT", "REJECTED"].includes(listing.status) && <button type="button" onClick={() => remove(listing)} className="secondary-button !min-h-9 gap-1 !px-3 text-[rgb(var(--danger))]"><Trash2 className="h-3.5 w-3.5" /> حذف</button>}
            </div>
          </article>
        ))}</div> : <div className="surface-card p-10 text-center text-sm text-muted">لم تنشئ عروض خدمات بعد.</div>}
      </section>
    </div>
  );
}
