import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";
import type { VFile } from "vfile";
import manifest from "../../migration/manifest.json" with { type: "json" };
export function rehypeLegacyAnchors(): (tree: Root, file: VFile) => void {
	return (tree, file) => {
		const path = String(file.path ?? "").replaceAll("\\", "/");
		const frontmatter = (
			file.data.astro as
				| { frontmatter?: { id?: string; slug?: string } }
				| undefined
		)?.frontmatter;
		const record = manifest.records.find((r) =>
			frontmatter?.id
				? r.id === frontmatter.id
				: frontmatter?.slug
					? r.slug === frontmatter.slug
					: path.endsWith("/src/content/posts/" + r.targetPath),
		);
		if (!record) return;
		const aliases = record.anchorAliases as Record<string, string>;
		const ids = new Set<string>();
		visit(tree, "element", (n) => {
			if (n.properties.id) ids.add(String(n.properties.id));
		});
		visit(tree, "element", (node, index, parent) => {
			if (!parent || index === undefined || !/^h[1-6]$/.test(node.tagName))
				return;
			const old = Object.entries(aliases).filter(
				([id, target]) => target === node.properties.id && !ids.has(id),
			);
			if (!old.length) return;
			const anchors: Element[] = old.map(([id]) => {
				ids.add(id);
				return {
					type: "element",
					tagName: "span",
					properties: {
						id,
						className: ["legacy-anchor"],
						"aria-hidden": "true",
						"data-pagefind-ignore": "all",
					},
					children: [],
				};
			});
			parent.children.splice(index, 0, ...anchors);
			return index + anchors.length + 1;
		});
	};
}
