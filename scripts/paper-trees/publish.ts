import type { NoteRecord } from "../../src/utils/note-model";
import { ApiError } from "../../studio/src/server/auth";
import type { GitHubTreeStore } from "../../studio/src/server/github-store";
import {
	type ReleaseControl,
	type ReleaseJob,
	releaseId,
	validateControl,
	validateJob,
} from "../../studio/src/server/release";
import type { PaperCatalog } from "./catalog";
import { prepareRelease } from "./prepare";

export interface DeploymentRecord {
	id: string;
	url: string;
	projectId: string;
	codeSha: string;
	releaseId: string | null;
	jobId: string | null;
	readyState: string;
}
export interface DeploymentProvider {
	checkProtection(): Promise<void>;
	build(job: ReleaseJob, inputDir: string): Promise<void>;
	validateBuild(job: ReleaseJob, inputDir: string): Promise<void>;
	upload(job: ReleaseJob): Promise<DeploymentRecord>;
	verifyCandidate(
		deployment: DeploymentRecord,
		job: ReleaseJob,
		inputDir: string,
	): Promise<void>;
	promote(deployment: DeploymentRecord): Promise<void>;
	getFormalDeployment(): Promise<DeploymentRecord>;
	getDeployment(id: string): Promise<DeploymentRecord>;
	verifyFormal(deployment: DeploymentRecord, job: ReleaseJob): Promise<void>;
}
export interface PublishDependencies {
	store: GitHubTreeStore;
	catalog: PaperCatalog;
	notes: readonly NoteRecord[];
	provider: DeploymentProvider;
	outDir: string;
	projectId: string;
	sourceSha(): Promise<string>;
	workflowRuns(): Promise<
		{ name: string; status: string; conclusion: string | null }[]
	>;
}
export function assertDeployment(
	deployment: DeploymentRecord,
	job: ReleaseJob,
	projectId: string,
): void {
	if (
		!/^dpl_[\w-]+$/.test(deployment.id) ||
		deployment.projectId !== projectId ||
		deployment.codeSha !== job.codeSha ||
		deployment.releaseId !== job.releaseId ||
		deployment.jobId !== job.jobId ||
		deployment.readyState !== "READY"
	)
		throw new ApiError(502, "DEPLOYMENT_MISMATCH");
}
export async function readLive(
	jobId: string,
	deps: PublishDependencies,
): Promise<{ job: ReleaseJob; control: ReleaseControl }> {
	releaseId(jobId);
	const head = await deps.store.getHead();
	const job = validateJob(
		(await deps.store.getFile(`jobs/${jobId}.json`, head.sha))?.value,
	);
	const control = validateControl(
		(await deps.store.getFile("control.json", head.sha))?.value,
	);
	if (job.jobId !== jobId) throw new ApiError(502, "JOB_ID_MISMATCH");
	return { job, control };
}
export async function updateJob(
	jobId: string,
	deps: PublishDependencies,
	update: (job: ReleaseJob, control: ReleaseControl) => void,
): Promise<ReleaseJob> {
	// A concurrent private draft save may advance Git; re-read and re-check the lock before retrying.
	for (let attempt = 0; attempt < 3; attempt++) {
		const head = await deps.store.getHead();
		const job = validateJob(
			(await deps.store.getFile(`jobs/${jobId}.json`, head.sha))?.value,
		);
		const control = validateControl(
			(await deps.store.getFile("control.json", head.sha))?.value,
		);
		if (job.jobId !== jobId || control.activeJobId !== jobId)
			throw new ApiError(409, "JOB_NO_LONGER_ACTIVE");
		update(job, control);
		job.updatedAt = new Date().toISOString();
		try {
			await deps.store.commitFiles(head, {
				[`jobs/${jobId}.json`]: JSON.stringify(job),
				"control.json": JSON.stringify(control),
			});
			return job;
		} catch (error) {
			if (
				!(error instanceof ApiError && error.code === "VERSION_CONFLICT") ||
				attempt === 2
			)
				throw error;
		}
	}
	throw new ApiError(409, "VERSION_CONFLICT");
}
export async function recordSuccess(
	jobId: string,
	deps: PublishDependencies,
	deployment: DeploymentRecord,
): Promise<ReleaseJob> {
	return updateJob(jobId, deps, (job, control) => {
		assertDeployment(deployment, job, deps.projectId);
		job.state = "published";
		delete job.error;
		control.activeReleaseId = job.releaseId;
		control.activeCodeSha = job.codeSha;
		control.activeDeploymentId = deployment.id;
		control.activeJobId = null;
	});
}
export async function runPublish(
	jobId: string,
	dataSha: string,
	deps: PublishDependencies,
): Promise<void> {
	const live = await readLive(jobId, deps);
	if (live.job.state === "published") return;
	if (live.control.activeJobId !== jobId)
		throw new ApiError(409, "JOB_NO_LONGER_ACTIVE");
	// A retry of an interrupted worker must reconcile; never repeat a possibly completed promotion.
	if (live.job.state !== "queued")
		throw new ApiError(409, "JOB_REQUIRES_RECONCILIATION");
	const frozen = validateJob(
		(await deps.store.getFile(`jobs/${jobId}.json`, dataSha))?.value,
	);
	if (
		frozen.jobId !== jobId ||
		frozen.releaseId !== live.job.releaseId ||
		frozen.codeSha !== live.job.codeSha ||
		frozen.state !== "queued"
	)
		throw new ApiError(409, "PINNED_JOB_MISMATCH");
	let promotionStarted = false;
	try {
		await deps.provider.checkProtection();
		await prepareRelease(frozen, dataSha, deps.outDir, deps);
		await updateJob(jobId, deps, (job) => {
			job.state = "building";
			delete job.error;
		});
		await deps.provider.build(frozen, deps.outDir);
		await updateJob(jobId, deps, (job) => {
			job.state = "validating";
		});
		await deps.provider.validateBuild(frozen, deps.outDir);
		await updateJob(jobId, deps, (job) => {
			job.state = "deploying";
		});
		const deployment = await deps.provider.upload(frozen);
		assertDeployment(deployment, frozen, deps.projectId);
		await deps.provider.verifyCandidate(deployment, frozen, deps.outDir);
		await updateJob(jobId, deps, (job) => {
			job.deploymentId = deployment.id;
		});
		promotionStarted = true;
		await deps.provider.promote(deployment);
		const formal = await deps.provider.getFormalDeployment();
		assertDeployment(formal, frozen, deps.projectId);
		if (formal.id !== deployment.id)
			throw new ApiError(502, "FORMAL_DEPLOYMENT_MISMATCH");
		await deps.provider.verifyFormal(formal, frozen);
		await recordSuccess(jobId, deps, formal);
	} catch (error) {
		const code = error instanceof ApiError ? error.code : "PUBLICATION_FAILED";
		try {
			await updateJob(jobId, deps, (job, control) => {
				job.state = "failed";
				job.error = {
					code,
					message: promotionStarted
						? "部署结果待核对；发布锁保留。"
						: "发布失败，正式版本未切换。",
				};
				if (!promotionStarted) control.activeJobId = null;
			});
		} catch {
			/* Hold the existing lock if private storage is unavailable. */
		}
		throw new ApiError(502, code);
	}
}
