import { MetadataRoute } from "next";
import { getPublicAppOrigin } from "@/lib/app-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getPublicAppOrigin();

  const routes = ["", "/services", "/faq", "/terms", "/privacy", "/contact"].map((route) => ({
    url: `${baseUrl}${route}`,
    changeFrequency: route === "" || route === "/services" ? "daily" as const : "monthly" as const,
    priority: route === "" ? 1 : route === "/services" ? 0.9 : 0.5,
  }));

  return [...routes];
}
