import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

/**
 * Static routes for Google Search Console / sitemap.xml.
 * Dynamic debate pages are intentionally omitted (session-specific).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  const paths: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/debate/new", changeFrequency: "weekly", priority: 0.95 },
    { path: "/dashboard", changeFrequency: "daily", priority: 0.75 },
    { path: "/auth/login", changeFrequency: "monthly", priority: 0.5 },
    { path: "/auth/signup", changeFrequency: "monthly", priority: 0.5 },
    { path: "/settings", changeFrequency: "monthly", priority: 0.45 },
    { path: "/impressum", changeFrequency: "yearly", priority: 0.35 },
    { path: "/datenschutz", changeFrequency: "yearly", priority: 0.35 },
  ];

  return paths.map(({ path, changeFrequency, priority }) => ({
    url: path === "/" ? `${base}/` : `${base}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
