import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import matter from "gray-matter";
import { noteDataSchema } from "../../src/content/schema";
import type { NoteRecord } from "../../src/utils/note-model";

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
