"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, Pencil, Plus, Send, Trash2, Wrench } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { confirmMarketplaceImageUploadAction, prepareMarketplaceImageUploadAction } from "@/lib/actions/provider-content";
import { createProviderListingAction, deleteProviderListingAction, setProviderListingPublicationAction, updateProviderListingAction } from "@/lib/actions/provider-listings";
import { deliveryTypeLabels, listingStatusLabels, pricingModelLabels, type MarketplaceCategory, type ServiceListing, type ServiceTypeDefinition } from "@/lib/marketplace";

const empty = {
  serviceTypeId: "", title: "", shortDescription: "", description: "", categoryId: "",
  deliveryType: "ON_SITE", pricingModel: "FIXED", basePrice: "",
  estimatedDurationMinutes: "60", serviceAreas: "عمّان",
};

export default function ProviderListingsClient({
  listings, categories, serviceTypes,
}: {
  listings: ServiceListing[];
  categories: MarketplaceCategory[];
  serviceTypes: ServiceTypeDefinition[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(empty);
  const [parentId, setParentId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  const parents = useMemo(() => {
    const map = new Map<string, string>();
    for (const service of serviceTypes) {
      if (service.parent_category_id) map.set(service.parent_category_id, service.parent_category_name || "مجال");
    }
    return [...map.entries()];
  }, [serviceTypes]);

  const visibleServices = parentId
    ? serviceTypes.filter((s) => s.parent_category_id === parentId)
    : serviceTypes;

  const field = (name: keyof typeof empty, value: string) =>
    setForm((current) => ({ ...current, [name]: value }));

  const chooseService = (id: string) => {
    const service = serviceTypes.find((item) => item.id === id);
    setForm((current) => ({
      ...current,
      serviceTypeId: id,
      categoryId: service?.category_id || "",
      title: current.title || service?.title || "",
    }));
  };

  const reset = () => {
    setForm(empty);
    setParentId("");
    setEditingId(null);
    setMessage("");
  };

  const edit = (listing: ServiceListing) => {
    const service = serviceTypes.find((item) => item.id === listing.legacy_service_id);
    setParentId(service?.parent_category_id || "");
    setEditingId(listing.id);
    setForm({
      serviceTypeId: listing.legacy_service_id || "",
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
    setPending(true);
    setMessage("");
    const payload = {
      serviceTypeId: form.serviceTypeId,
      title: form.title,
      shortDescription: form.shortDescription,
      description: form.description,
      categoryId: form.categoryId,
      deliveryType: form.deliveryType as "ON_SITE" | "REMOTE" | "HYBRID" | "SESSION" | "PROJECT",
      pricingModel: form.pricingModel as "FIXED" | "STARTING_FROM" | "HOURLY" | "PER_SESSION" | "QUOTE_REQUIRED",
      basePrice: form.basePrice ? Number(form.basePrice) : null,
      estimatedDurationMinutes: form.estimatedDurationMinutes ? Number(form.estimatedDurationMinutes) : null,
      serviceAreas: form.deliveryType === "REMOTE" ? [] : form.serviceAreas.split(/[،,]/).map((x) => x.trim()).filter(Boolean),
    };

    const result = editingId
      ? await updateProviderListingAction(editingId, payload)
      : await createProviderListingAction(payload);

    setPending(false);
    if (!result.success) return setMessage(result.error || "تعذر حفظ العرض");
    reset();
    router.refresh();
  };

  const publication = async (listing: ServiceListing, publish: boolean) => {
    const result = await setProviderListingPublicationAction(listing.id, publish);
    if (!result.success) return setMessage(result.error || "تعذر تغيير الحالة");
    router.refresh();
  };

  const remove = async (listing: ServiceListing) => {
    if (!confirm("حذف هذه المسودة نهائياً؟")) return;
    const result = await deleteProviderListingAction(listing.id);
    if (!result.success) return setMessage(result.error || "تعذر الحذف");
    router.refresh();
  };

  const upload = async (listing: ServiceListing, file?: File) => {
    if (!file) return;
    const prepared = await prepareMarketplaceImageUploadAction({
      listingId: listing.id, postId: null, fileName: file.name,
      mimeType: file.type as "image/jpeg" | "image/png" | "image/webp", sizeBytes: file.size,
    });
    if (!prepared.success) return setMessage(prepared.error || "تعذر تجهيز الصورة");

    const { error } = await supabase.storage.from(prepared.bucket)
      .uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: file.type });
    if (error) return setMessage("تعذر رفع الصورة");

    const confirmed = await confirmMarketplaceImageUploadAction(prepared.mediaId);
    if (!confirmed.success) return setMessage(confirmed.error || "تعذر اعتماد الصورة");
    router.refresh();
  };

  return (
    <div className="space-y-9">
      <section className="overflow-hidden rounded-[2rem] border border-theme bg-surface shadow-soft">
        <div className="grid lg:grid-cols-[.72fr_1.28fr]">
          <aside className="relative overflow-hidden bg-[#0b817a] p-6 text-white sm:p-8">
            <div className="absolute -left-14 -top-16 h-48 w-48 rounded-full border-[18px] border-white/10" />
            <div className="relative">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10"><Wrench size={22} /></span>
              <p className="mt-8 text-[10px] font-bold text-[#c8eee7]">خدماتك على جسر</p>
              <h2 className="mt-2 text-3xl font-bold leading-tight tracking-[-.05em]">اختَر الخدمة،<br /><span className="text-[#ffc985]">واعرض شغلك بطريقتك.</span></h2>
              <p className="mt-4 text-xs leading-7 text-[#dbf4ef]">الخدمة الأساسية ثابتة من دليل جسر. أنت تحدد السعر والوصف وطريقة العمل والمناطق والصور.</p>
            </div>
          </aside>

          <div className="p-5 sm:p-7">
            <div className="flex items-center justify-between">
              <div><p className="text-[10px] font-bold text-brand">1 · اختَر الخدمة</p><h2 className="mt-1 text-xl font-bold">{editingId ? "عدّل عرضك" : "أنشئ عرض جديد"}</h2></div>
              {editingId && <button onClick={reset} className="secondary-button !min-h-9 !px-3">إلغاء</button>}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => setParentId("")} className={`rounded-full px-3 py-2 text-[10px] font-bold ${!parentId ? "bg-[rgb(var(--primary))] text-white" : "bg-surface-muted"}`}>كل المجالات</button>
              {parents.map(([id, label]) => (
                <button key={id} type="button" onClick={() => { setParentId(id); setForm((f) => ({ ...f, serviceTypeId: "", categoryId: "" })); }}
                  className={`rounded-full px-3 py-2 text-[10px] font-bold ${parentId === id ? "bg-[rgb(var(--primary))] text-white" : "bg-surface-muted"}`}>
                  {label}
                </button>
              ))}
            </div>

            <label className="mt-5 block text-xs font-bold">نوع الخدمة
              <select value={form.serviceTypeId} onChange={(e) => chooseService(e.target.value)} className="form-field mt-1.5">
                <option value="">اختر الخدمة التي تقدمها</option>
                {visibleServices.map((service) => <option key={service.id} value={service.id}>{service.parent_category_name} — {service.title}</option>)}
              </select>
            </label>

            <div className="mt-7 border-t border-theme pt-6">
              <p className="text-[10px] font-bold text-brand">2 · تفاصيل عرضك</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold sm:col-span-2">عنوان العرض<input value={form.title} onChange={(e) => field("title", e.target.value)} maxLength={120} className="form-field mt-1.5" placeholder="مثال: كشف وإصلاح تسريبات المياه في عمّان" /></label>
                <label className="text-xs font-bold sm:col-span-2">وصف مختصر<input value={form.shortDescription} onChange={(e) => field("shortDescription", e.target.value)} maxLength={240} className="form-field mt-1.5" /></label>
                <label className="text-xs font-bold sm:col-span-2">تفاصيل الخدمة<textarea value={form.description} onChange={(e) => field("description", e.target.value)} rows={6} maxLength={4000} className="form-field mt-1.5" /></label>

                <label className="text-xs font-bold">طريقة التقديم
                  <select value={form.deliveryType} onChange={(e) => field("deliveryType", e.target.value)} className="form-field mt-1.5">
                    {Object.entries(deliveryTypeLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>

                <label className="text-xs font-bold">نظام التسعير
                  <select value={form.pricingModel} onChange={(e) => field("pricingModel", e.target.value)} className="form-field mt-1.5">
                    {Object.entries(pricingModelLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>

                <label className="text-xs font-bold">السعر بالدينار<input value={form.basePrice} onChange={(e) => field("basePrice", e.target.value)} disabled={form.pricingModel === "QUOTE_REQUIRED"} type="number" min="1" step="0.01" className="form-field mt-1.5" /></label>
                <label className="text-xs font-bold">المدة بالدقائق<input value={form.estimatedDurationMinutes} onChange={(e) => field("estimatedDurationMinutes", e.target.value)} type="number" min="15" className="form-field mt-1.5" /></label>
                {form.deliveryType !== "REMOTE" && <label className="text-xs font-bold sm:col-span-2">مناطق الخدمة<input value={form.serviceAreas} onChange={(e) => field("serviceAreas", e.target.value)} className="form-field mt-1.5" placeholder="عمّان، الزرقاء، إربد" /></label>}
              </div>
            </div>

            {message && <p role="alert" className="mt-4 rounded-xl bg-[rgb(var(--danger)/0.1)] p-3 text-xs text-[rgb(var(--danger))]">{message}</p>}
            <button type="button" onClick={submit} disabled={pending || !form.serviceTypeId} className="brand-button mt-5 gap-2">
              <Plus size={15} /> {pending ? "جارٍ الحفظ..." : editingId ? "حفظ التعديلات" : "إنشاء المسودة"}
            </button>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5"><p className="text-[10px] font-bold text-brand">3 · الصور والنشر</p><h2 className="mt-1 text-2xl font-bold">عروضي</h2><p className="mt-1 text-xs text-muted">{listings.length} عرض</p></div>

        {listings.length ? <div className="grid gap-4 xl:grid-cols-2">
          {listings.map((listing) => (
            <article key={listing.id} className="overflow-hidden rounded-[1.75rem] border border-theme bg-surface shadow-soft">
              <div className="bg-[#0b817a] p-5 text-white">
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold">{listingStatusLabels[listing.status]}</span>
                <h3 className="mt-4 text-xl font-bold">{listing.title}</h3>
                <p className="mt-1 text-[10px] text-white/70">{listing.service_categories?.name_ar} · {pricingModelLabels[listing.pricing_model]}</p>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between gap-3"><span className="text-xs text-muted">{deliveryTypeLabels[listing.delivery_type]}</span><strong className="text-sm text-brand">{listing.base_price ? `${listing.base_price} د.أ` : "عرض سعر"}</strong></div>
                {listing.moderation_notes && <p className="mt-3 rounded-xl bg-[rgb(var(--warning)/0.1)] p-3 text-xs">ملاحظة المراجعة: {listing.moderation_notes}</p>}
                <div className="mt-4 flex flex-wrap gap-2 border-t border-theme pt-4">
                  {listing.status !== "PUBLISHED" && <button onClick={() => edit(listing)} className="secondary-button !min-h-9 gap-1 !px-3"><Pencil size={14}/>تعديل</button>}
                  {listing.status === "PUBLISHED" || listing.status === "PENDING_REVIEW"
                    ? <button onClick={() => publication(listing,false)} className="secondary-button !min-h-9 !px-3">إيقاف</button>
                    : <button onClick={() => publication(listing,true)} className="brand-button !min-h-9 gap-1 !px-3 !py-1"><Send size={14}/>إرسال للنشر</button>}
                  <label className="secondary-button !min-h-9 cursor-pointer gap-1 !px-3"><ImagePlus size={14}/>صورة
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { void upload(listing,e.target.files?.[0]); e.currentTarget.value=""; }} />
                  </label>
                  {["DRAFT","REJECTED"].includes(listing.status) && <button onClick={() => remove(listing)} className="secondary-button !min-h-9 gap-1 !px-3 text-[rgb(var(--danger))]"><Trash2 size={14}/>حذف</button>}
                </div>
                {listing.status === "PUBLISHED" && <a href={`/listings/${listing.slug}`} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand">شوفها مثل العميل <ArrowLeft size={14}/></a>}
              </div>
            </article>
          ))}
        </div> : <div className="rounded-[1.75rem] border border-dashed border-[rgb(var(--primary)/0.3)] p-10 text-center text-sm text-muted">لسه ما أنشأت أي عرض. ابدأ من النموذج فوق.</div>}
      </section>
    </div>
  );
}
