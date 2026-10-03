import { h } from "hastscript";
import { visit } from "unist-util-visit";
import { shouldAddNoReferrer } from "../utils/image-utils.ts";

/** Keep image properties intact for Astro's responsive image renderer. */
export default function rehypeFigure() {
	return (tree) => {
		visit(tree, "element", (node, index, parent) => {
			if (node.tagName !== "img" || !parent || typeof index !== "number")
				return;
			if (String(node.properties?.className ?? "").includes("plantuml-image"))
				return;
			if (node.properties.src && shouldAddNoReferrer(node.properties.src)) {
				node.properties.referrerpolicy = "no-referrer";
			}
			const original = node.properties["data-original-url"];
			const picture = original
				? h("a", { href: original, "data-fancybox": "article" }, [node])
				: node;
			// A block figure inside a paragraph causes the browser to clone empty links.
			if (parent.tagName === "p" && parent.children.length === 1) {
				parent.tagName = "figure";
				parent.children = [picture];
				if (node.properties.alt)
					parent.children.push(h("figcaption", String(node.properties.alt)));
			} else if (original) {
				parent.children[index] = picture;
			}
		});
	};
}
