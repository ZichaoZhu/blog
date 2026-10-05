import type { CollectionGroup, KnowledgeItem } from "./knowledge-model";

export function getArchiveDate(item: KnowledgeItem): string | undefined {
	return item.kind === "post"
		? item.post.data.date
		: item.project.data.published?.toISOString().slice(0, 10);
}

export function buildArchiveGroups(
	publicItems: readonly KnowledgeItem[],
): CollectionGroup[] {
	const items = [...publicItems].sort(
		(a, b) =>
			(getArchiveDate(b) ?? "").localeCompare(getArchiveDate(a) ?? "") ||
			a.key.localeCompare(b.key),
	);
	const years = new Map<string, KnowledgeItem[]>();
	for (const item of items) {
		const year = getArchiveDate(item)?.slice(0, 4) ?? "undated";
		if (!years.has(year)) years.set(year, []);
		years.get(year)?.push(item);
	}
	const description = "按发布日期从新到旧浏览公开文章。";
	return [
		{ id: "archive", title: "归档", description, url: "/archive/", items },
		...Array.from(years, ([year, members]) => ({
			id: year,
			title: year === "undated" ? "日期未记录" : `${year} 年归档`,
			description,
			url: `/archive/${year}/`,
			items: members,
		})),
	];
}
