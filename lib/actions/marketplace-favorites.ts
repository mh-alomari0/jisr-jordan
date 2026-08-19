"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

const FavoriteSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("LISTING"), id: z.string().uuid() }),
  z.object({ type: z.literal("PROVIDER"), id: z.string().uuid() }),
]);

export async function toggleMarketplaceFavoriteAction(input: z.input<typeof FavoriteSchema>) {
  const parsed = FavoriteSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: "بيانات المفضلة غير صالحة" };
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false as const, error: "سجّل الدخول لحفظ المفضلة" };
    const rate = await checkRateLimit(`favorite:toggle:${user.id}`, { limit: 60, windowMs: 60 * 60_000 });
    if (!rate.success) return { success: false as const, error: rate.error };
    const column = parsed.data.type === "LISTING" ? "listing_id" : "provider_id";
    const { data: existing } = await supabase.from("marketplace_favorites").select("id")
      .eq("user_id", user.id).eq(column, parsed.data.id).maybeSingle();
    if (existing) {
      const { error } = await supabase.from("marketplace_favorites").delete()
        .eq("id", existing.id).eq("user_id", user.id);
      if (error) return { success: false as const, error: "تعذر تحديث المفضلة" };
      revalidatePath("/favorites");
      return { success: true as const, saved: false };
    }
    const result = parsed.data.type === "LISTING"
      ? await supabase.from("marketplace_favorites").insert({ user_id: user.id, listing_id: parsed.data.id, provider_id: null })
      : await supabase.from("marketplace_favorites").insert({ user_id: user.id, listing_id: null, provider_id: parsed.data.id });
    const { error } = result;
    if (error) return { success: false as const, error: "تعذر حفظ المفضلة" };
    revalidatePath("/favorites");
    return { success: true as const, saved: true };
  } catch {
    return { success: false as const, error: "تعذر تحديث المفضلة" };
  }
}

export async function getMarketplaceFavoritesAction() {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return { success: false as const, error: "يجب تسجيل الدخول", favorites: [] };
    const { data, error } = await supabase.from("marketplace_favorites")
      .select("id, listing_id, provider_id, created_at, service_listings(id, slug, title, short_description, pricing_model, base_price, currency, delivery_type)")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
    if (error) return { success: false as const, error: "تعذر تحميل المفضلة", favorites: [] };
    const providerIds = (data || []).map((item) => item.provider_id).filter(Boolean) as string[];
    const providers = await Promise.all(providerIds.map(async (providerId) => {
      const { data: provider } = await supabase.rpc("get_public_provider_profile", { p_provider_id: providerId });
      return provider;
    }));
    const providerMap = new Map(providers.filter(Boolean).map((provider) => [(provider as { id: string }).id, provider]));
    return {
      success: true as const,
      favorites: (data || []).map((item) => ({ ...item, provider: item.provider_id ? providerMap.get(item.provider_id) || null : null })),
    };
  } catch {
    return { success: false as const, error: "تعذر تحميل المفضلة", favorites: [] };
  }
}
