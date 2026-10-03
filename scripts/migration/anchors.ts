import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import { fromHtml } from "hast-util-from-html";
import rehypeSlug from "rehype-slug";
import remarkMath from "remark-math";
import { visit } from "unist-util-visit";
import { remarkTyporaCompat } from "../../src/plugins/remark-typora-compat";
import { resolveSiteRoot } from "../site-root";
import { bodyOf, type MigrationManifest } from "./convert";
export function buildAnchorAliases(
	old: string[],
	current: string[],
): Record<string, string> {
	if (old.length !== current.length) throw new Error("heading count differs");
	return Object.fromEntries(
		old.flatMap((id, i) => (id !== current[i] ? [[id, current[i]]] : [])),
	);
}
if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
	const manifest: MigrationManifest = JSON.parse(
		await readFile("migration/manifest.json", "utf8"),
	);
	const processor = await createMarkdownProcessor({
		remarkPlugins: [remarkMath, remarkTyporaCompat],
		rehypePlugins: [rehypeSlug],
	});
	let count = 0;
	for (const r of manifest.records) {
		if (!r.hasBody || r.visibility === "draft") continue;
		const old = await processor.render(
			bodyOf(
				await readFile(resolve("src/content/posts", r.targetPath), "utf8"),
			),
		);
		const current: string[] = [];
		const tree = fromHtml(
			await readFile(
				resolve(resolveSiteRoot(), "." + r.canonicalPath, "index.html"),
				"utf8",
			),
		);
		visit(tree, "element", (node) => {
			if (
				Array.isArray(node.properties.className) &&
				node.properties.className.includes("custom-md")
			)
				visit(node, "element", (heading) => {
					if (/^h[1-6]$/.test(heading.tagName) && heading.properties.id)
						current.push(String(heading.properties.id));
				});
		});
		r.anchorAliases = buildAnchorAliases(
			(old.metadata.headings ?? []).map((h) => h.slug),
			current,
		);
		count += Object.keys(r.anchorAliases).length;
	}
	await writeFile(
		"migration/manifest.json",
		JSON.stringify(manifest, null, 2) + "\n",
	);
	console.log("Verified heading ids; aliases:", count);
}
