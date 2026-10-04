import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
	cp,
	readdir,
	readFile,
	realpath,
	stat,
	symlink,
	writeFile,
} from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, extname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { fromHtml } from "hast-util-from-html";
import { visit } from "unist-util-visit";
import { courses, topics } from "../src/data/catalog";
import {
	buildCollectionRoutes,
	buildKnowledgeIndex,
	getSidebarContext,
	type KnowledgeIndex,
} from "../src/utils/knowledge-model";
import {
	getPublicNotes,
	type NoteRecord,
	type NoteType,
} from "../src/utils/note-model";
import { bodyOf } from "./migration/convert";

import { readCurrentManifest } from "./verify-site";

const targets: Record<NoteType, number> = {
	course: 200,
	paper: 180,
	log: 50,
	idea: 30,
	experiment: 20,
	note: 20,
};
function scaleIndex(records: NoteRecord[]): KnowledgeIndex {
	return buildKnowledgeIndex(
		{
			posts: records.map((n) => ({ ...n, pinned: false, words: 0 })),
			projects: [],
		},
		{ courses, topics },
	);
}
export interface ScaleAudit {
	articleCount: number;
	notesPages: number;
	collectionPages: number;
	courseCounts: Record<string, number>;
	topicMemberships: number;
	maxPageItems: number;
	contextIsBodyFree: boolean;
}
export function auditScaleModel(records: NoteRecord[]): ScaleAudit {
	const index = scaleIndex(records);
	const publicNotes = getPublicNotes(records);
	const routes = buildCollectionRoutes(index);
	assert.equal(index.stats.articleCount, 500);
	assert.equal(new Set(index.publicItems.map((n) => n.url)).size, 500);
	for (const course of index.hubs.courses.groups) {
		const expected = publicNotes
			.filter(
				(n) => n.data.type === "course" && n.data.course?.id === course.id,
			)
			.sort(
				(a, b) =>
					(a.data.course?.order ?? Number.POSITIVE_INFINITY) -
					(b.data.course?.order ?? Number.POSITIVE_INFINITY),
			)
			.map((n) => n.data.slug);
		assert.deepEqual(
			course.items.map((n) => n.kind === "post" && n.post.data.slug),
			expected,
		);
	}
	for (const topic of topics) {
		const expected = publicNotes
			.filter((n) => n.data.topics.includes(topic.id))
			.map((n) => n.data.slug)
			.sort();
		assert.deepEqual(
			index.lists["/topics/" + topic.id + "/"].items
				.map((n) => n.kind === "post" && n.post.data.slug)
				.sort(),
			expected,
		);
	}
	for (const route of routes) {
		assert.ok(route.items.length <= 25);
		if (route.page > 1) assert.ok(route.items.length > 0);
		assert.ok(!route.items.some((n) => n.key.includes("scale-draft")));
	}
	let contextIsBodyFree = true;
	for (const item of index.hubs.courses.items) {
		if (item.kind !== "post") throw new Error("Course member must be a post");
		const context = getSidebarContext(index, item.url);
		assert.ok(context.course);
		assert.ok(
			context.course.notes.every(
				(n) => n.course?.id === item.post.data.course?.id,
			),
		);
		contextIsBodyFree &&= !/"(body|publicItems)"/.test(JSON.stringify(context));
	}
	assert.ok(contextIsBodyFree);
	assert.ok(!/"body"/.test(JSON.stringify(index)));
	return {
		articleCount: index.stats.articleCount,
		notesPages: routes.filter((r) => r.group.url === "/notes/").length,
		collectionPages: routes.length,
		courseCounts: Object.fromEntries(
			index.hubs.courses.groups.map((g) => [g.id, g.items.length]),
		),
		topicMemberships: topics.reduce(
			(sum, t) => sum + index.lists["/topics/" + t.id + "/"].items.length,
			0,
		),
		maxPageItems: Math.max(...routes.map((r) => r.items.length)),
		contextIsBodyFree,
	};
}
async function auditScaleOutput(
	site: string,
	index: KnowledgeIndex,
): Promise<void> {
	for (const route of buildCollectionRoutes(index)) {
		const html = await readFile(join(site, route.url, "index.html"), "utf8");
		const links: string[] = [];
		visit(fromHtml(html), "element", (node) => {
			if (
				node.tagName === "a" &&
				(node.properties.className as string[] | undefined)?.includes(
					"post-card-title",
				)
			)
				links.push(String(node.properties.href));
		});
		assert.deepEqual(
			links,
			route.items.map((item) => item.url),
			route.url,
		);
		assert.ok(!html.includes("PrivateScaleSentinel"));
		assert.ok(
			!existsSync(
				join(
					site,
					route.group.url,
					"page",
					String(route.totalPages + 1),
					"index.html",
				),
			),
			"no out-of-range page",
		);
	}
	const home = await readFile(join(site, "index.html"), "utf8");
	assert.match(home, /data-stat-id="articles"[^>]*>500</);
	assert.ok(!home.includes("PrivateScaleSentinel"));
	const entry = JSON.parse(
		await readFile(join(site, "pagefind/pagefind-entry.json"), "utf8"),
	);
	assert.equal(entry.languages.zh.page_count, 500);
}
export interface TransferBytes {
	html: number;
	js: number;
	pagefind: number;
	media: number;
	images: number;
	other: number;
	headers: number;
}
/** Response body bytes from Chromium network events, with HTTP headers recorded separately. */
export async function measureTransfers(
	appRoot: string,
): Promise<Record<string, TransferBytes>> {
	const server = createServer();
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const address = server.address();
	if (!address || typeof address === "string")
		throw new Error("No benchmark port");
	const port = address.port;
	await new Promise<void>((resolve) => server.close(() => resolve()));
	const origin = "http://127.0.0.1:" + port;
	const child = spawn(
		process.execPath,
		[
			resolve("node_modules/astro/bin/astro.mjs"),
			"preview",
			"--ignore-lock",
			"--host",
			"127.0.0.1",
			"--port",
			String(port),
		],
		{
			cwd: appRoot,
			env: {
				...process.env,
				ASTRO_PREVIEW_BACKGROUND: "1",
				SITE_MODE: "preview",
				PUBLIC_SITE_MODE: "preview",
				PUBLIC_SITE_ORIGIN: origin,
			},
			stdio: ["ignore", "pipe", "pipe"],
		},
	);
	let logs = "";
	for (const stream of [child.stdout, child.stderr])
		stream?.on("data", (chunk) => {
			logs = (logs + chunk).slice(-4000);
		});
	const stop = async () => {
		if (child.exitCode !== null) return;
		await new Promise<void>((resolve) => {
			const timer = setTimeout(() => child.kill("SIGKILL"), 3000);
			child.once("exit", () => {
				clearTimeout(timer);
				resolve();
			});
			child.kill("SIGTERM");
		});
	};
	try {
		const deadline = Date.now() + 30000;
		let ready = false;
		while (Date.now() < deadline) {
			try {
				ready = (await fetch(origin + "/")).ok;
			} catch {}
			if (ready) break;
			await new Promise((resolve) => setTimeout(resolve, 200));
		}
		if (!ready) throw new Error(logs);
		const browser = await chromium.launch();
		try {
			const report: Record<string, TransferBytes> = {};
			for (const [name, path] of [
				["hub", "/papers/"],
				["article", "/notes/operating-systems-lec0/"],
				["search", "/search/?q=Bellman&type=course"],
			] as const) {
				const context = await browser.newContext({
					viewport: { width: 1440, height: 900 },
				});
				const page = await context.newPage();
				await page.addInitScript(() =>
					localStorage.setItem("firefly-effects", "off"),
				);
				await page.route("**/*", (route) =>
					new URL(route.request().url()).origin === origin
						? route.continue()
						: route.abort(),
				);
				const cdp = await context.newCDPSession(page);
				await cdp.send("Network.enable");
				await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
				const bytes: TransferBytes = {
					html: 0,
					js: 0,
					pagefind: 0,
					media: 0,
					images: 0,
					other: 0,
					headers: 0,
				};
				const pending: Promise<void>[] = [];
				page.on("requestfinished", (request) => {
					pending.push(
						(async () => {
							const sizes = await request.sizes();
							const type = request.resourceType();
							const key: Exclude<keyof TransferBytes, "headers"> = request
								.url()
								.includes("/pagefind/")
								? "pagefind"
								: type === "document"
									? "html"
									: type === "script"
										? "js"
										: type === "media"
											? "media"
											: type === "image"
												? "images"
												: "other";
							bytes[key] += sizes.responseBodySize;
							bytes.headers += sizes.responseHeadersSize;
						})(),
					);
				});
				await page.goto(origin + path);
				if (name === "search") {
					await page.waitForSelector("[data-search-result]");
				}
				await page.waitForLoadState("networkidle");
				await Promise.all(pending);
				report[name] = bytes;
				page.removeAllListeners("requestfinished");
				if (name === "search")
					assert.equal(
						await page.evaluate(async () => {
							await window.__loadPagefind?.();
							return (await window.pagefind.search('"PrivateScaleSentinel"'))
								.results.length;
						}),
						0,
					);
				await context.close();
			}
			return report;
		} finally {
			await browser.close();
		}
	} finally {
		await stop();
	}
}
export function generateScaleNotes(
	originals: NoteRecord[],
	count: number,
): NoteRecord[] {
	if (count !== 500)
		throw new Error("This representative fixture is defined for 500 notes");
	const publicNotes = getPublicNotes(originals);
	const out: NoteRecord[] = [];
	for (const type of Object.keys(targets) as NoteType[]) {
		const matching = publicNotes.filter((n) => n.data.type === type);
		const pool = matching.length ? matching : publicNotes;
		for (let i = matching.length; i < targets[type]; i++) {
			const source = pool[i % pool.length];
			const id = `scale-${type}-${i}`;
			out.push({
				entryId: source.entryId,
				hasBody: true,
				data: {
					...source.data,
					id,
					slug: id,
					type,
					title: `${source.data.title} · 样本 ${i}${i % 4 === 0 ? "：长期科研知识主页中课程、论文、实验与研究日志的长标题检索和阅读验收" : ""}`,
					visibility: "published",
					contentKind: "note",
					date: i % 4 === 0 ? undefined : source.data.date,
					course:
						type === "course"
							? { id: source.data.course!.id, order: 100 + i }
							: undefined,
				},
			});
		}
	}
	return out;
}
async function sizes(
	root: string,
): Promise<Record<string, { files: number; bytes: number }>> {
	const result: Record<string, { files: number; bytes: number }> = {};
	async function walk(dir: string) {
		for (const e of await readdir(dir, { withFileTypes: true })) {
			const p = join(dir, e.name);
			if (e.isDirectory()) await walk(p);
			else {
				const key = relative(root, p).startsWith("pagefind/")
					? "index"
					: /\.(mp3|mp4|ogg)$/.test(p)
						? "media"
						: /\.(png|webp|avif|jpg|jpeg|svg)$/.test(p)
							? "images"
							: extname(p).slice(1) || "other";
				result[key] ??= { files: 0, bytes: 0 };
				result[key].files++;
				result[key].bytes += (await stat(p)).size;
			}
		}
	}
	await walk(root);
	return result;
}
export async function benchmarkContent(
	outputDir: string,
): Promise<Record<string, unknown>> {
	const dest = resolve(outputDir);
	const temporary = await realpath(tmpdir());
	const roots = [
		temporary,
		...(existsSync("/tmp") ? [await realpath("/tmp")] : []),
	];
	const parent = await realpath(dirname(dest));
	if (!roots.some((root) => parent === root || parent.startsWith(root + "/")))
		throw new Error("Output must be a fresh temporary application directory");
	if (existsSync(dest))
		throw new Error("Refusing to overwrite an existing benchmark directory");
	const source = process.cwd();
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
	]);
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
	if (existsSync(".astro"))
		await cp(".astro", join(dest, ".astro"), { recursive: true });
	const manifest = await readCurrentManifest(resolve("src/content/posts"));
	const originals = manifest.records.map((r) => ({
		entryId: r.sourcePath,
		data: r,
		hasBody: r.hasBody,
	}));
	const added = generateScaleNotes(originals, 500);
	for (const note of added) {
		const body = bodyOf(
			await readFile(join(source, "src/content/posts", note.entryId), "utf8"),
		);
		const path = join(
			dest,
			"src/content/posts",
			dirname(note.entryId),
			note.data.slug + ".md",
		);
		await writeFile(
			path,
			"---\n" +
				Object.entries(note.data)
					.filter(([, v]) => v !== undefined)
					.map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
					.join("\n") +
				"\n---\n" +
				body +
				`\n\n## 隔离验收样本 ${note.data.slug}\n\n此页仅存在于临时压力测试副本。\n`,
		);
	}
	await writeFile(
		join(dest, "src/content/posts/scale-draft.md"),
		"---\nid: scale-draft\nslug: scale-draft\ntitle: Hidden Scale Draft\ntype: note\ntopics: []\nvisibility: draft\n---\nPrivateScaleSentinel\n",
	);
	const start = Date.now();
	const timeArgs = process.platform === "darwin" ? ["-l"] : ["-v"];
	const build = spawnSync(
		"/usr/bin/time",
		[
			...timeArgs,
			process.env.PNPM_BIN ?? "pnpm",
			"--config.verify-deps-before-run=warn",
			"build",
		],
		{
			cwd: dest,
			env: {
				...process.env,
				SITE_MODE: "preview",
				PUBLIC_SITE_MODE: "preview",
				PUBLIC_SITE_ORIGIN: "http://127.0.0.1:4321",
			},
			encoding: "utf8",
			maxBuffer: 64 * 1024 * 1024,
		},
	);
	const seconds = (Date.now() - start) / 1000;
	const log = (build.stdout ?? "") + "\n" + (build.stderr ?? "");
	await writeFile(join(dest, "benchmark-build.log"), log);
	if (build.status !== 0)
		throw new Error(
			`Benchmark build failed: ${join(dest, "benchmark-build.log")}`,
		);
	const site = existsSync(join(dest, "dist/client"))
		? join(dest, "dist/client")
		: join(dest, "dist");
	const api = JSON.parse(
		await readFile(join(site, "api/allPostMeta.json"), "utf8"),
	);
	const counts = Object.fromEntries(
		Object.keys(targets).map((type) => [
			type,
			api.filter((n: { type: string }) => n.type === type).length,
		]),
	);
	if (api.length !== 500 || JSON.stringify(counts) !== JSON.stringify(targets))
		throw new Error("Built public scope differs");
	if (existsSync(join(site, "notes/scale-draft/index.html")))
		throw new Error("Draft leaked into output");
	const built = await readCurrentManifest(join(dest, "src/content/posts"));
	const records = built.records.map((r) => ({
		entryId: r.sourcePath,
		data: r,
		hasBody: r.hasBody,
	}));
	const scale = auditScaleModel(records);
	await auditScaleOutput(site, scaleIndex(records));
	const transfers = await measureTransfers(dest);
	const report = {
		count: api.length,
		counts,
		sourceBodies: new Set(added.map((n) => n.entryId)).size,
		pages: Math.ceil(api.length / 25),
		seconds,
		maxResidentBytes:
			process.platform === "darwin"
				? Number(log.match(/(\d+)\s+maximum resident set size/)?.[1] ?? 0)
				: Number(
						log.match(/Maximum resident set size \(kbytes\): (\d+)/)?.[1] ?? 0,
					) * 1024,
		artifacts: await sizes(site),
		scale,
		transfers,
		outputDir: dest,
	};
	await writeFile(
		join(dest, "benchmark-report.json"),
		JSON.stringify(report, null, 2) + "\n",
	);
	await writeFile(
		join(dest, "benchmark-report.md"),
		`# 500-note benchmark\n\n${report.count} public notes, ${report.pages} pages, ${report.sourceBodies} distinct source bodies. Build ${seconds}s; peak RSS ${report.maxResidentBytes} bytes.\n\nSee benchmark-report.json and benchmark-build.log for measurements.\n`,
	);
	return report;
}
if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
	const args = process.argv.slice(2);
	if (
		args[args.indexOf("--count") + 1] !== "500" ||
		!args.includes("--output-dir")
	)
		throw new Error("Required --count 500 --output-dir <fresh temporary path>");
	console.log(
		JSON.stringify(
			await benchmarkContent(args[args.indexOf("--output-dir") + 1]),
			null,
			2,
		),
	);
}
