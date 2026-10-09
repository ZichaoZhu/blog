import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { VercelProvider } from "../../scripts/paper-trees/vercel";
import type { ReleaseJob } from "../../studio/src/server/release";

const job: ReleaseJob = {
	jobId: randomUUID(),
	releaseId: randomUUID(),
	codeSha: "c".repeat(40),
	createdAt: "2026-10-08T00:00:00.000Z",
	state: "queued",
	mode: "code",
};
const record = {
	id: "dpl_candidate",
	url: "https://candidate.vercel.app",
	projectId: "prj_blog",
	codeSha: job.codeSha,
	releaseId: job.releaseId,
	jobId: job.jobId,
	readyState: "READY",
};
test("Studio CLI resolves the repository root and explicit native project mapping without replacing the blog cache", async () => {
	const root = await mkdtemp(join(tmpdir(), "studio-monorepo-"));
	const studio = join(root, "studio");
	await mkdir(join(root, ".vercel"), { recursive: true });
	await mkdir(studio);
	const blogCache = {
		projectId: "prj_blog",
		orgId: "team_test",
		settings: { rootDirectory: null },
	};
	await writeFile(
		join(root, ".vercel/project.json"),
		JSON.stringify(blogCache),
	);
	await writeFile(
		join(root, ".vercel/repo.json"),
		JSON.stringify({
			remoteName: "origin",
			projects: [
				{ id: "prj_blog", name: "blog", directory: ".", orgId: "team_test" },
			],
		}),
	);
	const calls: string[][] = [];
	const command = async (
		_file: string,
		args: string[],
		options: { cwd: string },
	) => {
		assert.equal(
			options.cwd,
			root,
			"Studio commands must apply rootDirectory relative to the repository",
		);
		assert.equal(args[args.indexOf("--project") + 1], "prj_studio");
		const mapping = JSON.parse(
			await readFile(join(root, ".vercel/repo.json"), "utf8"),
		);
		assert.equal(
			mapping.projects.find((p: { id: string }) => p.id === "prj_studio")
				.directory,
			"studio",
		);
		assert.equal(
			mapping.projects.find((p: { id: string }) => p.id === "prj_blog")
				.directory,
			".",
		);
		calls.push(args);
		return {
			stdout: args.includes("deploy") ? "https://candidate.vercel.app" : "",
		};
	};
	const fetchImpl: typeof fetch = async () =>
		Response.json({
			...record,
			projectId: "prj_studio",
			meta: {
				paperTreeCodeSha: job.codeSha,
				paperTreeReleaseId: job.releaseId,
				paperTreeJobId: job.jobId,
			},
			url: "candidate.vercel.app",
		});
	const provider = new VercelProvider(
		{
			role: "studio",
			root: studio,
			projectId: "prj_studio",
			teamId: "team_test",
			token: "token",
			bypass: "bypass",
			origin: "https://studio.blessingworld.cn",
		},
		fetchImpl,
		command,
	);
	try {
		await provider.build(job, "/unused");
		await provider.upload(job);
		assert.equal(calls.length, 3);
		assert.deepEqual(
			JSON.parse(await readFile(join(root, ".vercel/project.json"), "utf8")),
			blogCache,
		);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});
test("native provider accepts the CLI agent JSON deployment ID and never selects its production alias or guidance URLs", async () => {
	const ids: string[] = [];
	const fetchImpl: typeof fetch = async (input) => {
		ids.push(new URL(String(input)).pathname.split("/").at(-1) ?? "");
		return Response.json({
			...record,
			meta: {
				paperTreeCodeSha: job.codeSha,
				paperTreeReleaseId: job.releaseId,
				paperTreeJobId: job.jobId,
			},
			url: "candidate.vercel.app",
		});
	};
	let output = JSON.stringify({
		status: "ok",
		deployment: {
			id: "dpl_candidate",
			url: "https://candidate.vercel.app",
			productionUrl: "https://production-alias.vercel.app",
		},
		message: "Ready https://candidate.vercel.app",
		next: [{ command: "vercel curl https://production-alias.vercel.app" }],
	});
	const provider = new VercelProvider(
		{
			root: "/unused",
			projectId: "prj_blog",
			teamId: "team_test",
			token: "token",
			bypass: "bypass",
			origin: "https://blog.blessingworld.cn",
		},
		fetchImpl,
		async () => ({ stdout: output }),
	);
	assert.equal((await provider.upload(job)).id, "dpl_candidate");
	assert.deepEqual(ids, ["dpl_candidate"]);
	for (const invalid of [
		"{invalid",
		JSON.stringify({ status: "error", deployment: { id: "dpl_candidate" } }),
		JSON.stringify({
			status: "ok",
			deployment: { id: "https://foreign.test" },
		}),
		"https://candidate.vercel.app\nhttps://production-alias.vercel.app",
	]) {
		output = invalid;
		await assert.rejects(provider.upload(job));
	}
	assert.deepEqual(ids, ["dpl_candidate"]);
	output = "https://candidate.vercel.app\n";
	await provider.upload(job);
	assert.equal(ids.at(-1), "candidate.vercel.app");
});

test("candidate probes request JSON so native protection returns denial instead of its browser SSO redirect", async () => {
	const fetchImpl: typeof fetch = async (_input, init) => {
		const headers = new Headers(init?.headers);
		if (!headers.has("x-vercel-protection-bypass")) {
			return new Response("", {
				status: headers.get("accept") === "application/json" ? 401 : 302,
				headers: { location: "https://vercel.com/sso-api" },
			});
		}
		return Response.json({
			schemaVersion: 1,
			codeSha: job.codeSha,
			releaseId: job.releaseId,
			jobId: job.jobId,
		});
	};
	const provider = new VercelProvider(
		{
			role: "studio",
			root: "/unused",
			projectId: "prj_blog",
			teamId: "team_test",
			token: "token",
			bypass: "bypass",
			origin: "https://studio.blessingworld.cn",
		},
		fetchImpl,
	);
	await provider.verifyCandidate(record, job, "/unused");
});
