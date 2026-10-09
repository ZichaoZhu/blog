import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test, { after } from "node:test";
import { pathToFileURL } from "node:url";

const output =
	process.env.PAPER_TREE_STUDIO_OUTPUT_DIR ?? resolve("studio/.vercel/output");
const functionDir = join(output, "functions/_render.func");
const config = JSON.parse(
	await readFile(join(functionDir, ".vc-config.json"), "utf8"),
);
// Match the deployed file set; never resolve missing packages from the source checkout.
const isolated = await mkdtemp(join(tmpdir(), "paper-tree-studio-runtime-"));
after(() => rm(isolated, { recursive: true, force: true }));
await cp(functionDir, isolated, { recursive: true, dereference: true });
const { default: app } = await import(
	pathToFileURL(join(isolated, config.handler)).href
);

test("built Studio renders the workspace when CommonJS cannot require ES modules", async () => {
	const response = await app.fetch(
		new Request("https://studio.blessingworld.cn/studio/paper-trees/"),
	);
	assert.equal(response.status, 200);
	assert.match(await response.text(), /Goongmly Studio/);
	assert.match(response.headers.get("cache-control") ?? "", /no-store/);
});

test("built Studio serves only its uncached deployment identity", async () => {
	const response = await app.fetch(
		new Request("https://studio.blessingworld.cn/version.json"),
	);
	assert.equal(response.status, 200);
	const version = await response.json();
	assert.deepEqual(Object.keys(version).sort(), [
		"codeSha",
		"jobId",
		"releaseId",
		"schemaVersion",
	]);
	assert.match(version.codeSha, /^[a-f\d]{40}$/);
	assert.match(response.headers.get("cache-control") ?? "", /no-store/);
});
