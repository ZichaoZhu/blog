import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	cp,
	mkdir,
	mkdtemp,
	readdir,
	readFile,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import matter from "gray-matter";
import {
	type ReleaseManifest,
	toPublicSnapshot,
} from "../src/features/paper-trees/model";
import { createPaperTree } from "../src/features/paper-trees/template";

const source = process.cwd();
const dest = await mkdtemp(join(tmpdir(), "firefly-paper-trees-"));
const excluded = new Set([
	"node_modules",
	".git",
	".worktrees",
	".superpowers",
	".paper-trees",
	".vercel",
	".astro",
	"dist",
	"test-results",
	"playwright-report",
	".agents",
	".codex",
	".next",
]);
try {
	await cp(source, dest, {
		recursive: true,
		filter: (path) => {
			const rel = relative(source, path);
			return (
				!rel ||
				(!rel.split("/").some((segment) => excluded.has(segment)) &&
					!/^\.env(?!\.example)/.test(rel))
			);
		},
	});
	await symlink(
		resolve(source, "node_modules"),
		join(dest, "node_modules"),
		"dir",
	);
	const input = join(dest, ".paper-trees/public-input");
	await mkdir(join(input, "snapshots"), { recursive: true });
	const fixtures = [
		{
			id: "tree-fixture",
			type: "paper",
			visibility: "published",
			title: "Paper Tree Fixture",
			snapshotId: "c8e2da5d-545e-4ed1-944c-9d54e91b8488",
			note: "PublicTreeReadingSentinel",
		},
		{
			id: "unlisted-tree-fixture",
			type: "paper",
			visibility: "unlisted",
			title: "Unlisted paper fixture",
			snapshotId: "773b77a0-b633-4d5e-bcf5-bdb1be74d718",
			note: "UnlistedTreeSentinel",
		},
		{
			id: "draft-tree-fixture",
			type: "paper",
			visibility: "draft",
			title: "Private paper fixture",
			snapshotId: "c6037e6e-371b-4af0-bc08-7b918d6f648f",
			note: "PrivateTreeDraftSentinel",
		},
		{
			id: "ordinary-tree-fixture",
			type: "note",
			visibility: "published",
			title: "Ordinary fixture",
			snapshotId: "cbef81c6-c75c-45c6-9446-d6f8e6fc8a86",
			note: "NonPaperTreeSentinel",
		},
		{
			id: "no-tree-fixture",
			type: "paper",
			visibility: "published",
			title: "Paper without tree",
		},
	];
	const release: ReleaseManifest = {
		schemaVersion: 1,
		releaseId: "945c8e01-c1cd-4e07-812b-2e411da177e8",
		parentReleaseId: null,
		codeSha: "a".repeat(40),
		createdAt: "2026-10-08T01:00:00.000Z",
		entries: {},
	};
	for (const fixture of fixtures) {
		await writeFile(
			join(dest, "src/content/posts", `${fixture.id}.md`),
			matter.stringify("## Paper Analysis Tree\n\nFixture article body.\n", {
				id: fixture.id,
				slug: fixture.id,
				title: fixture.title,
				type: fixture.type,
				contentKind: "note",
				visibility: fixture.visibility,
				date: "2026-10-08",
				author: "Goongmly",
				topics: ["robotics"],
				description: "A synthetic paper used only in an isolated test copy.",
			}),
		);
		if (!fixture.snapshotId) continue;
		const draft = createPaperTree(fixture.id, "template");
		assert.ok(draft.tree.nodeData.children);
		draft.tree.nodeData.children[0].note = fixture.note;
		const deep = draft.tree.nodeData.children[2].children?.[1].children?.[0];
		assert.ok(deep);
		deep.note = "DeepPublicNodeSentinel";
		const snapshot = toPublicSnapshot(
			draft,
			fixture.snapshotId,
			release.createdAt,
		);
		await writeFile(
			join(input, "snapshots", `${fixture.snapshotId}.json`),
			JSON.stringify(snapshot),
		);
		release.entries[fixture.id] = fixture.snapshotId;
	}
	await writeFile(join(input, "release.json"), JSON.stringify(release));
	// These unrelated files must never be read or copied into the public build.
	await mkdir(join(input, "drafts"));
	await writeFile(
		join(input, "drafts", "private.json"),
		"PrivateTreeDraftSentinel",
	);
	await writeFile(
		join(input, "snapshots", "unknown-failed.json"),
		"FailedTreeSentinel",
	);
	const env = {
		...process.env,
		PAPER_TREES_ENABLED: "true",
		PAPER_TREE_INPUT_DIR: input,
		PUBLIC_SITE_MODE: "preview",
		SITE_MODE: "preview",
		PUBLIC_SITE_ORIGIN: "http://127.0.0.1:4324",
		PUBLIC_PAPER_TREE_STUDIO_ORIGIN: "",
		ASTRO_PREVIEW_BACKGROUND: "1",
		ASTRO_DEV_BACKGROUND: "1",
		WRANGLER_LOG_PATH: join(dest, "wrangler.log"),
		COREPACK_ENABLE_AUTO_PIN: "0",
	};
	const build = spawnSync(
		"pnpm",
		["--config.verify-deps-before-run=warn", "build"],
		{ cwd: dest, env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
	);
	await writeFile(
		join(dest, "build.log"),
		(build.stdout ?? "") + (build.stderr ?? ""),
	);
	if (build.status !== 0)
		throw new Error(
			`Isolated tree build failed:\n${((build.stdout ?? "") + (build.stderr ?? "")).slice(-12000)}`,
		);
	async function scan(dir: string): Promise<void> {
		for (const item of await readdir(dir, { withFileTypes: true })) {
			const path = join(dir, item.name);
			if (item.isDirectory()) await scan(path);
			else {
				const bytes = await readFile(path);
				for (const secret of [
					"PrivateTreeDraftSentinel",
					"UnlistedTreeSentinel",
					"FailedTreeSentinel",
					"NonPaperTreeSentinel",
				])
					assert.equal(
						bytes.includes(Buffer.from(secret)),
						false,
						`Private tree text in ${relative(dest, path)}`,
					);
			}
		}
	}
	await scan(join(dest, "dist"));
	const html = await readFile(
		join(dest, "dist/notes/tree-fixture/index.html"),
		"utf8",
	);
	assert.ok(html.includes("PublicTreeReadingSentinel"));
	assert.ok(html.includes("DeepPublicNodeSentinel"));
	assert.ok(html.includes('id="paper-analysis-tree-2"'));
	assert.ok(
		html.includes(
			'data-paper-tree-snapshot="c8e2da5d-545e-4ed1-944c-9d54e91b8488"',
		),
	);
	assert.deepEqual(await readdir(join(dest, "dist/paper-trees/snapshots")), [
		"c8e2da5d-545e-4ed1-944c-9d54e91b8488.json",
	]);
	const args = process.argv.slice(2).filter((arg) => arg !== "--");
	const tests = spawnSync(
		"pnpm",
		[
			"exec",
			"playwright",
			"test",
			"--config",
			"playwright.paper-trees.config.ts",
			...args,
		],
		{
			cwd: source,
			env: { ...env, PAPER_TREE_TEST_DIR: dest },
			stdio: "inherit",
		},
	);
	if (tests.status !== 0)
		throw new Error("Paper tree browser acceptance failed");
	console.log(
		"Public tree build, privacy scan, searchable outline and browser acceptance passed",
	);
} finally {
	if (process.env.PAPER_TREE_KEEP_TEST_COPY === "1")
		console.log(`Retained isolated test copy: ${dest}`);
	else await rm(dest, { recursive: true, force: true });
}
