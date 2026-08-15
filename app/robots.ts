import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://jisr-jordan.com";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/bookings", "/reset-password"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
