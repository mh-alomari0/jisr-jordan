import { MetadataRoute } from "next";
import { getPublicAppOrigin } from "@/lib/app-url";
import { createClient } from "@supabase/supabase-js";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getPublicAppOrigin();

  const routes = ["", "/discover", "/services", "/faq", "/terms", "/privacy", "/contact"].map((route) => ({
    url: `${baseUrl}${route}`,
    changeFrequency: route === "" || route === "/services" || route === "/discover" ? "daily" as const : "monthly" as const,
    priority: route === "" ? 1 : route === "/discover" ? 0.9 : route === "/services" ? 0.8 : 0.5,
  }));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return routes;
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const [{ data: listings }, { data: providers }] = await Promise.all([
    supabase.from("service_listings").select("slug, updated_at").eq("status", "PUBLISHED").order("updated_at", { ascending: false }).limit(1000),
    supabase.rpc("search_marketplace", {
      p_query: "",
      p_scope: "PROVIDERS",
      p_category_id: null,
      p_delivery_type: null,
      p_pricing_model: null,
      p_limit: 50,
      p_offset: 0,
    }),
  ]);
  return [
    ...routes,
    ...(listings || []).map((item) => ({ url: `${baseUrl}/listings/${item.slug}`, lastModified: item.updated_at, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...(providers || []).map((item: { result_id: string }) => ({ url: `${baseUrl}/providers/${item.result_id}`, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
