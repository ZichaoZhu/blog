import { type CollectionEntry, getCollection, render } from "astro:content";
import { courses, topics } from "../data/catalog";
import {
	assertKnowledgeCatalog,
	buildKnowledgeIndex,
	isPublicProject,
	type KnowledgeIndex,
	type PostInput,
	type ProjectInput,
} from "./knowledge-model";
import { assertCatalog, isPublicNote } from "./note-model";
import { removeFileExtension } from "./url-utils";

async function words(
	entry: CollectionEntry<"posts"> | CollectionEntry<"projects">,
): Promise<number> {
	const count = (await render(entry)).remarkPluginFrontmatter.words;
	if (typeof count !== "number" || !Number.isFinite(count) || count < 0)
		throw new Error(`missing reading word count: ${entry.id}`);
	return count;
}
async function loadIndex(): Promise<KnowledgeIndex> {
	const [posts, projects] = await Promise.all([
		getCollection("posts"),
		getCollection("projects"),
	]);
	const noteInputs: PostInput[] = posts.map((p) => ({
		entryId: p.filePath ?? p.id,
		data: p.data,
		hasBody: !!p.body?.trim(),
		pinned: p.data.pinned,
		words: 0,
	}));
	assertCatalog(noteInputs, { courses, topics });
	const projectInputs: ProjectInput[] = projects.map((p) => ({
		entryId: p.id,
		url: `/projects/${removeFileExtension(p.id)}/`,
		filePath: p.filePath,
		data: p.data,
		hasBody: !!p.body?.trim(),
		words: 0,
	}));
	// Validate references before rendering any body, including unpublished entries.
	assertKnowledgeCatalog(
		{ posts: noteInputs, projects: projectInputs },
		{ courses, topics },
	);
	await Promise.all(
		noteInputs.map(async (p, i) => {
			if (isPublicNote(p)) p.words = await words(posts[i]);
		}),
	);
	await Promise.all(
		projectInputs.map(async (p, i) => {
			if (isPublicProject(p)) p.words = await words(projects[i]);
		}),
	);
	return buildKnowledgeIndex(
		{ posts: noteInputs, projects: projectInputs },
		{ courses, topics },
	);
}
let buildIndex: Promise<KnowledgeIndex> | undefined;
export function getKnowledgeIndex(): Promise<KnowledgeIndex> {
	if (import.meta.env.DEV) return loadIndex();
	if (!buildIndex) buildIndex = loadIndex();
	return buildIndex;
}
