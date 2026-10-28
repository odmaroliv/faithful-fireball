import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { siteConfig } from "../config/site";
import { showcaseVideos } from "../data/videos";

// Generated on every build so new posts and pages are never missing.
// Every URL ends in "/" because that is how the server serves each page —
// listing the slash-less version makes Google see a redirect instead of a page.
export const GET: APIRoute = async () => {
  const site = `https://${siteConfig.domain}`;
  const today = new Date().toISOString().slice(0, 10);
  const posts = await getCollection("blog");
  const destinations = [...new Set(posts.map((p) => p.data.destination))];

  const urls: { path: string; lastmod: string }[] = [
    { path: "/", lastmod: today },
    { path: "/san-diego-moving/", lastmod: today },
    { path: "/blog/", lastmod: today },
    ...posts.map((p) => ({
      path: `/blog/${p.slug}/`,
      lastmod: (p.data.updatedDate ?? p.data.pubDate).toISOString().slice(0, 10),
    })),
    ...destinations.map((d) => ({
      path: `/blog/destination/${d.toLowerCase().replace(/\s+/g, "-")}/`,
      lastmod: today,
    })),
    ...showcaseVideos.map((v) => ({ path: `/watch/${v.slug}/`, lastmod: today })),
    { path: "/privacy/", lastmod: today },
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${site}${u.path}</loc><lastmod>${u.lastmod}</lastmod></url>`).join("\n")}
</urlset>
`;

  return new Response(body, { headers: { "Content-Type": "application/xml" } });
};
