import { siteContext } from "../config/siteContext";
import { courses, topics } from "../data/catalog";
import {
	asNoteRecord,
	getSortedPosts,
	getSortedProjects,
} from "../utils/content-utils";
import { escapeXml } from "../utils/feed-utils";
import { removeFileExtension } from "../utils/url-utils";
export async function GET(): Promise<Response> {
	const notes = (await getSortedPosts()).map(asNoteRecord);
	const paths = [
		"/",
		"/notes/",
		"/courses/",
		"/papers/",
		"/research/",
		"/research/logs/",
		"/research/ideas/",
		"/research/experiments/",
		"/projects/",
		"/topics/",
		"/about/",
		...courses.map((c) => `/courses/${c.id}/`),
		...topics.map((t) => `/topics/${t.id}/`),
		...Array.from(
			{ length: Math.max(0, Math.ceil(notes.length / 25) - 1) },
			(_, i) => `/notes/page/${i + 2}/`,
		),
	];
	const projects = await getSortedProjects();
	const entries = [
		...projects.map((p) => ({
			path: `/projects/${removeFileExtension(p.id)}/`,
			date: p.data.published?.toISOString().slice(0, 10),
		})),
		...paths.map((path) => ({ path, date: undefined as string | undefined })),
		...notes.map((n) => ({
			path: `/notes/${n.data.slug}/`,
			date: n.data.updatedAt ?? n.data.date,
		})),
	];
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
