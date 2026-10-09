import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
/** Scan bytes in real output, including binary Pagefind files and attachments. */
export async function assertPublicArtifacts(
	root: string,
	privateMarkers: readonly string[],
): Promise<void> {
	async function visit(dir: string): Promise<void> {
		for (const item of await readdir(dir, { withFileTypes: true })) {
			const path = join(dir, item.name);
			assert.equal(
				/^(?:drafts|jobs|control\.json|papers\.json)$/.test(item.name),
				false,
				`Private filename in ${relative(root, path)}`,
			);
			if (item.isDirectory()) await visit(path);
			else {
				const bytes = await readFile(path);
				for (const marker of privateMarkers)
					assert.equal(
						bytes.includes(Buffer.from(marker)),
						false,
						`Private marker in ${relative(root, path)}`,
					);
			}
		}
	}
	await visit(root);
}
