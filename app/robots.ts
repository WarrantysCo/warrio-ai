import type { MetadataRoute } from "next";

const SITE = (process.env.SITE_URL || "https://warrantys.co").replace(/\/+$/, "");

// Public pages are open to every crawler, including the AI answer engines
// (so they can read and quote our pages). Admin and API stay private.
export default function robots(): MetadataRoute.Robots {
  const privatePaths = ["/admin", "/api", "/warranty/"];
  const aiBots = [
    "GPTBot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "PerplexityBot",
    "ClaudeBot",
    "Claude-SearchBot",
    "Google-Extended",
    "Bingbot",
    "CCBot",
  ];

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: privatePaths },
      ...aiBots.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: privatePaths,
      })),
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
