import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/markets", "/leaderboard"].map(path => ({ url: new URL(path, siteUrl).toString(), changeFrequency: "daily", priority: path === "/" ? 1 : 0.8 }));
}
