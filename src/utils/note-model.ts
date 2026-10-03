export type NoteType =
	| "course"
	| "paper"
	| "log"
	| "idea"
	| "experiment"
	| "note";
export type Visibility = "published" | "unlisted" | "draft";
export interface CourseDefinition {
	id: string;
	title: string;
	description: string;
	sourcePrefix: string;
	topic: string;
	introPath?: string;
}
export interface TopicDefinition {
	id: string;
	name: string;
	description: string;
}
export interface NoteData {
	id: string;
	slug: string;
	title: string;
	description: string;
	contentKind: "note" | "collection";
	type: NoteType;
	topics: string[];
	visibility: Visibility;
	author: string;
	date?: string;
	updatedAt?: string;
	course?: { id: string; order?: number };
	paper?: {
		title?: string;
		authors?: string[];
		year?: number;
		venue?: string;
		paperUrl?: string;
		arxivUrl?: string;
		doiUrl?: string;
		codeUrl?: string;
	};
	tags?: string[];
	category?: string | null;
	image?: string;
}
export interface NoteRecord {
	entryId: string;
	data: NoteData;
	hasBody: boolean;
}
export interface NoteSummary {
	id: string;
	slug: string;
	url: string;
	title: string;
	description: string;
	type: NoteType;
	topics: string[];
	date?: string;
	updatedAt?: string;
	course?: NoteData["course"];
}
export interface Catalog {
	courses: CourseDefinition[];
	topics: TopicDefinition[];
}
export function isPublicNote(note: NoteRecord): boolean {
	return (
		note.hasBody &&
		note.data.contentKind === "note" &&
		note.data.visibility === "published"
	);
}
export function getPublicNotes(notes: readonly NoteRecord[]): NoteRecord[] {
	return notes.filter(isPublicNote);
}
export function getFeedNotes(notes: readonly NoteRecord[]): NoteRecord[] {
	return getPublicNotes(notes).filter((n) => !!n.data.date);
}
export function getRoutableNotes(notes: readonly NoteRecord[]): NoteRecord[] {
	return notes.filter(
		(n) =>
			n.hasBody &&
			n.data.contentKind === "note" &&
			n.data.visibility !== "draft",
	);
}
export function compareNoteDates(a: NoteRecord, b: NoteRecord): number {
	return (
		(b.data.date ?? "").localeCompare(a.data.date ?? "") ||
		a.data.slug.localeCompare(b.data.slug)
	);
}
export function toSummary(note: NoteRecord): NoteSummary {
	const {
		id,
		slug,
		title,
		description,
		type,
		topics,
		date,
		updatedAt,
		course,
	} = note.data;
	return {
		id,
		slug,
		url: `/notes/${slug}/`,
		title,
		description,
		type,
		topics,
		date,
		updatedAt,
		course,
	};
}
export function assertCatalog(
	notes: readonly NoteRecord[],
	catalog: Catalog,
): void {
	const ids = new Set<string>();
	const slugs = new Set<string>();
	const orders = new Set<string>();
	for (const note of notes) {
		const d = note.data;
		const where = note.entryId;
		if (ids.has(d.id) || slugs.has(d.slug))
			throw new Error(`duplicate id/slug: ${where}`);
		ids.add(d.id);
		slugs.add(d.slug);
		for (const id of d.topics)
			if (!catalog.topics.some((t) => t.id === id))
				throw new Error(`unknown topic ${id}: ${where}`);
		if (d.course) {
			if (!catalog.courses.some((c) => c.id === d.course?.id))
				throw new Error(`unknown course ${d.course.id}: ${where}`);
			if (d.course.order !== undefined) {
				const key = `${d.course.id}:${d.course.order}`;
				if (
					!Number.isInteger(d.course.order) ||
					d.course.order < 0 ||
					orders.has(key)
				)
					throw new Error(`invalid/duplicate course order ${key}: ${where}`);
				orders.add(key);
			}
		}
	}
}
export function orderCourseNotes(
	notes: readonly NoteRecord[],
	courseId: string,
): NoteRecord[] {
	return getPublicNotes(notes)
		.filter((n) => n.data.course?.id === courseId)
		.sort(
			(a, b) =>
				(a.data.course?.order ?? Number.POSITIVE_INFINITY) -
					(b.data.course?.order ?? Number.POSITIVE_INFINITY) ||
				a.data.slug.localeCompare(b.data.slug),
		);
}
export function getCourseNeighbors(
	notes: readonly NoteRecord[],
	slug: string,
): { previous?: NoteSummary; next?: NoteSummary } {
	const current = notes.find((n) => n.data.slug === slug && isPublicNote(n));
	if (!current?.data.course) return {};
	const ordered = orderCourseNotes(notes, current.data.course.id);
	const index = ordered.findIndex((n) => n.data.slug === slug);
	return {
		previous: index > 0 ? toSummary(ordered[index - 1]) : undefined,
		next:
			index < ordered.length - 1 ? toSummary(ordered[index + 1]) : undefined,
	};
}
export function paginateNotes(
	notes: readonly NoteSummary[],
	page: number,
	pageSize = 25,
): { items: NoteSummary[]; totalPages: number } {
	const totalPages = Math.max(1, Math.ceil(notes.length / pageSize));
	if (
		!Number.isInteger(page) ||
		page < 1 ||
		page > totalPages ||
		!Number.isInteger(pageSize) ||
		pageSize < 1
	)
		throw new RangeError("Invalid page or page size");
	return {
		items: notes.slice((page - 1) * pageSize, page * pageSize),
		totalPages,
	};
}
