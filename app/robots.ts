import { MetadataRoute } from "next";
import { getPublicAppOrigin } from "@/lib/app-url";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getPublicAppOrigin();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/booking",
          "/bookings/",
          "/notifications",
          "/profile/",
          "/provider/",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
