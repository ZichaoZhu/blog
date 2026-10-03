import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";
import { fromHtml } from "hast-util-from-html";
import { visit } from "unist-util-visit";
import { noteDataSchema } from "../src/content/schema";
import { isPublicNote } from "../src/utils/note-model";
import { bodyOf, type MigrationManifest, sha256 } from "./migration/convert";
import { resolveSiteRoot } from "./site-root";

async function walk(root: string): Promise<string[]> {
	if (!existsSync(root)) return [];
	const out: string[] = [];
	for (const e of await readdir(root, { withFileTypes: true })) {
		const p = resolve(root, e.name);
		if (e.isDirectory()) out.push(...(await walk(p)));
		else out.push(p);
	}
	return out;
}
function outputFile(root: string, url: string): string {
	const pathname = new URL(url, "https://verify.invalid").pathname;
	return resolve(root, "." + decodeURIComponent(pathname));
}
export async function verifyMigration(
	manifest: MigrationManifest,
	targetRoot: string,
): Promise<{
	records: number;
	published: number;
	assets: number;
	errors: string[];
}> {
	const errors: string[] = [];
	const sources = new Set(manifest.records.map((r) => r.sourcePath));
	let published = 0;
	for (const r of manifest.records) {
		const where = r.sourcePath;
		const path = resolve(targetRoot, r.targetPath);
		if (!existsSync(path)) {
			errors.push(`${where}: missing migrated record`);
			continue;
		}
		const raw = await readFile(path, "utf8");
		const body = bodyOf(raw);
		const data = noteDataSchema.safeParse(matter(raw).data);
		if (sha256(body) !== r.bodySha256)
			errors.push(`${where}: body SHA256 differs`);
		if (!data.success) {
			errors.push(`${where}: invalid metadata ${data.error.message}`);
			continue;
		}
		for (const key of [
			"id",
			"slug",
			"visibility",
			"type",
			"contentKind",
			"date",
			"updatedAt",
			"course",
			"topics",
		] as const)
			if (JSON.stringify(data.data[key]) !== JSON.stringify(r[key]))
				errors.push(`${where}: ${key} differs from manifest`);
		if (
			isPublicNote({ entryId: where, data: data.data, hasBody: !!body.trim() })
		)
			published++;
	}
	for (const file of await walk(targetRoot))
		if (/\.mdx?$/.test(file)) {
			const origin = matter(await readFile(file, "utf8")).data.migrationSource;
			if (origin && !sources.has(origin))
				errors.push(`${origin}: missing source record in manifest`);
		}
	for (const asset of manifest.assets) {
		const path = resolve(targetRoot, asset.sourcePath);
		if (!existsSync(path)) errors.push(`${asset.sourcePath}: missing asset`);
		else if (sha256(await readFile(path)) !== asset.sha256)
			errors.push(`${asset.sourcePath}: asset SHA256 differs`);
	}
	return {
		records: manifest.records.length,
		published,
		assets: manifest.assets.length,
		errors,
	};
}
export async function verifyRenderedSite(
	siteRoot: string,
	manifest: MigrationManifest,
): Promise<{ errors: string[] }> {
	const errors: string[] = [];
	const assets = new Map(manifest.assets.map((a) => [a.sourcePath, a]));
	for (const a of manifest.assets) a.publishedVariants = [];
	for (const r of manifest.records) {
		if (!r.hasBody || r.visibility === "draft") continue;
		const path = resolve(siteRoot, `.${r.canonicalPath}`, "index.html");
		if (!existsSync(path)) {
			errors.push(`${r.sourcePath}: missing article output`);
			continue;
		}
		const html = await readFile(path, "utf8");
		const tree = fromHtml(html);
		const ids = new Set<string>();
		const links: string[] = [];
		let h1 = 0;
		if (
			/mermaid-error|Syntax error in text|__ASTRO_IMAGE_|class="katex-error/.test(
				html,
			)
		)
			errors.push(`${r.sourcePath}: diagram/math/image render error`);
		visit(tree, "element", (node) => {
			const p = node.properties;
			if (p.id) ids.add(String(p.id));
			if (node.tagName === "h1") h1++;
			if (node.tagName === "a" && p.href) links.push(String(p.href));
			if (node.tagName !== "img") return;
			const source = p.dataSourceAsset ?? p["data-source-asset"];
			if (!source) return;
			const asset = assets.get(String(source));
			if (!asset) {
				errors.push(`${r.sourcePath}: unknown source image ${source}`);
				return;
			}
			if (!Number(p.width) || !Number(p.height) || !(p.srcSet ?? p.srcset))
				errors.push(`${r.sourcePath}: image lacks dimensions/srcset ${source}`);
			const variants = [{ url: String(p.src), width: Number(p.width) }];
			for (const v of String(p.srcSet ?? p.srcset ?? "").split(",")) {
				const [url, width] = v.trim().split(/\s+/);
				if (url && width)
					variants.push({ url, width: Number(width.replace(/w$/, "")) });
			}
			const original = String(
				p.dataOriginalUrl ?? p["data-original-url"] ?? "",
			);
			if (!original)
				errors.push(`${r.sourcePath}: image lacks original ${source}`);
			else variants.push({ url: original, width: asset.width });
			for (const v of variants) {
				const dest = outputFile(siteRoot, v.url);
				if (!existsSync(dest))
					errors.push(`${r.sourcePath}: missing image output ${v.url}`);
				if (
					!asset.publishedVariants.some(
						(a) => a.url === v.url && a.width === v.width,
					)
				)
					asset.publishedVariants.push(v);
			}
		});
		if (h1 !== 1) errors.push(`${r.sourcePath}: h1 count ${h1}`);
		for (const href of links) {
			if (
				/^(https?:|mailto:|data:|javascript:)/i.test(href) ||
				href === "/" ||
				href === ""
			)
				continue;
			const target = new URL(href, "https://verify.invalid" + r.canonicalPath);
			let fragment = "";
			try {
				fragment = decodeURIComponent(target.hash.slice(1));
			} catch {
				fragment = target.hash.slice(1);
			}
			if (target.pathname === r.canonicalPath && fragment && !ids.has(fragment))
				errors.push(`${r.sourcePath}: missing anchor ${fragment}`);
			if (target.pathname !== r.canonicalPath) {
				let pathname = target.pathname;
				try {
					pathname = decodeURIComponent(pathname);
				} catch {}
				const dest = resolve(siteRoot, "." + pathname);
				if (!existsSync(dest) && !existsSync(resolve(dest, "index.html")))
					errors.push(`${r.sourcePath}: broken local link ${href}`);
			}
		}
	}
	for (const a of manifest.assets)
		for (const v of a.publishedVariants)
			if (
				v.url.startsWith("/images/original/") &&
				existsSync(outputFile(siteRoot, v.url)) &&
				sha256(await readFile(outputFile(siteRoot, v.url))) !== a.sha256
			)
				errors.push(`${a.sourcePath}: published original hash differs`);
	return { errors };
}
if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
	const args = process.argv.slice(2);
	const value = (key: string, fallback: string): string =>
		args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
	const path = value("--manifest", "migration/manifest.json");
	const manifest: MigrationManifest = JSON.parse(await readFile(path, "utf8"));
	const content = await verifyMigration(
		manifest,
		value("--content-root", "src/content/posts"),
	);
	const rendered = await verifyRenderedSite(
		value("--site-root", resolveSiteRoot()),
		manifest,
	);
	if (args.includes("--update-variants"))
		await writeFile(path, JSON.stringify(manifest, null, 2) + "\n");
	console.log(
		JSON.stringify(
			{
				...content,
				renderedErrors: rendered.errors,
				referencedAssets: manifest.assets.filter(
					(a) => a.publishedVariants.length,
				).length,
			},
			null,
			2,
		),
	);
	if (content.errors.length || rendered.errors.length) process.exitCode = 1;
}
