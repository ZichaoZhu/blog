import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";
import { noteDataSchema } from "../../src/content/schema";
import type { NoteRecord, Visibility } from "../../src/utils/note-model";

export interface PaperRef {
	id: string;
	paperKey: string;
	slug: string;
	title: string;
	visibility: Visibility;
	contentKind: "note" | "collection";
	hasBody: boolean;
}
export interface PaperCatalog {
	codeSha: string;
	papers: PaperRef[];
}
export async function buildPaperCatalog(
	contentRoot: string,
	codeSha: string,
): Promise<PaperCatalog> {
	if (!/^[a-f\d]{40}$/.test(codeSha)) throw new Error("Invalid source commit");
	const records = (await readNoteRecords(contentRoot)).filter(
		(note) => note.data.type === "paper",
	);
	if (new Set(records.map((note) => note.data.id)).size !== records.length)
		throw new Error("Duplicate paper ID");
	return {
		codeSha,
		papers: records.map(({ data, hasBody }) => ({
			id: data.id,
			paperKey: createHash("sha256").update(data.id).digest("hex"),
			slug: data.slug,
			title: data.title,
			visibility: data.visibility,
			contentKind: data.contentKind,
			hasBody,
		})),
	};
}

/** Same content schema as Astro, available to build hooks outside astro:content. */
export async function readNoteRecords(
	contentRoot: string,
): Promise<NoteRecord[]> {
	const records: NoteRecord[] = [];
	async function visit(dir: string): Promise<void> {
		for (const entry of await readdir(dir, { withFileTypes: true })) {
			const path = join(dir, entry.name);
			if (entry.isDirectory()) await visit(path);
			else if (entry.isFile() && /\.mdx?$/.test(entry.name)) {
				const parsed = matter(await readFile(path, "utf8"));
				records.push({
					entryId: relative(contentRoot, path),
					data: noteDataSchema.parse(parsed.data),
					hasBody: !!parsed.content.trim(),
				});
			}
		}
	}
	await visit(contentRoot);
	return records;
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	const codeSha = execFileSync("git", ["rev-parse", "HEAD"], {
		encoding: "utf8",
	}).trim();
	const catalog = await buildPaperCatalog(
		join(process.cwd(), "src/content/posts"),
		codeSha,
	);
	const output = join(process.cwd(), "studio/.generated");
	await mkdir(output, { recursive: true });
	await writeFile(join(output, "papers.json"), JSON.stringify(catalog));
	const releaseId = process.env.PAPER_TREE_RELEASE_ID ?? null;
	const jobId = process.env.PAPER_TREE_JOB_ID ?? null;
	if (
		[releaseId, jobId].some(
			(id) => id !== null && !/^[a-f\d-]{36}$/.test(id),
		) ||
		(releaseId === null) !== (jobId === null)
	)
		throw new Error("Invalid Studio version binding");
	await writeFile(
		join(output, "version.json"),
		JSON.stringify({ schemaVersion: 1, codeSha, releaseId, jobId }),
	);
	console.info(
		`Prepared server-only catalog: ${catalog.papers.length} papers, source ${codeSha}`,
	);
}
