import { siteContext } from "../config/siteContext";
import { escapeXml } from "../utils/feed-utils";
import { getKnowledgeIndex } from "../utils/knowledge-index";
import { buildCollectionRoutes } from "../utils/knowledge-model";
export async function GET(): Promise<Response> {
	const index = await getKnowledgeIndex();
	const paths = new Set([
		"/",
		"/topics/",
		"/about/",
		"/search/",
		...Object.values(index.hubs).map((h) => h.url),
		...buildCollectionRoutes(index).map((r) => r.url),
	]);
	const entries = [...paths].map((path) => ({
		path,
		date: undefined as string | undefined,
	}));
	for (const item of index.publicItems) {
		const dates =
			item.kind === "post"
				? [item.post.data.date, item.post.data.updatedAt]
						.filter(Boolean)
						.map((d) => new Date(d as string))
				: [item.project.data.published, item.project.data.updated].filter(
						(d): d is Date => !!d,
					);
		const latest = dates
			.filter((d) => Number.isFinite(d.getTime()))
			.sort((a, b) => b.getTime() - a.getTime())[0];
		entries.push({ path: item.url, date: latest?.toISOString().slice(0, 10) });
	}
	return new Response(
		'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
			entries
				.map(
					(e) =>
						`<url><loc>${escapeXml(new URL(e.path, siteContext.origin).href)}</loc>${e.date ? `<lastmod>${e.date}</lastmod>` : ""}</url>`,
				)
				.join("") +
			"</urlset>",
		{ headers: { "Content-Type": "application/xml" } },
	);
}
