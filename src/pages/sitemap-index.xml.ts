import { siteContext } from "../config/siteContext";
export function GET(): Response {
	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${new URL("/sitemap.xml", siteContext.origin).href}</loc></sitemap></sitemapindex>`,
		{ headers: { "Content-Type": "application/xml" } },
	);
}
