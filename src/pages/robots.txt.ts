import { siteContext } from "../config/siteContext";
export function GET(): Response {
	return new Response(
		siteContext.noindex
			? "User-agent: *\nDisallow: /\n"
			: `User-agent: *\nAllow: /\nSitemap: ${new URL("/sitemap-index.xml", siteContext.origin).href}\n`,
		{ headers: { "Content-Type": "text/plain; charset=utf-8" } },
	);
}
