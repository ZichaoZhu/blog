import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { topics } from "../../src/data/catalog";
import { type LegacyMap, resolveLegacyMap } from "../../src/utils/legacy";
import type { MigrationManifest } from "./convert";
export function buildLegacyMap(manifest: MigrationManifest): LegacyMap {
	const paths: Record<string, string> = {};
	for (const r of manifest.records)
		if (r.visibility !== "draft")
			paths[r.legacyPath.replace(/\/$/, "")] = r.canonicalPath;
	paths["/authors/zhuzichao"] = "/about/";
	paths["/authors/zzc"] = "/about/";
	for (const t of topics) paths[`/research/areas/${t.id}`] = `/topics/${t.id}/`;
	const images = Object.fromEntries(
		manifest.assets.map((a) => [
			a.sourcePath,
			{
				original: `/images/original/${a.sha256}.png`,
				variants: a.publishedVariants,
			},
		]),
	);
	return { paths, images };
}
export function resolveLegacyLocation(
	pathname: string,
	query: URLSearchParams,
	manifest: MigrationManifest,
): string | null {
	return resolveLegacyMap(pathname, query, buildLegacyMap(manifest));
}
if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
	const m: MigrationManifest = JSON.parse(
		await readFile("migration/manifest.json", "utf8"),
	);
	await writeFile(
		"src/data/legacy-routes.json",
		JSON.stringify(buildLegacyMap(m), null, 2) + "\n",
	);
	console.log(
		"Generated content and original-image mappings; no hosting rules applied.",
	);
}
