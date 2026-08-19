"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient, getAuthenticatedUser, getUserRole, isAdminRole } from "@/lib/supabase/server";

const IdSchema = z.string().uuid();
const CategorySchema = z.object({
  parentId: z.string().uuid().nullable(),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "المعرّف المختصر يجب أن يكون إنجليزياً وبشرطات"),
  nameAr: z.string().trim().min(2).max(80),
  descriptionAr: z.string().trim().max(500),
  icon: z.string().trim().max(80).nullable(),
  displayOrder: z.number().int().min(0).max(10_000),
  requiresModeration: z.boolean(),
});

async function adminContext() {
  const supabase = await createServerSupabaseClient();
  const user = await getAuthenticatedUser(supabase);
  if (!user) return { supabase, user: null, role: null };
  const role = await getUserRole(supabase, user.id);
  return { supabase, user, role };
}

export async function createMarketplaceCategoryAction(input: z.input<typeof CategorySchema>) {
  const parsed = CategorySchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message || "بيانات التصنيف غير صالحة" };
  try {
    const { supabase, user, role } = await adminContext();
    if (!user || !isAdminRole(role)) return { success: false as const, error: "غير مصرح" };
    if (parsed.data.parentId) {
      const { data: parent } = await supabase.from("service_categories").select("id, parent_id")
        .eq("id", parsed.data.parentId).maybeSingle();
      if (!parent || parent.parent_id) return { success: false as const, error: "يمكن إضافة مستوى فرعي واحد فقط" };
    }
    const { error } = await supabase.from("service_categories").insert({
      parent_id: parsed.data.parentId,
      slug: parsed.data.slug,
      name_ar: parsed.data.nameAr,
      description_ar: parsed.data.descriptionAr || null,
      icon: parsed.data.icon,
      display_order: parsed.data.displayOrder,
      requires_moderation: parsed.data.requiresModeration,
      created_by: user.id,
      is_active: true,
    });
    if (error) return { success: false as const, error: error.code === "23505" ? "المعرّف المختصر مستخدم" : "تعذر إنشاء التصنيف" };
    revalidatePath("/admin/categories");
    revalidatePath("/");
    revalidatePath("/discover");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "تعذر إنشاء التصنيف" };
  }
}

export async function updateMarketplaceCategoryAction(categoryId: string, input: z.input<typeof CategorySchema> & { isActive: boolean }) {
  const id = IdSchema.safeParse(categoryId);
  const parsed = CategorySchema.extend({ isActive: z.boolean() }).safeParse(input);
  if (!id.success || !parsed.success) return { success: false as const, error: parsed.success ? "معرف التصنيف غير صالح" : parsed.error.issues[0]?.message };
  try {
    const { supabase, user, role } = await adminContext();
    if (!user || !isAdminRole(role)) return { success: false as const, error: "غير مصرح" };
    if (parsed.data.parentId === categoryId) return { success: false as const, error: "لا يمكن جعل التصنيف تابعاً لنفسه" };
    if (parsed.data.parentId) {
      const { data: parent } = await supabase.from("service_categories").select("id, parent_id")
        .eq("id", parsed.data.parentId).maybeSingle();
      if (!parent || parent.parent_id) return { success: false as const, error: "يمكن إضافة مستوى فرعي واحد فقط" };
    }
    const { error } = await supabase.from("service_categories").update({
      parent_id: parsed.data.parentId,
      slug: parsed.data.slug,
      name_ar: parsed.data.nameAr,
      description_ar: parsed.data.descriptionAr || null,
      icon: parsed.data.icon,
      display_order: parsed.data.displayOrder,
      requires_moderation: parsed.data.requiresModeration,
      is_active: parsed.data.isActive,
    }).eq("id", categoryId);
    if (error) return { success: false as const, error: "تعذر تحديث التصنيف؛ تحقق من العروض أو الفروع المرتبطة" };
    revalidatePath("/admin/categories");
    revalidatePath("/");
    revalidatePath("/discover");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "تعذر تحديث التصنيف" };
  }
}

