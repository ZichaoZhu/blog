import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
	cp,
	mkdir,
	mkdtemp,
	readdir,
	readFile,
	rm,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import matter from "gray-matter";
import {
	type ReleaseManifest,
	toPublicSnapshot,
} from "../src/features/paper-trees/model";
import { createPaperTree } from "../src/features/paper-trees/template";
import { buildPaperCatalog } from "./paper-trees/catalog";
import { assertPublicArtifacts } from "./paper-trees/verify-output";

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
	".generated",
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
	// Physical workspace dependencies let the adapter trace exactly what it deploys.
	const install = spawnSync(
		"pnpm",
		["install", "--frozen-lockfile", "--offline"],
		{
			cwd: dest,
			env: { ...process.env, CI: "true" },
			encoding: "utf8",
			maxBuffer: 16 * 1024 * 1024,
		},
	);
	assert.equal(
		install.status,
		0,
		`Isolated dependency install failed: ${((install.stdout ?? "") + (install.stderr ?? "")).slice(-6000)}`,
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
	for (let i = 0; i < 499; i++)
		fixtures.push({
			id: `scale-paper-${i}`,
			type: "paper",
			visibility: "published",
			title: `Scale Paper ${i}`,
			snapshotId: randomUUID(),
			note: `ScaleNodeSentinel${i}`,
		});
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
				date: fixture.id.startsWith("scale-paper-")
					? "2026-10-07"
					: "2026-10-08",
				author: "Goongmly",
				topics: ["robotics"],
				description: "A synthetic paper used only in an isolated test copy.",
			}),
		);
		if (!fixture.snapshotId) continue;
		const scale = fixture.id.startsWith("scale-paper-");
		const draft = createPaperTree(fixture.id, scale ? "empty" : "template");
		if (scale) {
			draft.tree.nodeData.topic = fixture.title;
			draft.tree.nodeData.note = fixture.note;
		} else {
			assert.ok(draft.tree.nodeData.children);
			draft.tree.nodeData.children[0].note = fixture.note;
			const deep = draft.tree.nodeData.children[2].children?.[1].children?.[0];
			assert.ok(deep);
			deep.note = "DeepPublicNodeSentinel";
		}
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
	await assertPublicArtifacts(join(dest, "dist"), [
		"PrivateTreeDraftSentinel",
		"UnlistedTreeSentinel",
		"FailedTreeSentinel",
		"NonPaperTreeSentinel",
		"PrivateStudioCatalogSentinel",
	]);
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
	assert.equal(
		(await readdir(join(dest, "dist/paper-trees/snapshots"))).length,
		500,
	);
	for (let i = 0; i < 499; i++)
		assert.equal(
			html.includes(`ScaleNodeSentinel${i}`),
			false,
			"Article serialized another paper's tree",
		);
	const scaleHtml = await readFile(
		join(dest, "dist/notes/scale-paper-0/index.html"),
		"utf8",
	);
	assert.ok(scaleHtml.includes("ScaleNodeSentinel0"));
	assert.equal(scaleHtml.includes("ScaleNodeSentinel498"), false);
	assert.ok(Buffer.byteLength(html) < 512 * 1024);
	// Build a real SSR Studio with a synthetic private catalog, then scan only its client output.
	await mkdir(join(dest, "studio/.generated"), { recursive: true });
	const studioCatalog = await buildPaperCatalog(
		join(dest, "src/content/posts"),
		release.codeSha,
	);
	studioCatalog.papers.push({
		id: "studio-private",
		paperKey: "f".repeat(64),
		slug: "studio-private",
		title: "PrivateStudioCatalogSentinel",
		visibility: "draft",
		contentKind: "note",
		hasBody: true,
	});
	await writeFile(
		join(dest, "studio/.generated/papers.json"),
		JSON.stringify(studioCatalog),
	);
	await writeFile(
		join(dest, "studio/.generated/version.json"),
		JSON.stringify({
			schemaVersion: 1,
			codeSha: release.codeSha,
			releaseId: null,
			jobId: null,
		}),
	);
	const studioBuild = spawnSync("pnpm", ["--dir", "studio", "build"], {
		cwd: dest,
		env,
		encoding: "utf8",
		maxBuffer: 16 * 1024 * 1024,
	});
	await writeFile(
		join(dest, "studio-build.log"),
		(studioBuild.stdout ?? "") + (studioBuild.stderr ?? ""),
	);
	if (studioBuild.status !== 0)
		throw new Error(
			`Isolated Studio build failed: ${((studioBuild.stdout ?? "") + (studioBuild.stderr ?? "")).slice(-6000)}`,
		);
	const studioRuntime = spawnSync(
		process.execPath,
		[
			"--no-experimental-require-module",
			"--test",
			join(source, "tests/integration/paper-tree-studio-runtime.test.mjs"),
		],
		{
			cwd: source,
			env: {
				...env,
				NODE_PATH: "",
				NODE_OPTIONS: "",
				PAPER_TREE_STUDIO_OUTPUT_DIR: join(dest, "studio/.vercel/output"),
			},
			stdio: "inherit",
		},
	);
	assert.equal(
		studioRuntime.status,
		0,
		"Built Studio runtime acceptance failed",
	);
	const studioStatic = join(dest, "studio/.vercel/output/static");
	await assertPublicArtifacts(studioStatic, ["PrivateStudioCatalogSentinel"]);
	const integration = spawnSync(
		"node",
		[
			"--import",
			"tsx",
			"--test",
			"tests/integration/paper-tree-output.test.ts",
		],
		{
			cwd: source,
			env: {
				...env,
				PAPER_TREE_OUTPUT_DIR: join(dest, "dist"),
				PAPER_TREE_STUDIO_STATIC_DIR: studioStatic,
			},
			stdio: "inherit",
		},
	);
	assert.equal(integration.status, 0);
	console.info(
		`500 public graph pages verified; fixture HTML ${Buffer.byteLength(html)} bytes; public nodes occur only in their own article.`,
	);
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
