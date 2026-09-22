import type { MetadataRoute } from "next";
import { env } from "@/env";

export default function robots(): MetadataRoute.Robots {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private and internal areas are never indexed.
      disallow: ["/api/", "/*/design", "/*/account", "/*/dashboard", "/*/admin", "/*/login", "/*/signup"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
