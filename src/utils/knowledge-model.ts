import type { ProjectData } from "../content/schema";
import { buildArchiveGroups } from "./archive-model";
import {
	assertCatalog,
	type Catalog,
	compareNoteDates,
	isPublicNote,
	type NoteData,
	type NoteRecord,
	type NoteSummary,
	type NoteType,
	orderCourseNotes,
	toSummary,
} from "./note-model";

export type HubId = "courses" | "papers" | "research" | "projects";
export type NavItem = {
	id: string;
	title: string;
	url: string;
	count: number;
	state: "none" | "current" | "related";
};
export type SidebarContext = {
	hub: HubId | null;
	title: string;
	items: NavItem[];
	course?: { courseId: string; currentSlug: string; notes: NoteSummary[] };
};
export function getSidebarContext(
	index: KnowledgeIndex,
	pathname: string,
	article?: {
		url: string;
		type: NoteType | "project";
		topics: string[];
		course?: NoteData["course"];
	},
): SidebarContext {
	const path = `${pathname.replace(/\/$/, "")}/`;
	if (path.startsWith("/archive/"))
		return {
			hub: null,
			title: "年份",
			items: Object.values(index.lists)
				.filter((group) => group.url.startsWith("/archive/"))
				.map((group) => ({
					id: group.id,
					title:
						group.id === "archive"
							? "全部文章"
							: group.id === "undated"
								? "日期未记录"
								: group.id,
					url: group.url,
					count: group.items.length,
					state:
						group.url === path.replace(/page\/\d+\/$/, "") ? "current" : "none",
				})),
		};
	const item = index.publicItems.find((item) => item.url === path);
	const record =
		article ??
		(item?.kind === "post"
			? {
					url: item.url,
					type: item.post.data.type,
					topics: item.post.data.topics,
					course: item.post.data.course,
				}
			: item?.kind === "project"
				? {
						url: item.url,
						type: "project" as const,
						topics: item.project.data.topics,
					}
				: undefined);
	const hub: HubId | null = record
		? record.type === "course"
			? "courses"
			: record.type === "paper"
				? "papers"
				: ["log", "idea", "experiment"].includes(record.type)
					? "research"
					: record.type === "project"
						? "projects"
						: null
		: ((["courses", "papers", "research", "projects"] as const).find((h) =>
				path.startsWith(`/${h}/`),
			) ?? null);
	if (!hub)
		return {
			hub: null,
			title: "专题",
			items: Object.values(index.hubs).map((h) => ({
				id: h.id,
				title: h.title,
				url: h.url,
				count: h.items.length,
				state: "none",
			})),
		};
	const groupPath = path.replace(/page\/\d+\/$/, "");
	const courseId =
		hub === "courses"
			? (record?.course?.id ??
				index.hubs.courses.groups.find((g) => g.url === groupPath)?.id)
			: undefined;
	const groups = index.hubs[hub].groups;
	const items: NavItem[] = groups.map((g) => ({
		id: g.id,
		title: g.title,
		url: g.url,
		count: g.items.length,
		state: record
			? hub === "courses" && g.id === courseId
				? "current"
				: hub !== "courses" &&
						(record.topics.includes(g.id) ||
							(!record.topics.length && g.id === "uncategorized"))
					? "related"
					: "none"
			: g.url === groupPath
				? "current"
				: "none",
	}));
	const courseGroup = courseId
		? index.lists[`/courses/${courseId}/`]
		: undefined;
	const titles: Record<HubId, string> = {
		courses: "课程",
		papers: "论文主题",
		research: "研究主题",
		projects: "项目主题",
	};
	return {
		hub,
		title: titles[hub],
		items,
		...(courseGroup
			? {
					course: {
						courseId: courseGroup.id,
						currentSlug:
							record?.url.replace(/^\/notes\//, "").replace(/\/$/, "") ?? "",
						notes: courseGroup.items.flatMap((n) =>
							n.kind === "post" ? [toSummary(n.post)] : [],
						),
					},
				}
			: {}),
	};
}
export type PostInput = NoteRecord & { pinned: boolean; words: number };
export type ProjectInput = {
	entryId: string;
	url: string;
	filePath?: string;
	hasBody: boolean;
	data: ProjectData;
	words: number;
};
export type KnowledgeItem =
	| { kind: "post"; key: string; url: string; post: PostInput }
	| { kind: "project"; key: string; url: string; project: ProjectInput };
export type CollectionGroup = {
	id: string;
	title: string;
	description: string;
	url: string;
	items: KnowledgeItem[];
};
export type HubGroup = CollectionGroup & { groups: CollectionGroup[] };
export type SiteStatsData = {
	articleCount: number;
	categoryCount: number;
	tagCount: number;
	totalWords: number;
	lastActivityISO: string | null;
};
export type KnowledgeIndex = {
	publicItems: KnowledgeItem[];
	hubs: Record<HubId, HubGroup>;
	lists: Record<string, CollectionGroup>;
	stats: SiteStatsData;
};
export type CollectionRoute = {
	url: string;
	group: CollectionGroup;
	page: number;
	items: KnowledgeItem[];
	totalPages: number;
};
export function collectionPageUrl(baseUrl: string, page: number): string {
	return page === 1 ? baseUrl : `${baseUrl}page/${page}/`;
}
export function getCollectionPage(
	group: CollectionGroup,
	page: number,
): CollectionRoute {
	const totalPages = Math.max(1, Math.ceil(group.items.length / 25));
	if (!Number.isInteger(page) || page < 1 || page > totalPages)
		throw new RangeError(`invalid collection page: ${group.url} ${page}`);
	return {
		url: collectionPageUrl(group.url, page),
		group,
		page,
		items: group.items.slice((page - 1) * 25, page * 25),
		totalPages,
	};
}
export function buildCollectionRoutes(
	index: KnowledgeIndex,
): CollectionRoute[] {
	return Object.values(index.lists).flatMap((group) =>
		Array.from(
			{ length: Math.max(1, Math.ceil(group.items.length / 25)) },
			(_, i) => getCollectionPage(group, i + 1),
		),
	);
}

export function isPublicProject(
	project: Pick<ProjectInput, "data" | "hasBody">,
): boolean {
	return project.hasBody && !project.data.draft;
}
export function compareProjectData(a: ProjectData, b: ProjectData): number {
	if (a.order !== undefined || b.order !== undefined) {
		if (a.order === undefined) return 1;
		if (b.order === undefined) return -1;
		if (a.order !== b.order) return b.order - a.order;
	}
	return (
		(b.published?.getTime() ?? Number.NEGATIVE_INFINITY) -
			(a.published?.getTime() ?? Number.NEGATIVE_INFINITY) ||
		a.title.localeCompare(b.title)
	);
}
export function itemTopics(item: KnowledgeItem): string[] {
	return item.kind === "post"
		? item.post.data.topics
		: item.project.data.topics;
}
export function assertKnowledgeCatalog(
	input: { posts: readonly PostInput[]; projects: readonly ProjectInput[] },
	catalog: Catalog,
): void {
	if (catalog.topics.some((t) => t.id === "uncategorized"))
		throw new Error("reserved topic id: uncategorized");
	assertCatalog(input.posts, catalog);
	for (const project of input.projects)
		for (const id of project.data.topics)
			if (!catalog.topics.some((t) => t.id === id))
				throw new Error(`unknown topic ${id}: ${project.entryId}`);
}
export function buildKnowledgeIndex(
	input: { posts: readonly PostInput[]; projects: readonly ProjectInput[] },
	catalog: Catalog,
): KnowledgeIndex {
	assertKnowledgeCatalog(input, catalog);
	const posts: Extract<KnowledgeItem, { kind: "post" }>[] = input.posts
		.filter(isPublicNote)
		.sort(
			(a, b) => Number(b.pinned) - Number(a.pinned) || compareNoteDates(a, b),
		)
		.map((post) => ({
			kind: "post",
			key: `posts:${post.data.id}`,
			url: `/notes/${post.data.slug}/`,
			post,
		}));
	const projects: KnowledgeItem[] = input.projects
		.filter(isPublicProject)
		.sort((a, b) => compareProjectData(a.data, b.data))
		.map((project) => ({
			kind: "project",
			key: `projects:${project.url}`,
			url: project.url,
			project,
		}));
	const publicItems = [
		...new Map(
			[...posts, ...projects].map((item) => [item.key, item]),
		).values(),
	];
	const lists: Record<string, CollectionGroup> = {};
	const postById = new Map(posts.map((p) => [p.post.data.id, p]));
	function group(
		id: string,
		title: string,
		description: string,
		url: string,
		items: KnowledgeItem[],
	): CollectionGroup {
		const result = { id, title, description, url, items };
		lists[url] = result;
		return result;
	}
	const courseGroups = catalog.courses.map((course) => {
		const orderedIds = orderCourseNotes(
			input.posts.filter((p) => p.data.type === "course"),
			course.id,
		).map((n) => n.data.id);
		return group(
			course.id,
			course.title,
			course.description,
			`/courses/${course.id}/`,
			orderedIds.flatMap((id) => {
				const item = postById.get(id);
				return item ? [item] : [];
			}),
		);
	});
	const paperItems = posts.filter(
		(p) => p.kind === "post" && p.post.data.type === "paper",
	);
	const researchItems = posts.filter(
		(p) =>
			p.kind === "post" &&
			["log", "idea", "experiment"].includes(p.post.data.type),
	);
	function topicGroups(
		hub: HubId,
		members: KnowledgeItem[],
	): CollectionGroup[] {
		const result = catalog.topics.flatMap((topic) => {
			const items = members.filter((p) => itemTopics(p).includes(topic.id));
			return items.length
				? [
						group(
							topic.id,
							topic.name,
							topic.description,
							`/${hub}/topics/${topic.id}/`,
							items,
						),
					]
				: [];
		});
		const uncategorized = members.filter((p) => !itemTopics(p).length);
		if (uncategorized.length)
			result.push(
				group(
					"uncategorized",
					"未设置主题",
					"尚未设置研究主题的公开记录。",
					`/${hub}/topics/uncategorized/`,
					uncategorized,
				),
			);
		return result;
	}
	const hubs: Record<HubId, HubGroup> = {
		courses: {
			id: "courses",
			title: "课程",
			description: "按课程与讲次系统阅读。",
			url: "/courses/",
			items: posts.filter(
				(p) => p.kind === "post" && p.post.data.type === "course",
			),
			groups: courseGroups,
		},
		papers: {
			id: "papers",
			title: "论文阅读",
			description: "按研究主题整理的论文阅读与方法理解。",
			url: "/papers/",
			items: paperItems,
			groups: topicGroups("papers", paperItems),
		},
		research: {
			id: "research",
			title: "研究",
			description: "按研究方向整理观察、想法与实验。",
			url: "/research/",
			items: researchItems,
			groups: topicGroups("research", researchItems),
		},
		projects: {
			id: "projects",
			title: "项目",
			description: "公开代码、实验实现与阶段性成果。",
			url: "/projects/",
			items: projects,
			groups: topicGroups("projects", projects),
		},
	};
	group(
		"notes",
		"全部笔记",
		"兼容总览：按课程、主题或全文搜索查找。",
		"/notes/",
		posts,
	);
	for (const [path, type, title] of [
		["logs", "log", "研究日志"],
		["ideas", "idea", "研究想法"],
		["experiments", "experiment", "实验记录"],
	])
		group(
			path,
			title,
			"研究过程中的公开记录。",
			`/research/${path}/`,
			researchItems.filter(
				(p) => p.kind === "post" && p.post.data.type === type,
			),
		);
	for (const topic of catalog.topics)
		group(
			topic.id,
			topic.name,
			topic.description,
			`/topics/${topic.id}/`,
			publicItems.filter((p) => itemTopics(p).includes(topic.id)),
		);
	for (const archive of buildArchiveGroups(publicItems))
		lists[archive.url] = archive;
	const topicIds = new Set<string>();
	const tags = new Set<string>();
	let totalWords = 0;
	let latest = Number.NEGATIVE_INFINITY;
	for (const item of publicItems) {
		for (const id of itemTopics(item)) topicIds.add(id);
		const record = item.kind === "post" ? item.post : item.project;
		for (const tag of record.data.tags ?? [])
			if (tag.trim()) tags.add(tag.trim());
		totalWords += record.words;
		const dates =
			item.kind === "post"
				? [item.post.data.date, item.post.data.updatedAt]
				: [item.project.data.published, item.project.data.updated];
		for (const date of dates) {
			const time =
				date instanceof Date
					? date.getTime()
					: date
						? Date.parse(date)
						: Number.NaN;
			if (Number.isFinite(time)) latest = Math.max(latest, time);
		}
	}
	return {
		publicItems,
		hubs,
		lists,
		stats: {
			articleCount: publicItems.length,
			categoryCount: topicIds.size,
			tagCount: tags.size,
			totalWords,
			lastActivityISO: Number.isFinite(latest)
				? new Date(latest).toISOString()
				: null,
		},
	};
}
