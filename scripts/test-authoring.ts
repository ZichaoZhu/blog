import assert from "node:assert/strict";
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
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
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { chromium } from "@playwright/test";
import matter from "gray-matter";
import { readCurrentManifest } from "./verify-site";

// This test owns only its freshly created temporary app, never authored content.
const source = process.cwd();
async function freePort(): Promise<number> {
	const server = createServer();
	await new Promise<void>((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", resolve);
	});
	const address = server.address();
	if (!address || typeof address === "string") throw new Error("No test port");
	await new Promise<void>((resolve) => server.close(() => resolve()));
	return address.port;
}
async function until(check: () => Promise<boolean>): Promise<void> {
	const deadline = Date.now() + 45000;
	let error: unknown;
	while (Date.now() < deadline) {
		try {
			if (await check()) return;
		} catch (e) {
			error = e;
		}
		await new Promise((resolve) => setTimeout(resolve, 250));
	}
	throw new Error(
		`Authoring live check timed out: ${String(error ?? "condition stayed false")}`,
	);
}
async function stop(child: ChildProcess): Promise<void> {
	if (child.exitCode !== null) return;
	await new Promise<void>((resolve) => {
		const timer = setTimeout(() => child.kill("SIGKILL"), 3000);
		child.once("exit", () => {
			clearTimeout(timer);
			resolve();
		});
		child.kill("SIGTERM");
	});
}
async function liveChecks(dest: string): Promise<void> {
	const start = async (mode: "preview" | "dev") => {
		const port = await freePort();
		const origin = `http://127.0.0.1:${port}`;
		const child = spawn(
			process.execPath,
			[
				join(source, "node_modules/astro/bin/astro.mjs"),
				mode,
				"--ignore-lock",
				"--host",
				"127.0.0.1",
				"--port",
				String(port),
			],
			{
				cwd: dest,
				env: {
					...process.env,
					SITE_MODE: "preview",
					PUBLIC_SITE_MODE: "preview",
					PUBLIC_SITE_ORIGIN: origin,
					ASTRO_PREVIEW_BACKGROUND: "1",
					ASTRO_DEV_BACKGROUND: "1",
				},
				stdio: ["ignore", "pipe", "pipe"],
			},
		);
		let log = "";
		for (const stream of [child.stdout, child.stderr])
			stream?.on("data", (chunk) => {
				log = (log + chunk).slice(-12000);
			});
		try {
			await until(async () => {
				if (child.exitCode !== null) throw new Error(log);
				return (await fetch(origin + "/")).ok;
			});
		} catch (error) {
			await stop(child);
			throw new Error(`${error}\n${log}`);
		}
		return { child, origin };
	};
	const preview = await start("preview");
	try {
		const browser = await chromium.launch();
		try {
			const page = await browser.newPage();
			await page.addInitScript(() =>
				localStorage.setItem("firefly-effects", "off"),
			);
			await page.goto(
				preview.origin +
					"/search/?q=ProjectScopeSentinel&type=project&topic=robotics",
			);
			await page.waitForSelector(
				'[data-search-result] a[href="/projects/review-project/"]',
			);
			assert.equal(await page.locator("[data-search-result]").count(), 1);
			await page.reload();
			await page.waitForSelector(
				'[data-search-result] a[href="/projects/review-project/"]',
			);
			for (const query of ["PrivateProjectSentinel", "EmptyProjectSentinel"]) {
				await page.getByLabel("关键词").fill(query);
				await page.getByRole("button", { name: "搜索", exact: true }).click();
				await page.waitForFunction(() =>
					document
						.querySelector('[role="status"]')
						?.textContent?.includes("没有匹配"),
				);
				assert.equal(await page.locator("[data-search-result]").count(), 0);
			}
		} finally {
			await browser.close();
		}
	} finally {
		await stop(preview.child);
	}
	const dev = await start("dev");
	try {
		const html = () => fetch(dev.origin + "/").then((r) => r.text());
		const number = (body: string, id: string) =>
			Number(
				body
					.match(new RegExp(`data-stat-id="${id}"[^>]*>([\\d,]+)</span>`))?.[1]
					.replaceAll(",", ""),
			);
		const baseline = await html();
		const count = number(baseline, "articles");
		const words = number(baseline, "words");
		assert.ok(count > 44 && words > 0);
		const path = join(dest, "src/content/projects/review-project.md");
		const original = matter(await readFile(path, "utf8"));
		await writeFile(
			path,
			matter.stringify(original.content, { ...original.data, draft: true }),
		);
		await until(
			async () =>
				number(await html(), "articles") === count - 1 &&
				!(
					await fetch(dev.origin + "/projects/").then((r) => r.text())
				).includes("/projects/topics/robotics/"),
		);
		await writeFile(
			path,
			matter.stringify(original.content + "\n\n" + "NewBodyWord ".repeat(400), {
				...original.data,
				draft: false,
				topics: ["3d-vision"],
			}),
		);
		await until(async () => {
			const body = await html();
			const hub = await fetch(dev.origin + "/projects/").then((r) => r.text());
			return (
				number(body, "articles") === count &&
				number(body, "words") > words + 350 &&
				hub.includes("/projects/topics/3d-vision/") &&
				!hub.includes("/projects/topics/robotics/")
			);
		});
		console.log(
			"Authoring Pagefind project search and dev public/draft/body/topic updates passed",
		);
	} finally {
		await stop(dev.child);
	}
}
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
		"---\ntitle: Authoring Project Fixture\npublished: 2026-10-03\nupdated: 2026-10-05\ntopics: [robotics]\ndraft: false\n---\n## ProjectScopeSentinel\n\n![Project figure](./images/firefly.avif)",
	);
	for (const [id, draft, body] of [
		["private-project", true, "PrivateProjectSentinel"],
		["empty-project", false, ""],
	] as const)
		await writeFile(
			join(dest, `src/content/projects/${id}.md`),
			matter.stringify(body, {
				title:
					id === "private-project"
						? "PrivateProjectSentinel"
						: "EmptyProjectSentinel",
				draft,
				topics: ["robotics"],
			}),
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
	await liveChecks(dest);
} finally {
	await rm(dest, { recursive: true, force: true });
}