export async function getAdminMarketplaceListingsAction(page = 1, status?: string) {
  try {
    const { supabase, user, role } = await adminContext();
    if (!user || !isAdminRole(role)) return { success: false as const, error: "غير مصرح", listings: [] };
    const safePage = Math.max(1, Math.floor(page));
    const pageSize = 25;
    let query = supabase.from("service_listings")
      .select("id, provider_id, category_id, slug, title, short_description, delivery_type, pricing_model, base_price, currency, status, moderation_notes, published_at, created_at, updated_at, service_categories(id, name_ar)")
      .order("updated_at", { ascending: false }).range((safePage - 1) * pageSize, safePage * pageSize);
    if (status && ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "PAUSED", "REJECTED"].includes(status)) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return { success: false as const, error: "تعذر تحميل العروض", listings: [] };
    const rows = data || [];
    const providerIds = [...new Set(rows.map((row) => row.provider_id))];
    const { data: users } = providerIds.length ? await supabase.from("users").select("id, full_name").in("id", providerIds) : { data: [] };
    const names = new Map((users || []).map((item) => [item.id, item.full_name]));
    return {
      success: true as const,
      listings: rows.slice(0, pageSize).map((row) => ({ ...row, provider_name: names.get(row.provider_id) || "مقدم خدمة" })),
      page: safePage,
      hasMore: rows.length > pageSize,
    };
  } catch {
    return { success: false as const, error: "تعذر تحميل العروض", listings: [] };
  }
}

export async function moderateMarketplaceListingAction(listingId: string, decision: "APPROVE" | "REJECT" | "DEACTIVATE", notes: string) {
  if (!IdSchema.safeParse(listingId).success || notes.length > 1000) return { success: false as const, error: "بيانات المراجعة غير صالحة" };
  try {
    const { supabase, user, role } = await adminContext();
    if (!user || !isAdminRole(role)) return { success: false as const, error: "غير مصرح" };
    const { data, error } = await supabase.rpc("moderate_listing", { p_listing_id: listingId, p_decision: decision, p_notes: notes || null });
    if (error || !data?.success) return { success: false as const, error: "تعذر تنفيذ قرار المراجعة" };
    revalidatePath("/admin/listings");
    revalidatePath("/discover");
    revalidatePath("/");
    return { success: true as const, status: data.status as string };
  } catch {
    return { success: false as const, error: "تعذر تنفيذ قرار المراجعة" };
  }
}

export async function getAdminProviderContentAction(page = 1, status?: string) {
  try {
    const { supabase, user, role } = await adminContext();
    if (!user || !isAdminRole(role)) return { success: false as const, error: "غير مصرح", posts: [] };
    const safePage = Math.max(1, Math.floor(page));
    const pageSize = 25;
    let query = supabase.from("provider_posts")
      .select("id, provider_id, listing_id, content, post_type, status, moderation_notes, published_at, created_at, updated_at, service_listings(id, title, slug)")
      .order("updated_at", { ascending: false }).range((safePage - 1) * pageSize, safePage * pageSize);
    if (status && ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "DEACTIVATED", "REJECTED"].includes(status)) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return { success: false as const, error: "تعذر تحميل المحتوى", posts: [] };
    return { success: true as const, posts: (data || []).slice(0, pageSize), page: safePage, hasMore: (data || []).length > pageSize };
  } catch {
    return { success: false as const, error: "تعذر تحميل المحتوى", posts: [] };
  }
}

export async function moderateProviderContentAction(postId: string, decision: "APPROVE" | "REJECT" | "DEACTIVATE", notes: string) {
  if (!IdSchema.safeParse(postId).success || notes.length > 1000) return { success: false as const, error: "بيانات المراجعة غير صالحة" };
  try {
    const { supabase, user, role } = await adminContext();
    if (!user || !isAdminRole(role)) return { success: false as const, error: "غير مصرح" };
    const { data, error } = await supabase.rpc("moderate_provider_post", { p_post_id: postId, p_decision: decision, p_notes: notes || null });
    if (error || !data?.success) return { success: false as const, error: "تعذر تنفيذ قرار المراجعة" };
    revalidatePath("/admin/content");
    revalidatePath("/");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "تعذر تنفيذ قرار المراجعة" };
  }
}

export async function getAdminContentReportsAction(page = 1, status = "OPEN") {
  try {
    const { supabase, user, role } = await adminContext();
    if (!user || !isAdminRole(role)) return { success: false as const, error: "غير مصرح", reports: [] };
    const safePage = Math.max(1, Math.floor(page)); const pageSize = 25;
    let query = supabase.from("marketplace_content_reports")
      .select("id, reporter_id, target_type, target_id, reason, details, status, reviewed_by, reviewed_at, created_at")
      .order("created_at", { ascending: false }).range((safePage - 1) * pageSize, safePage * pageSize);
    if (["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"].includes(status)) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return { success: false as const, error: "تعذر تحميل بلاغات المحتوى", reports: [] };
    return { success: true as const, reports: (data || []).slice(0, pageSize), hasMore: (data || []).length > pageSize };
  } catch { return { success: false as const, error: "تعذر تحميل بلاغات المحتوى", reports: [] }; }
}

