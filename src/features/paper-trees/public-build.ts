import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { readNoteRecords } from "../../../scripts/paper-trees/catalog";
import { isPublicNote, type NoteRecord } from "../../utils/note-model";
import {
	type PublicSnapshot,
	type ReleaseManifest,
	toPublicSnapshot,
	validateDraft,
} from "./model";

export interface PublicTreeInput {
	release: ReleaseManifest;
	snapshots: PublicSnapshot[];
}
const uuid = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
function record(input: unknown): Record<string, unknown> {
	if (!input || typeof input !== "object" || Array.isArray(input))
		throw new Error("Invalid public tree object");
	return input as Record<string, unknown>;
}
function keys(
	input: Record<string, unknown>,
	allowed: readonly string[],
): void {
	if (Object.keys(input).some((key) => !allowed.includes(key)))
		throw new Error("Unexpected field in public tree input");
}
function identifier(input: unknown): string {
	if (typeof input !== "string" || !uuid.test(input))
		throw new Error("Invalid release/snapshot ID");
	return input;
}
function readRelease(input: unknown): ReleaseManifest {
	const raw = record(input);
	keys(raw, [
		"schemaVersion",
		"releaseId",
		"parentReleaseId",
		"codeSha",
		"createdAt",
		"entries",
	]);
	if (
		raw.schemaVersion !== 1 ||
		typeof raw.codeSha !== "string" ||
		!/^[a-f\d]{40}$/.test(raw.codeSha) ||
		typeof raw.createdAt !== "string" ||
		!Number.isFinite(Date.parse(raw.createdAt))
	)
		throw new Error("Invalid release manifest");
	const entries = Object.fromEntries(
		Object.entries(record(raw.entries)).map(([paperId, snapshotId]) => [
			paperId,
			identifier(snapshotId),
		]),
	);
	if (new Set(Object.values(entries)).size !== Object.keys(entries).length)
		throw new Error("A snapshot cannot belong to multiple papers");
	return {
		schemaVersion: 1,
		releaseId: identifier(raw.releaseId),
		parentReleaseId:
			raw.parentReleaseId === null ? null : identifier(raw.parentReleaseId),
		codeSha: raw.codeSha,
		createdAt: raw.createdAt,
		entries,
	};
}
function readSnapshot(input: unknown): PublicSnapshot {
	const raw = record(input);
	keys(raw, ["schemaVersion", "snapshotId", "paperId", "publishedAt", "tree"]);
	const tree = record(raw.tree);
	keys(tree, ["nodeData", "direction"]);
	function nodeKeys(input: unknown): void {
		const node = record(input);
		keys(node, [
			"id",
			"topic",
			"note",
			"hyperLink",
			"expanded",
			"children",
			"style",
		]);
		if (Array.isArray(node.children))
			for (const child of node.children) nodeKeys(child);
	}
	// Structural validation first caps recursion at 32 before checking field names.
	const draft = validateDraft(
		{
			schemaVersion: raw.schemaVersion,
			paperId: raw.paperId,
			templateId: null,
			updatedAt: raw.publishedAt,
			tree,
		},
		String(raw.paperId),
	);
	nodeKeys(tree.nodeData);
	return toPublicSnapshot(
		draft,
		identifier(raw.snapshotId),
		String(raw.publishedAt),
	);
}
function validateInput(input: unknown): PublicTreeInput {
	const raw = record(input);
	keys(raw, ["release", "snapshots"]);
	if (!Array.isArray(raw.snapshots))
		throw new Error("Missing public snapshots");
	const snapshots = raw.snapshots.map(readSnapshot);
	if (new Set(snapshots.map((s) => s.snapshotId)).size !== snapshots.length)
		throw new Error("Duplicate snapshot ID");
	return { release: readRelease(raw.release), snapshots };
}
export function loadPublicTrees(
	input: unknown,
	notes: readonly NoteRecord[],
): Map<string, PublicSnapshot> {
	const clean = validateInput(input);
	const byId = new Map(
		clean.snapshots.map((snapshot) => [snapshot.snapshotId, snapshot]),
	);
	const papers = new Set(
		notes
			.filter((note) => note.data.type === "paper" && isPublicNote(note))
			.map((note) => note.data.id),
	);
	const result = new Map<string, PublicSnapshot>();
	for (const [paperId, snapshotId] of Object.entries(clean.release.entries)) {
		const snapshot = byId.get(snapshotId);
		if (!snapshot || snapshot.paperId !== paperId)
			throw new Error("Missing or mismatched release snapshot");
		if (papers.has(paperId)) result.set(paperId, snapshot);
	}
	return result;
}
export async function readPublicTreeInput(
	dir: string | undefined,
	enabled: boolean,
	_mode: "preview" | "production",
): Promise<PublicTreeInput | null> {
	if (!enabled) return null;
	const root = resolve(dir ?? ".paper-trees/public-input");
	const release = readRelease(
		JSON.parse(await readFile(join(root, "release.json"), "utf8")),
	);
	let snapshotIds: unknown = Object.values(release.entries);
	try {
		snapshotIds = JSON.parse(
			await readFile(join(root, "snapshot-ids.json"), "utf8"),
		);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
	}
	if (
		!Array.isArray(snapshotIds) ||
		new Set(snapshotIds).size !== snapshotIds.length
	)
		throw new Error("Invalid explicit snapshot file list");
	const snapshots = await Promise.all(
		snapshotIds.map(async (id) =>
			readSnapshot(
				JSON.parse(
					await readFile(
						join(root, "snapshots", `${identifier(id)}.json`),
						"utf8",
					),
				),
			),
		),
	);
	return validateInput({ release, snapshots });
}
export async function emitPublicTrees(
	dir: string,
	input: PublicTreeInput,
	notes: readonly NoteRecord[],
): Promise<void> {
	loadPublicTrees(input, notes);
	const clean = validateInput(input);
	const publicIds = new Set(
		notes
			.filter((note) => note.data.type === "paper" && isPublicNote(note))
			.map((note) => note.data.id),
	);
	const folder = join(dir, "paper-trees", "snapshots");
	await mkdir(folder, { recursive: true });
	for (const snapshot of clean.snapshots)
		if (publicIds.has(snapshot.paperId))
			await writeFile(
				join(folder, `${snapshot.snapshotId}.json`),
				JSON.stringify(snapshot),
			);
	await writeFile(
		join(dir, "paper-trees", "release.json"),
		JSON.stringify({
			schemaVersion: 1,
			releaseId: clean.release.releaseId,
			codeSha: clean.release.codeSha,
			publishedAt: clean.release.createdAt,
		}),
	);
}
export function treeHeading(headings: readonly { slug: string }[]): {
	depth: 2;
	slug: string;
	text: string;
} {
	const used = new Set(headings.map((heading) => heading.slug));
	let slug = "paper-analysis-tree";
	let index = 2;
	while (used.has(slug)) slug = `paper-analysis-tree-${index++}`;
	return { depth: 2, slug, text: "论文解析树" };
}
export function studioEditorUrl(
	origin: string | undefined,
	paperId: string,
): string | null {
	if (!origin) return null;
	const url = new URL(origin);
	if (
		url.protocol !== "https:" ||
		url.username ||
		url.password ||
		url.pathname !== "/" ||
		url.search ||
		url.hash
	)
		throw new Error("Studio origin must be an HTTPS origin");
	const paperKey = createHash("sha256").update(paperId).digest("hex");
	return new URL(`/studio/paper-trees/${paperKey}/`, url).href;
}
export async function getPublishedTree(
	paperId: string,
	notes: readonly NoteRecord[],
): Promise<PublicSnapshot | undefined> {
	const input = await readPublicTreeInput(
		process.env.PAPER_TREE_INPUT_DIR,
		process.env.PAPER_TREES_ENABLED === "true" ||
			process.env.PAPER_TREES_ENABLED === "1",
		process.env.PUBLIC_SITE_MODE === "production" ? "production" : "preview",
	);
	return input ? loadPublicTrees(input, notes).get(paperId) : undefined;
}
export function paperTreesIntegration(): AstroIntegration {
	let root = process.cwd();
	return {
		name: "paper-trees-public",
		hooks: {
			"astro:config:done": ({ config }) => {
				root = fileURLToPath(config.root);
			},
			"astro:build:start": async () => {
				await readPublicTreeInput(
					process.env.PAPER_TREE_INPUT_DIR,
					process.env.PAPER_TREES_ENABLED === "true" ||
						process.env.PAPER_TREES_ENABLED === "1",
					process.env.PUBLIC_SITE_MODE === "production"
						? "production"
						: "preview",
				);
			},
			"astro:build:done": async ({ dir }) => {
				const input = await readPublicTreeInput(
					process.env.PAPER_TREE_INPUT_DIR,
					process.env.PAPER_TREES_ENABLED === "true" ||
						process.env.PAPER_TREES_ENABLED === "1",
					process.env.PUBLIC_SITE_MODE === "production"
						? "production"
						: "preview",
				);
				if (input)
					await emitPublicTrees(
						fileURLToPath(dir),
						input,
						await readNoteRecords(join(root, "src/content/posts")),
					);
			},
		},
	};
}
