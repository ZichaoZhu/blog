import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import matter from "gray-matter";
import { noteDataSchema } from "../src/content/schema.ts";
import { courses, topics } from "../src/data/catalog.ts";
import { assertCatalog } from "../src/utils/note-model.ts";

const args = process.argv.slice(2);
const title = args.shift();
if (!title || title === "--help") {
	console.log(
		'pnpm new-post "标题" --slug stable-name --type paper --topics robotics --visibility draft [--course id --order 0] [--date YYYY-MM-DD]',
	);
	process.exit(title ? 0 : 1);
}
const opts = new Map();
for (let i = 0; i < args.length; i += 2) {
	if (!args[i].startsWith("--") || !args[i + 1])
		throw new Error("Options require explicit values");
	opts.set(args[i].slice(2), args[i + 1]);
}
const slug = opts.get("slug");
if (!slug)
	throw new Error("--slug is required; titles never determine addresses");
const type = opts.get("type") ?? "note";
if (type === "course" && !opts.has("course"))
	throw new Error("Course notes require --course");
const data = noteDataSchema.parse({
	id: opts.get("id") ?? slug,
	slug,
	title,
	type,
	topics: (opts.get("topics") ?? "").split(",").filter(Boolean),
	visibility: opts.get("visibility") ?? "draft",
	date: opts.get("date"),
	course: opts.has("course")
		? {
				id: opts.get("course"),
				order: opts.has("order") ? Number(opts.get("order")) : undefined,
			}
		: undefined,
});
const root = resolve(opts.get("output-dir") ?? "src/content/posts");
const existing = [];
async function scan(dir) {
	let entries;
	try {
		entries = await readdir(dir, { withFileTypes: true });
	} catch (e) {
		if (e.code === "ENOENT") return;
		throw e;
	}
	for (const e of entries) {
		const path = join(dir, e.name);
		if (e.isDirectory()) await scan(path);
		else if (/\.mdx?$/.test(path)) {
			const raw = await readFile(path, "utf8");
			existing.push({
				entryId: path,
				data: noteDataSchema.parse(matter(raw).data),
				hasBody: true,
			});
		}
	}
}
await scan(root);
assertCatalog([...existing, { entryId: slug, data, hasBody: true }], {
	courses,
	topics,
});
const {
	published,
	updated,
	draft,
	series,
	seriesOrder,
	prevTitle,
	prevSlug,
	nextTitle,
	nextSlug,
	...frontmatter
} = data;
const folder = join(root, slug);
await mkdir(folder, { recursive: true });
await writeFile(
	join(folder, "index.md"),
	"---\n" +
		Object.entries(frontmatter)
			.filter(([, v]) => v !== undefined)
			.map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
			.join("\n") +
		"\n---\n\n正文从这里开始。\n",
	{ flag: "wx" },
);
console.log("Created " + join(folder, "index.md"));