export async function updateAdminContentReportAction(reportId: string, status: "REVIEWING" | "RESOLVED" | "DISMISSED") {
  if (!IdSchema.safeParse(reportId).success) return { success: false as const, error: "معرف البلاغ غير صالح" };
  try {
    const { supabase, user, role } = await adminContext();
    if (!user || !isAdminRole(role)) return { success: false as const, error: "غير مصرح" };
    const { data, error } = await supabase.from("marketplace_content_reports")
      .update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq("id", reportId).select("id").maybeSingle();
    if (error || !data) return { success: false as const, error: "تعذر تحديث البلاغ" };
    await supabase.from("audit_logs").insert({ actor_id: user.id, action: "CONTENT_REPORT_UPDATED", target: reportId, metadata: { status } });
    revalidatePath("/admin/content");
    return { success: true as const };
  } catch { return { success: false as const, error: "تعذر تحديث البلاغ" }; }
}

export async function getAdminQuoteRequestsAction(page = 1) {
  try {
    const { supabase, user, role } = await adminContext();
    if (!user || !isAdminRole(role)) return { success: false as const, error: "غير مصرح", requests: [] };
    const safePage = Math.max(1, Math.floor(page));
    const pageSize = 25;
    const { data, error } = await supabase.from("quote_requests")
      .select("id, customer_id, provider_id, listing_id, requirements, budget, target_date, status, created_at, service_listings(id, title, slug), provider_quotes(id, amount, currency, timeline_days, status, expires_at)")
      .order("created_at", { ascending: false }).range((safePage - 1) * pageSize, safePage * pageSize);
    if (error) return { success: false as const, error: "تعذر تحميل طلبات الأسعار", requests: [] };
    return { success: true as const, requests: (data || []).slice(0, pageSize), page: safePage, hasMore: (data || []).length > pageSize };
  } catch {
    return { success: false as const, error: "تعذر تحميل طلبات الأسعار", requests: [] };
  }
}

export async function configureMarketplaceCommissionAction(categoryId: string | null, ratePercent: number) {
  if ((categoryId && !IdSchema.safeParse(categoryId).success) || !z.number().min(0).max(100).safeParse(ratePercent).success) {
    return { success: false as const, error: "بيانات العمولة غير صالحة" };
  }
  try {
    const { supabase, user, role } = await adminContext();
    if (!user || role !== "SUPER_ADMIN") return { success: false as const, error: "يتطلب تعديل العمولات صلاحية المدير الأعلى" };
    const { data, error } = await supabase.rpc("configure_marketplace_commission", {
      p_category_id: categoryId,
      p_rate_percent: ratePercent,
      p_effective_from: new Date().toISOString(),
    });
    if (error || !data?.success) return { success: false as const, error: "تعذر حفظ قاعدة العمولة" };
    revalidatePath("/admin/commissions");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "تعذر حفظ قاعدة العمولة" };
  }
}

export async function getAdminCommissionsAction(page = 1) {
  try {
    const { supabase, user, role } = await adminContext();
    if (!user || !isAdminRole(role)) return { success: false as const, error: "غير مصرح", rules: [], obligations: [], role };
    const safePage = Math.max(1, Math.floor(page));
    const pageSize = 25;
    const [{ data: rules }, { data: obligations, error }] = await Promise.all([
      supabase.from("marketplace_commission_rules")
        .select("id, category_id, rate_percent, is_active, effective_from, effective_until, created_at, service_categories(id, name_ar)")
        .order("created_at", { ascending: false }).limit(100),
      supabase.from("commission_ledger")
        .select("id, booking_id, provider_id, customer_id, category_id, gross_amount, rate_percent, commission_amount, currency, status, due_at, settled_at, created_at")
        .order("created_at", { ascending: false }).range((safePage - 1) * pageSize, safePage * pageSize),
    ]);
    if (error) return { success: false as const, error: "تعذر تحميل سجل العمولات", rules: rules || [], obligations: [], role };
    return { success: true as const, rules: rules || [], obligations: (obligations || []).slice(0, pageSize), role, page: safePage, hasMore: (obligations || []).length > pageSize };
  } catch {
    return { success: false as const, error: "تعذر تحميل سجل العمولات", rules: [], obligations: [], role: null };
  }
}

export async function updateCommissionObligationAction(commissionId: string, status: "SETTLED" | "DISPUTED" | "VOID") {
  if (!IdSchema.safeParse(commissionId).success) return { success: false as const, error: "معرف العمولة غير صالح" };
  try {
    const { supabase, user, role } = await adminContext();
    if (!user || !isAdminRole(role)) return { success: false as const, error: "غير مصرح" };
    const { data, error } = await supabase.rpc("update_commission_obligation", { p_commission_id: commissionId, p_status: status });
    if (error || !data?.success) return { success: false as const, error: "الانتقال المطلوب لحالة العمولة غير مسموح" };
    revalidatePath("/admin/commissions");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "تعذر تحديث العمولة" };
  }
}
