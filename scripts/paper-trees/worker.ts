import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ApiError } from "../../studio/src/server/auth";
import { GitHubTreeStore } from "../../studio/src/server/github-store";
import { buildPaperCatalog, readNoteRecords } from "./catalog";
import { type PublishDependencies, runPublish } from "./publish";
import { reconcileRelease } from "./reconcile";
import { VercelProvider } from "./vercel";

function required(name: string): string {
	const value = process.env[name];
	if (!value) throw new ApiError(503, "WORKER_CONFIG_MISSING");
	return value;
}
export async function workerDependencies(): Promise<PublishDependencies> {
	const root = process.cwd();
	const dataRepo = required("PAPER_TREE_DATA_REPO");
	const dataBranch = required("PAPER_TREE_DATA_BRANCH");
	if (
		!/^[\w.-]+\/[\w.-]+$/.test(dataRepo) ||
		!/^[\w/-]+$/.test(dataBranch) ||
		dataBranch.includes("..")
	)
		throw new ApiError(503, "WORKER_CONFIG_INVALID");
	const sourceSha = async () =>
		execFileSync("git", ["rev-parse", "HEAD"], {
			cwd: root,
			encoding: "utf8",
		}).trim();
	const catalog = await buildPaperCatalog(
		join(root, "src/content/posts"),
		await sourceSha(),
	);
	const token = required("GH_DATA_TOKEN");
	const store = new GitHubTreeStore({ dataRepo, dataBranch }, fetch, token);
	const projectId = required("VERCEL_PROJECT_ID");
	return {
		store,
		catalog,
		sourceSha,
		projectId,
		notes: await readNoteRecords(join(root, "src/content/posts")),
		outDir: await mkdtemp(join(tmpdir(), "paper-tree-public-")),
		provider: new VercelProvider({
			root,
			projectId,
			teamId: required("VERCEL_ORG_ID"),
			token: required("VERCEL_TOKEN"),
			bypass: required("VERCEL_AUTOMATION_BYPASS_SECRET"),
			origin: "https://blog.blessingworld.cn",
		}),
		workflowRuns: async () => {
			const response = await fetch(
				`https://api.github.com/repos/${dataRepo}/actions/workflows/publish.yml/runs?per_page=100`,
				{
					headers: {
						authorization: `Bearer ${token}`,
						accept: "application/vnd.github+json",
					},
					signal: AbortSignal.timeout(15000),
				},
			);
			if (!response.ok) throw new ApiError(502, "WORKFLOW_QUERY_FAILED");
			const data = (await response.json()) as {
				workflow_runs: {
					display_title: string;
					status: string;
					conclusion: string | null;
				}[];
			};
			return data.workflow_runs.map((run) => ({
				name: run.display_title,
				status: run.status,
				conclusion: run.conclusion,
			}));
		},
	};
}
if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	let dependencies: PublishDependencies | undefined;
	try {
		const [command, jobId, dataSha] = process.argv.slice(2);
		if (!["publish", "reconcile"].includes(command))
			throw new ApiError(400, "INVALID_WORKER_COMMAND");
		dependencies = await workerDependencies();
		if (command === "publish") await runPublish(jobId, dataSha, dependencies);
		else {
			const result = await reconcileRelease(jobId, dependencies);
			console.info(`Job ${result.jobId}: ${result.state}`);
		}
	} catch (error) {
		console.error(error instanceof ApiError ? error.code : "WORKER_FAILED");
		process.exitCode = 1;
	} finally {
		if (dependencies)
			await rm(dependencies.outDir, { recursive: true, force: true });
	}
}
