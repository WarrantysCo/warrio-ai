import type { MetadataRoute } from "next";

import { guides } from "@/app/data/guides";

const SITE = (process.env.SITE_URL || "https://warrantys.co").replace(/\/+$/, "");

const pages = [
  "",
  "/plans",
  "/warranty-check",
  "/guides",
  "/faq",
  "/contact",
  "/partners",
  "/amazon-claim",
  "/terms",
  "/privacy-policy",
  "/refund-policy",
  "/shipping-policy",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    ...pages.map((path) => ({
      url: `${SITE}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    })),
    ...guides.map((guide) => ({
      url: `${SITE}/guides/${guide.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
