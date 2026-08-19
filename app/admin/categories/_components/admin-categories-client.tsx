"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createMarketplaceCategoryAction, updateMarketplaceCategoryAction } from "@/lib/actions/marketplace-admin";
import type { MarketplaceCategory } from "@/lib/marketplace";

export default function AdminCategoriesClient({ categories }: { categories: MarketplaceCategory[] }) {
  const router = useRouter();
  const [parentId, setParentId] = useState("");
  const [slug, setSlug] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [requiresModeration, setRequiresModeration] = useState(false);
  const [message, setMessage] = useState("");
  const parents = categories.filter((item) => !item.parent_id);
  const create = async () => {
    const result = await createMarketplaceCategoryAction({ parentId: parentId || null, slug, nameAr, descriptionAr, icon: null, displayOrder: categories.length * 10 + 10, requiresModeration });
    if (!result.success) setMessage(result.error || "تعذر الإنشاء");
    else { setSlug(""); setNameAr(""); setDescriptionAr(""); setMessage(""); router.refresh(); }
  };
  const update = async (category: MarketplaceCategory, changes: { nameAr?: string; isActive?: boolean }) => {
    const result = await updateMarketplaceCategoryAction(category.id, {
      parentId: category.parent_id,
      slug: category.slug,
      nameAr: changes.nameAr || category.name_ar,
      descriptionAr: category.description_ar || "",
      icon: category.icon,
      displayOrder: category.display_order,
      requiresModeration: category.requires_moderation,
      isActive: changes.isActive ?? category.is_active,
    });
    if (!result.success) setMessage(result.error || "تعذر التحديث"); else { setMessage(""); router.refresh(); }
  };
  return (
    <div className="space-y-6">
      <section className="surface-card p-5">
        <h2 className="font-black">إضافة تصنيف</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-bold">المستوى<select value={parentId} onChange={(event) => setParentId(event.target.value)} className="form-field mt-1.5"><option value="">مجال رئيسي</option>{parents.map((item) => <option key={item.id} value={item.id}>فرع ضمن {item.name_ar}</option>)}</select></label>
          <label className="text-xs font-bold">الاسم العربي<input value={nameAr} onChange={(event) => setNameAr(event.target.value)} className="form-field mt-1.5" /></label>
          <label className="text-xs font-bold">المعرّف الإنجليزي<input dir="ltr" value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase())} className="form-field mt-1.5 text-right" /></label>
          <label className="text-xs font-bold">وصف مختصر<input value={descriptionAr} onChange={(event) => setDescriptionAr(event.target.value)} className="form-field mt-1.5" /></label>
        </div>
        <label className="mt-4 flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={requiresModeration} onChange={(event) => setRequiresModeration(event.target.checked)} /> تتطلب العروض مراجعة قبل النشر</label>
        {message && <p role="alert" className="mt-3 text-xs text-[rgb(var(--danger))]">{message}</p>}
        <button type="button" onClick={create} className="brand-button mt-4">إضافة التصنيف</button>
      </section>
      <section className="surface-card overflow-hidden">
        <div className="border-b border-theme p-4"><h2 className="font-black">شجرة التصنيفات</h2><p className="mt-1 text-xs text-muted">التعطيل يخفي التصنيف دون حذف العروض أو التاريخ.</p></div>
        <div className="divide-y divide-[rgb(var(--border))]">{parents.map((parent) => (
          <div key={parent.id} className="p-4">
            <div className="flex items-center justify-between gap-3"><div><strong>{parent.name_ar}</strong><span className="ms-2 text-[10px] text-muted">{parent.slug}</span></div><div className="flex gap-2"><button type="button" onClick={() => { const name = window.prompt("الاسم العربي", parent.name_ar); if (name) void update(parent, { nameAr: name }); }} className="secondary-button !min-h-8 !px-3 !py-1 text-xs">تعديل الاسم</button><button type="button" onClick={() => update(parent, { isActive: !parent.is_active })} className="secondary-button !min-h-8 !px-3 !py-1 text-xs">{parent.is_active ? "تعطيل" : "تفعيل"}</button></div></div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">{categories.filter((child) => child.parent_id === parent.id).map((child) => <div key={child.id} className="flex items-center justify-between rounded-xl bg-surface-muted p-3 text-xs"><span>{child.name_ar}{child.requires_moderation && <small className="ms-2 text-[rgb(var(--warning))]">مراجعة إلزامية</small>}</span><button type="button" onClick={() => update(child, { isActive: !child.is_active })} className="font-bold text-brand">{child.is_active ? "تعطيل" : "تفعيل"}</button></div>)}</div>
          </div>
        ))}</div>
      </section>
    </div>
  );
}

