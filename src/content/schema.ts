import { z } from "astro/zod";
import type { NoteData } from "../utils/note-model";
export interface ProjectData {
	title: string;
	published?: Date;
	updated?: Date;
	draft: boolean;
	order?: number;
	description: string;
	image: string;
	tags: string[];
	topics: string[];
	link: { label: string; icon: string; value: string }[];
	status: string;
	lang: string;
}
export const projectDataSchema: z.ZodType<ProjectData> = z.object({
	title: z.string(),
	published: z.date().optional(),
	updated: z.date().optional(),
	draft: z.boolean().default(false),
	order: z.number().optional(),
	description: z.string().default(""),
	image: z.string().default(""),
	tags: z.array(z.string()).default([]),
	topics: z.array(z.string()).default([]),
	link: z
		.array(
			z.object({
				label: z.string(),
				icon: z.string().default(""),
				value: z.string(),
			}),
		)
		.default([]),
	status: z.string().default(""),
	lang: z.string().default(""),
});
export interface PostData extends NoteData {
	published?: Date;
	updated?: Date;
	draft: boolean;
	image: string;
	tags: string[];
	category: string | null;
	lang: string;
	pinned: boolean;
	sourceLink: string;
	licenseName: string;
	licenseUrl: string;
	comment: boolean;
	password: string;
	passwordHint: string;
	series: string;
	seriesOrder?: number;
	prevTitle: string;
	prevSlug: string;
	nextTitle: string;
	nextSlug: string;
}
const day = z
	.string()
	.refine(
		(value) =>
			/^\d{4}-\d{2}-\d{2}$/.test(value) &&
			!Number.isNaN(Date.parse(value)) &&
			new Date(value).toISOString().slice(0, 10) === value,
		"Invalid calendar date",
	);
export const noteDataSchema: z.ZodType<PostData> = z
	.object({
		id: z.string().min(1),
		slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
		title: z.string().min(1),
		description: z.string().default(""),
		contentKind: z.enum(["note", "collection"]).default("note"),
		type: z
			.enum(["course", "paper", "log", "idea", "experiment", "note"])
			.default("note"),
		topics: z.array(z.string()).default([]),
		visibility: z.enum(["published", "unlisted", "draft"]).default("published"),
		author: z.string().default("Goongmly"),
		date: day.optional(),
		updatedAt: day.optional(),
		course: z
			.object({
				id: z.string(),
				order: z.number().int().nonnegative().optional(),
			})
			.optional(),
		paper: z
			.object({
				title: z.string().optional(),
				authors: z.array(z.string()).optional(),
				year: z.number().int().optional(),
				venue: z.string().optional(),
				paperUrl: z.url().optional(),
				arxivUrl: z.url().optional(),
				doiUrl: z.url().optional(),
				codeUrl: z.url().optional(),
			})
			.optional(),
		image: z.string().default(""),
		tags: z.array(z.string()).default([]),
		category: z.string().nullable().default(""),
		lang: z.string().default(""),
		pinned: z.boolean().default(false),
		sourceLink: z.string().default(""),
		licenseName: z.string().default(""),
		licenseUrl: z.string().default(""),
		comment: z.boolean().default(false),
		password: z.string().default(""),
		passwordHint: z.string().default(""),
	})
	.transform((d) => ({
		...d,
		published: d.date ? new Date(d.date + "T00:00:00Z") : undefined,
		updated: d.updatedAt ? new Date(d.updatedAt + "T00:00:00Z") : undefined,
		draft: d.visibility === "draft",
		series: d.course?.id ?? "",
		seriesOrder: d.course?.order,
		prevTitle: "",
		prevSlug: "",
		nextTitle: "",
		nextSlug: "",
	}));
