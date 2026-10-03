import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
	cp,
	mkdir,
	mkdtemp,
	readFile,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import matter from "gray-matter";
import { readCurrentManifest } from "./verify-site";

// This test owns only its freshly created temporary app, never authored content.
const source = process.cwd();
const dest = await mkdtemp(join(tmpdir(), "firefly-authoring-"));
const exclude = new Set([
	"node_modules",
	".git",
	".worktrees",
	".superpowers",
	"dist",
	".next",
	".astro",
	".agents",
	".codex",
	".vercel",
	"test-results",
]);
try {
	await cp(source, dest, {
		recursive: true,
		filter: (path) => {
			const rel = relative(source, path);
			return (
				!rel ||
				(!exclude.has(rel.split("/")[0]) && !/^\.env(?!\.example)/.test(rel))
			);
		},
	});
	await symlink(resolve("node_modules"), join(dest, "node_modules"), "dir");
	await cp(".astro", join(dest, ".astro"), { recursive: true });
	const manifest = await readCurrentManifest("src/content/posts");
	const index = manifest.records.find((r) => r.slug === "coure-notebook");
	const course = manifest.records.find(
		(r) =>
			r.contentKind === "collection" && r.course?.id === "compiler-principles",
	);
	const paper = manifest.records.find((r) => r.slug === "paper-reading");
	for (const [entry, visibility, body] of [
		[index, "draft", "HiddenDraftIntroSentinel"],
		[course, "unlisted", "HiddenCourseIntroSentinel"],
		[paper, "published", "VisibleIntroSentinel"],
	] as const) {
		if (!entry)
			throw new Error(
				"Authoring test requires the representative collection fixtures",
			);
		const path = join(dest, "src/content/posts", entry.targetPath);
		const parsed = matter(await readFile(path, "utf8"));
		await writeFile(
			path,
			matter.stringify(body, { ...parsed.data, visibility }),
		);
	}
	const fixtureId = `authoring-fixture-${randomUUID()}`;
	await mkdir(join(dest, "src/content/posts", fixtureId));
	await writeFile(
		join(dest, "src/content/posts", fixtureId, "index.md"),
		`---\nid: ${fixtureId}\nslug: ${fixtureId}\ntitle: Authoring fixture\nvisibility: published\nupdatedAt: "2026-10-03"\ntopics: []\n---\nUpdated Native Body Sentinel`,
	);
	await writeFile(
		join(dest, "src/content/projects/review-project.md"),
		"---\ntitle: Authoring Project Fixture\npublished: 2026-10-03\ndraft: false\n---\n## ProjectScopeSentinel\n\n![Project figure](./images/firefly.avif)",
	);
	const pnpm = process.env.PNPM_BIN || "pnpm";
	for (const command of ["build", "verify:site"]) {
		const result = spawnSync(
			pnpm,
			["--config.verify-deps-before-run=warn", command],
			{
				cwd: dest,
				env: {
					...process.env,
					SITE_MODE: "preview",
					PUBLIC_SITE_MODE: "preview",
					PUBLIC_SITE_ORIGIN: "http://127.0.0.1:4321",
					COREPACK_ENABLE_AUTO_PIN: "0",
				},
				stdio: "inherit",
			},
		);
		if (result.status !== 0) throw new Error(`Authoring ${command} failed`);
	}
	const result = spawnSync(
		process.execPath,
		[
			"--import",
			resolve("node_modules/tsx/dist/loader.mjs"),
			"--test",
			resolve("tests/integration/authoring-output.test.ts"),
		],
		{
			cwd: source,
			env: { ...process.env, FIREFLY_AUTHORING_ROOT: dest },
			stdio: "inherit",
		},
	);
	if (result.status !== 0)
		throw new Error("Authoring output regressions failed");
} finally {
	await rm(dest, { recursive: true, force: true });
}
