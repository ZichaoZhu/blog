import { rm } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { ApiError } from "../../studio/src/server/auth";
import {
	PaperTreeReleases,
	type ReleaseJob,
} from "../../studio/src/server/release";
import type { PublishDependencies } from "./publish";
import { workerDependencies } from "./worker";
export async function createCodeRelease(
	codeSha: string,
	deps: PublishDependencies & { allowedSource(sha: string): Promise<boolean> },
): Promise<ReleaseJob> {
	if (
		!/^[a-f\d]{40}$/.test(codeSha) ||
		deps.catalog.codeSha !== codeSha ||
		(await deps.sourceSha()) !== codeSha ||
		!(await deps.allowedSource(codeSha))
	)
		throw new ApiError(409, "SOURCE_NOT_ALLOWED");
	return new PaperTreeReleases(deps.store, deps.catalog).requestCodeRelease();
}
if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	let deps: PublishDependencies | undefined;
	try {
		deps = await workerDependencies();
		const codeSha = process.argv[2];
		const repo = process.env.BLOG_SOURCE_REPO;
		const branch = process.env.BLOG_SOURCE_BRANCH;
		if (
			!repo ||
			!/^[\w.-]+\/[\w.-]+$/.test(repo) ||
			!branch ||
			!/^[\w/-]+$/.test(branch) ||
			branch.includes("..")
		)
			throw new ApiError(503, "SOURCE_CONFIG_INVALID");
		const job = await createCodeRelease(codeSha, {
			...deps,
			allowedSource: async (sha) => {
				const response = await fetch(
					`https://api.github.com/repos/${repo}/compare/${sha}...${encodeURIComponent(branch)}`,
					{
						headers: { accept: "application/vnd.github+json" },
						signal: AbortSignal.timeout(15000),
					},
				);
				if (!response.ok) return false;
				const result = (await response.json()) as { status: string };
				return ["ahead", "identical"].includes(result.status);
			},
		});
		console.info(`Code job ${job.jobId}: ${job.state}`);
	} catch (error) {
		console.error(error instanceof ApiError ? error.code : "CODE_JOB_FAILED");
		process.exitCode = 1;
	} finally {
		if (deps) await rm(deps.outDir, { recursive: true, force: true });
	}
}
