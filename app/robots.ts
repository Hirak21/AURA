import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.AURA_PUBLIC_URL ?? "http://localhost:3000";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Authenticated and operational surfaces must never be indexed.
        disallow: ["/app", "/admin", "/mentor", "/login", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
