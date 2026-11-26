import { guides } from "@/app/data/guides";

const SITE = (process.env.SITE_URL || "https://warrantys.co").replace(/\/+$/, "");

// Separate video sitemap (video:video namespace) for the YouTube Shorts
// embedded on /guides/[slug] pages — the standard Next.js sitemap() metadata
// route doesn't support this namespace, so it's a plain XML route instead.
function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const entries = guides.filter((guide) => guide.video);

  const body = entries
    .map((guide) => {
      const video = guide.video!;
      return `  <url>
    <loc>${SITE}/guides/${guide.slug}</loc>
    <video:video>
      <video:thumbnail_loc>https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg</video:thumbnail_loc>
      <video:title>${escapeXml(video.title)}</video:title>
      <video:description>${escapeXml(video.description)}</video:description>
      <video:content_loc>https://www.youtube.com/shorts/${video.youtubeId}</video:content_loc>
      <video:player_loc>https://www.youtube.com/embed/${video.youtubeId}</video:player_loc>
      <video:publication_date>${video.uploadDate}</video:publication_date>
    </video:video>
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${body}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
