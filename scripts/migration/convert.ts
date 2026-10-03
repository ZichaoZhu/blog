import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	copyFile,
	mkdir,
	readdir,
	readFile,
	writeFile,
} from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";
import { noteDataSchema } from "../../src/content/schema";
import { classifyContent, courses, topics } from "../../src/data/catalog";
import { assertCatalog, type NoteData } from "../../src/utils/note-model";
export interface MigrationRecord extends NoteData {
	sourcePath: string;
	targetPath: string;
	hasBody: boolean;
	bodySha256: string;
	legacyPath: string;
	canonicalPath: string;
	anchorAliases: Record<string, string>;
}
export interface AssetRecord {
	sourcePath: string;
	sha256: string;
	width: number;
	height: number;
	publishedVariants: { url: string; width: number }[];
}
export interface MigrationManifest {
	version: 1;
	sourceHead: string;
	records: MigrationRecord[];
	assets: AssetRecord[];
}
export function bodyOf(raw: string): string {
	return raw.replace(
		/^(?:\uFEFF)?---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/,
		"",
	);
}
export function sha256(bytes: Buffer | string): string {
	return createHash("sha256").update(bytes).digest("hex");
}
async function filesUnder(root: string): Promise<string[]> {
	const result: string[] = [];
	for (const entry of await readdir(root, { withFileTypes: true })) {
		if (entry.name.startsWith(".")) continue;
		const p = resolve(root, entry.name);
		if (entry.isDirectory()) result.push(...(await filesUnder(p)));
		else result.push(p);
	}
	return result.sort();
}
export async function buildManifest(
	sourceRoot: string,
): Promise<MigrationManifest> {
	const source = resolve(sourceRoot, "content/posts");
	const records: MigrationRecord[] = [];
	const assets: AssetRecord[] = [];
	for (const file of await filesUnder(source)) {
		const sourcePath = relative(source, file).replaceAll("\\", "/");
		const bytes = await readFile(file);
		if (file.endsWith(".png")) {
			if (
				bytes
					.toString("utf8", 0, 70)
					.startsWith("version https://git-lfs.github.com/spec/v1")
			)
				throw new Error(`LFS pointer: ${sourcePath}`);
			if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a")
				throw new Error(`Invalid PNG: ${sourcePath}`);
			assets.push({
				sourcePath,
				sha256: sha256(bytes),
				width: bytes.readUInt32BE(16),
				height: bytes.readUInt32BE(20),
				publishedVariants: [],
			});
			continue;
		}
		if (!/\.mdx?$/.test(file)) continue;
		const raw = bytes.toString();
		const body = bodyOf(raw);
		const data = matter(raw).data;
		const key = sourcePath.replace(/\.mdx?$/, "").replace(/\/index$/, "");
		const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
		const fallback = classifyContent(
			key,
			tags,
			data.title || key.split("/").at(-1) || key,
		);
		const date = (value: unknown): string | undefined =>
			value instanceof Date
				? value.toISOString().slice(0, 10)
				: typeof value === "string" && value
					? value
					: undefined;
		const description =
			typeof data.description === "string"
				? data.description
				: (fallback.summary ??
					body
						.replace(/```[\s\S]*?```/g, " ")
						.replace(/<[^>]+>/g, " ")
						.replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
						.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
						.replace(/[#>*_`~=$^|]/g, " ")
						.replace(/\s+/g, " ")
						.trim()
						.slice(0, 150));
		const parsed = noteDataSchema.parse({
			...data,
			id: data.id ?? fallback.slug,
			slug: data.slug ?? fallback.slug,
			title: fallback.title,
			description,
			contentKind: fallback.contentKind,
			type: data.type ?? fallback.noteType,
			topics: data.topics ?? fallback.topics,
			visibility: data.draft
				? "draft"
				: (data.visibility ?? fallback.visibility),
			author: data.author ?? "zhuzichao",
			date: date(data.date),
			updatedAt: date(data.updatedAt),
			tags,
			category: data.category ?? "未分类",
			image: data.coverImage ?? "",
			course:
				data.course ??
				(fallback.courseId
					? { id: fallback.courseId, order: fallback.order }
					: undefined),
		});
		const {
			published,
			updated,
			draft,
			series,
			seriesOrder,
			prevTitle,
			prevSlug,
			nextTitle,
			nextSlug,
			...normalized
		} = parsed;
		records.push({
			...normalized,
			sourcePath,
			targetPath: sourcePath,
			hasBody: body.trim().length > 0,
			bodySha256: sha256(body),
			legacyPath: `/blog/${key}/`,
			canonicalPath:
				fallback.contentKind === "collection"
					? fallback.courseId
						? `/courses/${fallback.courseId}/`
						: key === "Paper-Reading"
							? "/papers/"
							: key === "Reaserch_Note"
								? "/research/"
								: "/courses/"
					: body.trim()
						? `/notes/${parsed.slug}/`
						: `/courses/${parsed.course?.id ?? ""}/`,
			anchorAliases: {},
		});
	}
	assertCatalog(
		records.map((r) => ({
			entryId: r.sourcePath,
			data: r,
			hasBody: r.hasBody,
		})),
		{ courses, topics },
	);
	return {
		version: 1,
		sourceHead: execFileSync("git", ["rev-parse", "HEAD"], {
			cwd: sourceRoot,
			encoding: "utf8",
		}).trim(),
		records,
		assets,
	};
}
export async function convertContent(
	manifest: MigrationManifest,
	options: {
		sourceRoot: string;
		targetRoot: string;
		selectedPaths?: string[];
		dryRun: boolean;
	},
): Promise<{ written: string[]; unchanged: string[] }> {
	const written: string[] = [];
	const unchanged: string[] = [];
	const selected = options.selectedPaths
		? new Set(options.selectedPaths)
		: null;
	if (selected)
		for (const path of selected)
			if (!manifest.records.some((r) => r.sourcePath === path))
				throw new Error(`Unknown selected source: ${path}`);
	for (const record of manifest.records) {
		if (selected && !selected.has(record.sourcePath)) continue;
		const raw = await readFile(
			resolve(options.sourceRoot, "content/posts", record.sourcePath),
			"utf8",
		);
		const body = bodyOf(raw);
		if (sha256(body) !== record.bodySha256)
			throw new Error(`Source changed since manifest: ${record.sourcePath}`);
		const {
			sourcePath,
			targetPath,
			hasBody,
			bodySha256,
			legacyPath,
			canonicalPath,
			anchorAliases,
			...data
		} = record;
		const output = `---\n${Object.entries({
			...data,
			migrationSource: sourcePath,
		})
			.filter(([, v]) => v !== undefined)
			.map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
			.join("\n")}\n---\n${body}`;
		const target = resolve(options.targetRoot, targetPath);
		let existing = "";
		try {
			existing = await readFile(target, "utf8");
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
		}
		if (existing === output) {
			unchanged.push(targetPath);
			continue;
		}
		written.push(targetPath);
		if (!options.dryRun) {
			await mkdir(dirname(target), { recursive: true });
			await writeFile(target, output);
		}
	}
	if (!options.dryRun)
		for (const asset of manifest.assets) {
			if (
				selected &&
				!manifest.records.some(
					(r) =>
						selected.has(r.sourcePath) &&
						asset.sourcePath.startsWith(dirname(r.sourcePath) + "/"),
				)
			)
				continue;
			const bytes = await readFile(
				resolve(options.sourceRoot, "content/posts", asset.sourcePath),
			);
			if (sha256(bytes) !== asset.sha256)
				throw new Error(`Source asset changed: ${asset.sourcePath}`);
			const target = resolve(options.targetRoot, asset.sourcePath);
			await mkdir(dirname(target), { recursive: true });
			await copyFile(
				resolve(options.sourceRoot, "content/posts", asset.sourcePath),
				target,
			);
		}
	return { written, unchanged };
}
if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
	const args = process.argv.slice(2);
	const value = (key: string) => args[args.indexOf(key) + 1];
	if (!args.includes("--source-root") || !args.includes("--target-root"))
		throw new Error("Required --source-root and --target-root");
	const manifest = await buildManifest(value("--source-root"));
	const result = await convertContent(manifest, {
		sourceRoot: value("--source-root"),
		targetRoot: value("--target-root"),
		dryRun: !args.includes("--apply"),
		selectedPaths: args.includes("--select")
			? value("--select").split(",")
			: undefined,
	});
	if (args.includes("--apply")) {
		await mkdir("migration", { recursive: true });
		await writeFile(
			"migration/manifest.json",
			JSON.stringify(manifest, null, 2) + "\n",
		);
	}
	console.log(
		JSON.stringify({
			records: manifest.records.length,
			assets: manifest.assets.length,
			...result,
		}),
	);
}
