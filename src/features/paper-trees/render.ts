import katex from "katex";
import { Marked, type Tokens } from "marked";
import sanitizeHtml from "sanitize-html";
import { isSafeHyperLink } from "./model";

function escapeHtml(text: string): string {
	return text.replace(
		/[&<>"']/g,
		(char) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				char
			] as string,
	);
}

interface MathToken extends Tokens.Generic {
	text: string;
	display: boolean;
}

const markdown = new Marked({ gfm: true, breaks: true, async: false });
markdown.use({
	extensions: [
		{
			name: "paperMath",
			level: "inline",
			start(source) {
				return source.indexOf("$");
			},
			tokenizer(source) {
				const match = /^(\${1,2})((?:\\[\s\S]|[^$\\])+?)\1/.exec(source);
				if (!match) return undefined;
				return {
					type: "paperMath",
					raw: match[0],
					text: match[2],
					display: match[1].length === 2,
				};
			},
			renderer(token) {
				const math = token as MathToken;
				try {
					return katex.renderToString(math.text, {
						displayMode: math.display,
						throwOnError: true,
						trust: false,
						strict: "error",
						maxExpand: 1000,
						maxSize: 10,
						output: "htmlAndMathml",
					});
				} catch {
					return `<span class="paper-tree-math-error" title="公式无法解析"><code>${escapeHtml(math.raw)}</code></span>`;
				}
			},
		},
	],
	renderer: {
		html() {
			return "";
		},
		image({ text }) {
			return escapeHtml(text);
		},
	},
});

const mathTags = [
	"math",
	"semantics",
	"annotation",
	"mrow",
	"mi",
	"mo",
	"mn",
	"mtext",
	"msub",
	"msup",
	"msubsup",
	"mfrac",
	"msqrt",
	"mroot",
	"mtable",
	"mtr",
	"mtd",
	"mspace",
	"munder",
	"mover",
	"munderover",
	"menclose",
	"mpadded",
	"mphantom",
	"svg",
	"path",
	"line",
];
const dimension = /^-?(?:\d*\.)?\d+(?:em|ex|px|%)?$/;
const styles = Object.fromEntries(
	[
		"height",
		"width",
		"min-width",
		"top",
		"left",
		"font-size",
		"margin-left",
		"margin-right",
		"padding-left",
		"border-bottom-width",
		"vertical-align",
	].map((key) => [key, [dimension]]),
);

/** Both the public outline and canvas use this exact parser and sanitizer. */
export function renderNodeMarkdown(source: string): string {
	return sanitizeHtml(markdown.parse(source) as string, {
		allowedTags: [...sanitizeHtml.defaults.allowedTags, ...mathTags],
		allowedAttributes: {
			"*": ["class", "style", "aria-hidden", "aria-label"],
			a: ["href", "title", "target", "rel"],
			math: ["xmlns", "display"],
			annotation: ["encoding"],
			mo: ["stretchy", "fence", "separator", "lspace", "rspace"],
			mspace: ["width", "height", "depth"],
			mrow: ["mathvariant"],
			mi: ["mathvariant"],
			mtable: ["columnalign", "rowspacing", "columnspacing"],
			mtd: ["columnalign"],
			mover: ["accent"],
			munder: ["accentunder"],
			mpadded: ["width", "height", "depth", "lspace", "voffset"],
			svg: ["width", "height", "viewBox", "preserveAspectRatio", "xmlns"],
			path: ["d"],
			line: ["x1", "x2", "y1", "y2", "stroke-width"],
		},
		allowedStyles: { "*": { ...styles, position: [/^relative$/] } },
		allowedSchemes: ["http", "https"],
		allowProtocolRelative: false,
		parser: { lowerCaseAttributeNames: false },
		transformTags: {
			a(_tag, attributes) {
				if (!isSafeHyperLink(attributes.href ?? ""))
					return { tagName: "span", attribs: {} };
				return {
					tagName: "a",
					attribs: {
						...attributes,
						rel: "noopener noreferrer",
						...(attributes.href.startsWith("http") ? { target: "_blank" } : {}),
					},
				};
			},
		},
	});
}
