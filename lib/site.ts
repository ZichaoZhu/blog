const FALLBACK_SITE_URL = "https://example.com";

function toSiteUrl(value: string | undefined): URL | null {
  if (!value) return null;

  try {
    const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(candidate);

    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    // Keep URL joining predictable when an environment value contains a path.
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    url.search = "";
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function resolveSiteUrl(): URL {
  const configuredUrl = toSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (configuredUrl) return configuredUrl;

  // Vercel exposes the production domain during both production and preview builds.
  // Using it here prevents preview deployments from becoming their own canonical URL.
  const vercelProductionUrl = toSiteUrl(
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  );
  return vercelProductionUrl ?? new URL(FALLBACK_SITE_URL);
}

export const siteConfig = {
  name: "世界は優しい",
  title: "世界は優しい · 研究与学习笔记",
  description: "ZZC 的个人博客，记录科研日志、论文阅读与日常学习。",
  language: "zh-CN",
  locale: "zh_CN",
  primaryAuthorId: "zhuzichao",
  primaryAuthorName: "ZZC",
  url: resolveSiteUrl(),
} as const;

export const isPreviewDeployment = process.env.VERCEL_ENV === "preview";

export function absoluteUrl(pathname = "/"): string {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return new URL(normalizedPath, siteConfig.url).toString();
}

export function postUrl(postPath: string): string {
  const encodedPath = postPath
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");

  return absoluteUrl(`/blog/${encodedPath}`);
}
