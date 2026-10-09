import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { readPublicTreeInput } from "../../src/features/paper-trees/public-build";
import { ApiError } from "../../studio/src/server/auth";
import type { ReleaseJob } from "../../studio/src/server/release";
import type { DeploymentProvider, DeploymentRecord } from "./publish";

const execute = promisify(execFile);
export interface VercelConfig {
	role?: "blog" | "studio";
	root: string;
	projectId: string;
	teamId: string;
	token: string;
	bypass: string;
	origin: string;
}
type Command = (
	file: string,
	args: string[],
	options: {
		cwd: string;
		env: NodeJS.ProcessEnv;
		maxBuffer: number;
		timeout: number;
	},
) => Promise<{ stdout: string }>;
interface ProviderResponse {
	id: string;
	url: string;
	projectId: string;
	project?: { id: string };
	meta?: {
		paperTreeCodeSha: string;
		paperTreeReleaseId?: string;
		paperTreeJobId?: string;
	};
	readyState: string;
	alias?: string;
	deploymentId: string;
	ssoProtection?: { deploymentType: string };
}
export class VercelProvider implements DeploymentProvider {
	constructor(
		private config: VercelConfig,
		private fetchImpl: typeof fetch = fetch,
		private command: Command = execute,
	) {
		const origin = new URL(config.origin);
		if (
			origin.protocol !== "https:" ||
			origin.pathname !== "/" ||
			origin.username ||
			origin.password ||
			origin.search ||
			origin.hash ||
			!/^prj_[\w-]+$/.test(config.projectId) ||
			!/^team_[\w-]+$/.test(config.teamId)
		)
			throw new ApiError(503, "INVALID_DEPLOYMENT_CONFIG");
	}
	private async cli(
		args: string[],
		extra: NodeJS.ProcessEnv = {},
	): Promise<string> {
		try {
			return (
				await this.command(
					"pnpm",
					["dlx", "vercel@62.2.0", ...args, "--scope", this.config.teamId],
					{
						cwd: this.config.root,
						env: {
							...process.env,
							...extra,
							VERCEL_TOKEN: this.config.token,
							VERCEL_PROJECT_ID: this.config.projectId,
							VERCEL_ORG_ID: this.config.teamId,
						},
						maxBuffer: 8 * 1024 * 1024,
						timeout: 20 * 60 * 1000,
					},
				)
			).stdout;
		} catch {
			throw new ApiError(502, "VERCEL_COMMAND_FAILED");
		}
	}
	private async request(
		url: string,
		headers: Record<string, string> = {},
	): Promise<Response> {
		try {
			return await this.fetchImpl(url, {
				headers,
				redirect: "manual",
				cache: "no-store",
				signal: AbortSignal.timeout(30000),
			});
		} catch {
			throw new ApiError(502, "VERCEL_UNAVAILABLE");
		}
	}
	private async api(path: string): Promise<ProviderResponse> {
		const response = await this.request(
			`https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(this.config.teamId)}`,
			{ authorization: `Bearer ${this.config.token}` },
		);
		if (!response.ok) throw new ApiError(502, "VERCEL_UNAVAILABLE");
		return response.json();
	}
	async checkProtection(): Promise<void> {
		const project = await this.api(`/v9/projects/${this.config.projectId}`);
		if (
			project.id !== this.config.projectId ||
			project.ssoProtection?.deploymentType !== "all_except_custom_domains" ||
			!this.config.bypass
		)
			throw new ApiError(503, "DEPLOYMENT_PROTECTION_REQUIRED");
	}
	async build(job: ReleaseJob, inputDir: string): Promise<void> {
		await this.cli(["pull", "--yes", "--environment=production"]);
		await this.cli(["build", "--prod"], {
			PAPER_TREE_RELEASE_ID: job.releaseId,
			PAPER_TREE_JOB_ID: job.jobId,
			PAPER_TREES_ENABLED: "true",
			PAPER_TREE_INPUT_DIR: inputDir,
			PUBLIC_SITE_MODE: "production",
			PUBLIC_SITE_ORIGIN: this.config.origin,
		});
	}
	async validateBuild(job: ReleaseJob, inputDir: string): Promise<void> {
		if (this.config.role === "studio") {
			try {
				await this.command("pnpm", ["check"], {
					cwd: this.config.root,
					env: { ...process.env },
					maxBuffer: 8 * 1024 * 1024,
					timeout: 5 * 60 * 1000,
				});
			} catch {
				throw new ApiError(502, "STUDIO_VALIDATION_FAILED");
			}
			return;
		}
		const input = await readPublicTreeInput(inputDir, true, "production");
		if (!input) throw new ApiError(502, "BUILD_INPUT_MISSING");
		const receipt = JSON.parse(
			await readFile(
				join(
					this.config.root,
					".vercel/output/static/paper-trees/release.json",
				),
				"utf8",
			),
		);
		this.receipt(receipt, job);
		for (const snapshot of input.snapshots) {
			const emitted = JSON.parse(
				await readFile(
					join(
						this.config.root,
						".vercel/output/static/paper-trees/snapshots",
						`${snapshot.snapshotId}.json`,
					),
					"utf8",
				),
			);
			if (JSON.stringify(emitted) !== JSON.stringify(snapshot))
				throw new ApiError(502, "BUILD_SNAPSHOT_MISMATCH");
		}
		try {
			await this.command("pnpm", ["verify:site"], {
				cwd: this.config.root,
				env: {
					...process.env,
					PUBLIC_SITE_MODE: "production",
					PUBLIC_SITE_ORIGIN: this.config.origin,
				},
				maxBuffer: 8 * 1024 * 1024,
				timeout: 5 * 60 * 1000,
			});
		} catch {
			throw new ApiError(502, "SITE_VALIDATION_FAILED");
		}
	}
	async upload(job: ReleaseJob): Promise<DeploymentRecord> {
		const output = await this.cli([
			"deploy",
			"--prebuilt",
			"--prod",
			"--skip-domain",
			"--yes",
			"--meta",
			`paperTreeJobId=${job.jobId}`,
			"--meta",
			`paperTreeReleaseId=${job.releaseId}`,
			"--meta",
			`paperTreeCodeSha=${job.codeSha}`,
		]);
		const matches = output.match(/https:\/\/[a-z\d-]+\.vercel\.app\b/g);
		if (matches?.length !== 1)
			throw new ApiError(502, "INVALID_DEPLOYMENT_RESPONSE");
		return this.getDeployment(new URL(matches[0]).hostname);
	}
	async getDeployment(id: string): Promise<DeploymentRecord> {
		if (!/^(?:dpl_[\w-]+|[a-z\d-]+\.vercel\.app)$/.test(id))
			throw new ApiError(502, "INVALID_DEPLOYMENT_ID");
		const raw = await this.api(`/v13/deployments/${encodeURIComponent(id)}`);
		return {
			id: raw.id,
			url: `https://${raw.url}`,
			projectId: raw.projectId ?? raw.project?.id,
			codeSha: raw.meta?.paperTreeCodeSha ?? "",
			releaseId: raw.meta?.paperTreeReleaseId ?? null,
			jobId: raw.meta?.paperTreeJobId ?? null,
			readyState: raw.readyState,
		};
	}
	private candidateOrigin(deployment: DeploymentRecord): string {
		const url = new URL(deployment.url);
		if (
			url.protocol !== "https:" ||
			!/^[a-z\d-]+\.vercel\.app$/.test(url.hostname) ||
			url.pathname !== "/" ||
			url.username ||
			url.password ||
			url.search ||
			url.hash
		)
			throw new ApiError(502, "INVALID_CANDIDATE_URL");
		return url.origin;
	}
	private receipt(input: unknown, job: ReleaseJob): void {
		if (!input || typeof input !== "object" || Array.isArray(input))
			throw new ApiError(502, "RECEIPT_MISMATCH");
		const receipt = input as Record<string, unknown>;
		if (this.config.role === "studio") {
			if (
				Object.keys(receipt).sort().join() !==
					"codeSha,jobId,releaseId,schemaVersion" ||
				receipt.schemaVersion !== 1 ||
				receipt.codeSha !== job.codeSha ||
				receipt.releaseId !== job.releaseId ||
				receipt.jobId !== job.jobId
			)
				throw new ApiError(502, "STUDIO_RECEIPT_MISMATCH");
			return;
		}
		if (
			!receipt ||
			Object.keys(receipt).sort().join() !==
				"codeSha,publishedAt,releaseId,schemaVersion" ||
			receipt.schemaVersion !== 1 ||
			receipt.releaseId !== job.releaseId ||
			receipt.codeSha !== job.codeSha ||
			receipt.publishedAt !== job.createdAt
		)
			throw new ApiError(502, "RECEIPT_MISMATCH");
	}
	async verifyCandidate(
		deployment: DeploymentRecord,
		job: ReleaseJob,
		inputDir: string,
	): Promise<void> {
		const origin = this.candidateOrigin(deployment);
		const input =
			this.config.role === "studio"
				? null
				: await readPublicTreeInput(inputDir, true, "production");
		if (this.config.role !== "studio" && !input)
			throw new ApiError(502, "BUILD_INPUT_MISSING");
		const paths =
			this.config.role === "studio"
				? ["/studio/paper-trees/", "/version.json"]
				: [
						"/",
						"/paper-trees/release.json",
						...(input?.snapshots ?? []).map(
							(s) => `/paper-trees/snapshots/${s.snapshotId}.json`,
						),
					];
		for (const path of paths) {
			const anonymous = await this.request(`${origin}${path}`);
			if (![401, 403].includes(anonymous.status))
				throw new ApiError(502, "CANDIDATE_UNPROTECTED");
			await anonymous.body?.cancel();
			const allowed = await this.request(`${origin}${path}`, {
				"x-vercel-protection-bypass": this.config.bypass,
			});
			if (!allowed.ok) throw new ApiError(502, "CANDIDATE_QA_FAILED");
			if (path === "/paper-trees/release.json" || path === "/version.json")
				this.receipt(await allowed.json(), job);
			else if (path.startsWith("/paper-trees/snapshots/")) {
				const actual = await allowed.json();
				const expected = input?.snapshots.find((s) =>
					path.endsWith(`${s.snapshotId}.json`),
				);
				if (JSON.stringify(actual) !== JSON.stringify(expected))
					throw new ApiError(502, "CANDIDATE_SNAPSHOT_MISMATCH");
			} else await allowed.body?.cancel();
		}
	}
	async promote(deployment: DeploymentRecord): Promise<void> {
		await this.cli(["promote", deployment.id, "--yes", "--timeout", "5m"]);
	}
	async getFormalDeployment(): Promise<DeploymentRecord> {
		const alias = await this.api(
			`/v4/aliases/${new URL(this.config.origin).hostname}`,
		);
		if (
			alias.projectId !== this.config.projectId ||
			alias.alias !== new URL(this.config.origin).hostname
		)
			throw new ApiError(502, "FORMAL_DEPLOYMENT_MISMATCH");
		return this.getDeployment(alias.deploymentId);
	}
	async verifyFormal(
		_deployment: DeploymentRecord,
		job: ReleaseJob,
	): Promise<void> {
		const response = await this.request(
			`${this.config.origin}${this.config.role === "studio" ? "/version.json" : "/paper-trees/release.json"}?verify=${randomUUID()}`,
			{ "cache-control": "no-cache" },
		);
		if (
			!response.ok ||
			!response.headers.get("cache-control")?.includes("no-store")
		)
			throw new ApiError(502, "RECEIPT_MISMATCH");
		this.receipt(await response.json(), job);
	}
}
