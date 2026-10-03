import { courses, topics } from "../data/catalog";
export interface LegacyMap {
	paths: Record<string, string>;
	images: Record<
		string,
		{ original: string; variants: Array<{ url: string; width: number }> }
	>;
}
export function resolveLegacyMap(
	pathname: string,
	query: URLSearchParams,
	map: LegacyMap,
): string | null {
	let path: string;
	try {
		path = decodeURIComponent(pathname).replace(/\/+$/, "") || "/";
	} catch {
		return null;
	}
	if (
		path.split("/").some((p) => p === ".." || p === ".") ||
		path.includes("\\") ||
		path.includes("\0")
	)
		return null;
	if (path.startsWith("/api/images/")) {
		const image = map.images[path.slice("/api/images/".length)];
		if (!image) return null;
		const width = Number(query.get("w"));
		if (width > 0 && Number.isInteger(width)) {
			const options = image.variants
				.filter((v) => v.url.startsWith("/_astro/"))
				.sort((a, b) => a.width - b.width);
			return (
				(options.find((v) => v.width >= width) ?? options.at(-1))?.url ??
				image.original
			);
		}
		return image.original;
	}
	if (map.paths[path]) return map.paths[path];
	if (path.startsWith("/authors/")) return "/about/";
	if (path.startsWith("/research/areas/")) {
		const id = path.split("/").at(-1);
		return topics.some((t) => t.id === id) ? `/topics/${id}/` : "/topics/";
	}
	if (!["/blog", "/notes", "/archive"].includes(path)) return null;
	const folder = query.get("folder");
	const category = query.get("category");
	const tag = query.get("tag");
	const c = courses.find(
		(c) =>
			(folder &&
				(folder === c.sourcePrefix ||
					folder.startsWith(c.sourcePrefix + "/"))) ||
			category === c.title,
	);
	if (c) return `/courses/${c.id}/`;
	if (category === "论文阅读" || folder === "Paper-Reading") return "/papers/";
	if (category === "科研日志" || folder === "Reaserch_Note")
		return "/research/logs/";
	const topic = topics.find((t) => t.name === tag);
	if (topic) return `/topics/${topic.id}/`;
	const params = new URLSearchParams();
	for (const name of ["q", "type", "topic", "course"]) {
		const value = query.get(name);
		if (value) params.set(name, value);
	}
	if (params.size === 1 && params.has("type")) {
		const type = params.get("type");
		if (type === "paper") return "/papers/";
		if (type === "course") return "/courses/";
		if (["log", "idea", "experiment"].includes(type!))
			return `/research/${type === "log" ? "logs" : type === "idea" ? "ideas" : "experiments"}/`;
	}
	if (
		params.size === 1 &&
		params.has("topic") &&
		topics.some((t) => t.id === params.get("topic"))
	)
		return `/topics/${params.get("topic")}/`;
	if (params.size) return "/search/?" + params.toString();
	if (folder || category || tag)
		return "/search/?q=" + encodeURIComponent(folder || category || tag || "");
	const page = Number(query.get("page"));
	if (Number.isInteger(page) && page > 1) return `/notes/page/${page}/`;
	return path === "/notes" && !query.size ? null : "/notes/";
}
