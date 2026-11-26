import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Amazon buyer message prints the claim link as "warrantys.co/amazon- claim"
  // (Amazon inserts a space after the hyphen), so customers land on mistyped
  // variants. Send all of them to the real page instead of a 404.
  async redirects() {
    return [
      // Short link for asking customers for a Google review (Business Profile
      // "Ask for reviews" link, given by Amit 2026-11-26).
      {
        source: "/review",
        destination: "https://g.page/r/CUbfzZb5wzbaEBM/review",
        permanent: false,
      },
      {
        source: "/reviews",
        destination: "https://g.page/r/CUbfzZb5wzbaEBM/review",
        permanent: false,
      },
      // Old website: product pages Google still has indexed (733 of them)
      // now go to the live price list instead of a 404.
      { source: "/product/:path*", destination: "/plans", permanent: true },
      { source: "/products/:path*", destination: "/plans", permanent: true },
      { source: "/products", destination: "/plans", permanent: true },
      // One address for the site: www goes to the main domain.
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.warrantys.co" }],
        destination: "https://warrantys.co/:path*",
        permanent: true,
      },
      ...[
      "/amazon-",
      "/amazon- claim",
      "/amazon-%20claim",
      "/amazon -claim",
      "/amazon%20-claim",
      "/amazon claim",
      "/amazon%20claim",
      "/amazon_claim",
      "/amazonclaim",
      "/amazon-claims",
      "/amazon",
      "/claim",
      ].map((source) => ({
        source,
        destination: "/amazon-claim",
        permanent: false,
      })),
    ];
  },

  // Next statically pre-renders most of our pages and sends them with a
  // year-long CDN cache header (s-maxage=31536000), on the assumption the
  // CDN purges that cache on every deploy (as Vercel's does). Hostinger's
  // hcdn doesn't: it keeps serving the old HTML indefinitely, which then
  // asks for yesterday's CSS/JS filenames, which no longer exist, so the
  // page loads with no styling. Pages/API routes get no-store here, so
  // hcdn never caches the HTML itself. The static, content-hashed files
  // under /_next/static are safe to cache for a long time, since a new
  // build gives changed files a new name rather than overwriting one.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
