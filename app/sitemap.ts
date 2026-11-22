import type { MetadataRoute } from "next";
import { listTopics } from "@/lib/services/catalog";

// Topic URLs come from the live catalogue, so this cannot be prerendered at
// build time (the production DB lives outside the release directory).
export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.AURA_PUBLIC_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const now = new Date();
  const topics = listTopics();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/learn`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    ...topics.map((topic) => ({
      url: `${base}/learn/${topic.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    { url: `${base}/events`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/projects`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/collaborate`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];
}
