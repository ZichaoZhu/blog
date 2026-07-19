import { getAllPosts } from "@/lib/posts";
import { absoluteUrl, postUrl, siteConfig } from "@/lib/site";

export const dynamic = "force-static";

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      '"': "&quot;",
      "'": "&apos;",
    };
    return entities[character];
  });
}

function rssDate(value: string): string | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toUTCString();
}

export async function GET(): Promise<Response> {
  const posts = await getAllPosts();
  const feedUrl = absoluteUrl("/rss.xml");
  const homeUrl = absoluteUrl("/");
  const lastBuildDate = posts
    .map((post) => rssDate(post.frontmatter.date))
    .find((date): date is string => date !== null);

  const items = posts.map((post) => {
    const url = postUrl(post.path);
    const description = post.frontmatter.description || post.excerpt;
    const publicationDate = rssDate(post.frontmatter.date);
    const categories = [post.frontmatter.category, ...post.frontmatter.tags]
      .filter(Boolean)
      .map((category) => `<category>${escapeXml(category)}</category>`)
      .join("");

    return [
      "<item>",
      `<title>${escapeXml(post.frontmatter.title)}</title>`,
      `<link>${escapeXml(url)}</link>`,
      `<guid isPermaLink="true">${escapeXml(url)}</guid>`,
      publicationDate ? `<pubDate>${publicationDate}</pubDate>` : "",
      `<description>${escapeXml(description)}</description>`,
      categories,
      "</item>",
    ].join("");
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "<channel>",
    `<title>${escapeXml(siteConfig.name)}</title>`,
    `<link>${escapeXml(homeUrl)}</link>`,
    `<description>${escapeXml(siteConfig.description)}</description>`,
    `<language>${siteConfig.language}</language>`,
    `<atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />`,
    lastBuildDate ? `<lastBuildDate>${lastBuildDate}</lastBuildDate>` : "",
    ...items,
    "</channel>",
    "</rss>",
  ].join("\n");

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=3600",
    },
  });
}
