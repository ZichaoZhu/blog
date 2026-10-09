import { randomUUID } from "node:crypto";
import type { PaperCatalog } from "../../../scripts/paper-trees/catalog";
import {
	type DraftTree,
	type ReleaseManifest,
	toPublicSnapshot,
	validateDraft,
} from "../../../src/features/paper-trees/model";
import { ApiError } from "./auth";
import type { GitHead, GitHubTreeStore } from "./github-store";

export type JobState =
	| "queued"
	| "building"
	| "validating"
	| "deploying"
	| "published"
	| "failed";
export interface ReleaseJob {
	jobId: string;
	releaseId: string;
	codeSha: string;
	state: JobState;
	createdAt: string;
	mode: "tree" | "code" | "rollback";
	updatedAt?: string;
	deploymentId?: string;
	studioDeploymentId?: string;
	error?: { code: string; message: string };
}
export interface ReleaseControl {
	schemaVersion: 1;
	activeReleaseId: string | null;
	activeCodeSha: string;
	activeDeploymentId: string;
	activeStudioDeploymentId: string | null;
	activeJobId: string | null;
	baselineDeploymentId: string;
}
const uuid = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/;
const sha = /^[a-f\d]{40}$/;
const deployment = /^dpl_[\w-]{1,128}$/;
export function releaseId(input: unknown): string {
	if (typeof input !== "string" || !uuid.test(input))
		throw new ApiError(400, "INVALID_RELEASE_ID");
	return input;
}
function object(input: unknown): Record<string, unknown> {
	if (!input || typeof input !== "object" || Array.isArray(input))
		throw new ApiError(502, "INVALID_RELEASE_DATA");
	return input as Record<string, unknown>;
}
function keys(raw: Record<string, unknown>, allowed: string[]) {
	if (Object.keys(raw).some((key) => !allowed.includes(key)))
		throw new ApiError(502, "INVALID_RELEASE_DATA");
}
function date(input: unknown): string {
	if (typeof input !== "string" || !Number.isFinite(Date.parse(input)))
		throw new ApiError(502, "INVALID_RELEASE_DATA");
	return input;
}
export function validateControl(input: unknown): ReleaseControl {
	const raw = object(input);
	keys(raw, [
		"schemaVersion",
		"activeReleaseId",
		"activeCodeSha",
		"activeDeploymentId",
		"activeStudioDeploymentId",
		"activeJobId",
		"baselineDeploymentId",
	]);
	if (
		raw.schemaVersion !== 1 ||
		typeof raw.activeCodeSha !== "string" ||
		!sha.test(raw.activeCodeSha) ||
		typeof raw.activeDeploymentId !== "string" ||
		!deployment.test(raw.activeDeploymentId) ||
		typeof raw.baselineDeploymentId !== "string" ||
		!deployment.test(raw.baselineDeploymentId) ||
		!(
			raw.activeStudioDeploymentId === null ||
			(typeof raw.activeStudioDeploymentId === "string" &&
				deployment.test(raw.activeStudioDeploymentId))
		)
	)
		throw new ApiError(502, "INVALID_RELEASE_DATA");
	return {
		schemaVersion: 1,
		activeReleaseId:
			raw.activeReleaseId === null ? null : releaseId(raw.activeReleaseId),
		activeCodeSha: raw.activeCodeSha,
		activeDeploymentId: raw.activeDeploymentId,
		activeStudioDeploymentId: raw.activeStudioDeploymentId,
		activeJobId: raw.activeJobId === null ? null : releaseId(raw.activeJobId),
		baselineDeploymentId: raw.baselineDeploymentId,
	};
}
export function validateManifest(input: unknown): ReleaseManifest {
	const raw = object(input);
	keys(raw, [
		"schemaVersion",
		"releaseId",
		"parentReleaseId",
		"codeSha",
		"createdAt",
		"entries",
	]);
	if (
		raw.schemaVersion !== 1 ||
		typeof raw.codeSha !== "string" ||
		!sha.test(raw.codeSha)
	)
		throw new ApiError(502, "INVALID_RELEASE_DATA");
	const entries = Object.fromEntries(
		Object.entries(object(raw.entries)).map(([paperId, id]) => [
			paperId,
			releaseId(id),
		]),
	);
	if (new Set(Object.values(entries)).size !== Object.keys(entries).length)
		throw new ApiError(502, "INVALID_RELEASE_DATA");
	return {
		schemaVersion: 1,
		releaseId: releaseId(raw.releaseId),
		parentReleaseId:
			raw.parentReleaseId === null ? null : releaseId(raw.parentReleaseId),
		codeSha: raw.codeSha,
		createdAt: date(raw.createdAt),
		entries,
	};
}
export function validateJob(input: unknown): ReleaseJob {
	const raw = object(input);
	keys(raw, [
		"jobId",
		"releaseId",
		"codeSha",
		"state",
		"createdAt",
		"mode",
		"updatedAt",
		"deploymentId",
		"studioDeploymentId",
		"error",
	]);
	if (
		typeof raw.codeSha !== "string" ||
		!sha.test(raw.codeSha) ||
		![
			"queued",
			"building",
			"validating",
			"deploying",
			"published",
			"failed",
		].includes(String(raw.state)) ||
		!["tree", "code", "rollback"].includes(String(raw.mode))
	)
		throw new ApiError(502, "INVALID_RELEASE_DATA");
	for (const field of ["deploymentId", "studioDeploymentId"]) {
		if (
			raw[field] !== undefined &&
			(typeof raw[field] !== "string" || !deployment.test(raw[field] as string))
		)
			throw new ApiError(502, "INVALID_RELEASE_DATA");
	}
	if (raw.error !== undefined) {
		const error = object(raw.error);
		keys(error, ["code", "message"]);
		if (
			typeof error.code !== "string" ||
			!/^[A-Z_]{1,64}$/.test(error.code) ||
			typeof error.message !== "string" ||
			error.message.length > 280
		)
			throw new ApiError(502, "INVALID_RELEASE_DATA");
	}
	return {
		jobId: releaseId(raw.jobId),
		releaseId: releaseId(raw.releaseId),
		codeSha: raw.codeSha,
		state: raw.state as JobState,
		createdAt: date(raw.createdAt),
		mode: raw.mode as ReleaseJob["mode"],
		...(raw.updatedAt ? { updatedAt: date(raw.updatedAt) } : {}),
		...(raw.deploymentId ? { deploymentId: raw.deploymentId as string } : {}),
		...(raw.studioDeploymentId
			? { studioDeploymentId: raw.studioDeploymentId as string }
			: {}),
		...(raw.error ? { error: raw.error as ReleaseJob["error"] } : {}),
	};
}

export class PaperTreeReleases {
	constructor(
		private store: GitHubTreeStore,
		private catalog: PaperCatalog,
	) {}
	async readControl(ref: string): Promise<ReleaseControl> {
		const stored = await this.store.getFile("control.json", ref);
		if (!stored) throw new ApiError(503, "RELEASE_NOT_INITIALIZED");
		return validateControl(stored.value);
	}
	private async manifest(id: string, ref: string): Promise<ReleaseManifest> {
		const stored = await this.store.getFile(
			`releases/${releaseId(id)}.json`,
			ref,
		);
		if (!stored) throw new ApiError(502, "MISSING_RELEASE");
		const result = validateManifest(stored.value);
		if (result.releaseId !== id)
			throw new ApiError(502, "INVALID_RELEASE_DATA");
		return result;
	}
	private writable(control: ReleaseControl) {
		if (control.activeCodeSha !== this.catalog.codeSha)
			throw new ApiError(409, "SOURCE_VERSION_MISMATCH");
		if (control.activeJobId)
			throw new ApiError(409, "RELEASE_BUSY", { jobId: control.activeJobId });
	}
	private publicEntries(entries: Record<string, string>): Map<string, string> {
		const publicIds = new Set(
			this.catalog.papers
				.filter(
					(paper) =>
						paper.visibility === "published" &&
						paper.contentKind === "note" &&
						paper.hasBody,
				)
				.map((paper) => paper.id),
		);
		return new Map(Object.entries(entries).filter(([id]) => publicIds.has(id)));
	}
	private async successful(
		id: string,
		control: ReleaseControl,
		ref: string,
	): Promise<ReleaseManifest> {
		releaseId(id);
		const seen = new Set<string>();
		let current = control.activeReleaseId;
		while (current) {
			if (seen.has(current) || seen.size >= 10000)
				throw new ApiError(502, "INVALID_RELEASE_CHAIN");
			seen.add(current);
			const item = await this.manifest(current, ref);
			if (current === id) return item;
			current = item.parentReleaseId;
		}
		throw new ApiError(404, "RELEASE_NOT_SUCCESSFUL");
	}
	async getHistory(
		cursor: string | null,
		limit = 20,
	): Promise<{ items: ReleaseManifest[]; cursor: string | null }> {
		if (!Number.isInteger(limit) || limit < 1 || limit > 20)
			throw new ApiError(400, "INVALID_HISTORY_LIMIT");
		const head = await this.store.getHead();
		const control = await this.readControl(head.sha);
		let current = control.activeReleaseId;
		if (cursor) {
			await this.successful(cursor, control, head.sha);
			current = cursor;
		}
		const items: ReleaseManifest[] = [];
		const seen = new Set<string>();
		while (current && items.length < limit) {
			if (seen.has(current)) throw new ApiError(502, "INVALID_RELEASE_CHAIN");
			seen.add(current);
			const item = await this.manifest(current, head.sha);
			items.push(item);
			current = item.parentReleaseId;
		}
		return { items, cursor: current };
	}
	async getJob(jobId: string): Promise<ReleaseJob> {
		releaseId(jobId);
		const head = await this.store.getHead();
		const stored = await this.store.getFile(`jobs/${jobId}.json`, head.sha);
		if (!stored) throw new ApiError(404, "JOB_NOT_FOUND");
		const job = validateJob(stored.value);
		if (job.jobId !== jobId) throw new ApiError(502, "INVALID_RELEASE_DATA");
		return job;
	}
	async getActiveJob(): Promise<ReleaseJob | null> {
		const head = await this.store.getHead();
		const control = await this.readControl(head.sha);
		if (!control.activeJobId) return null;
		const stored = await this.store.getFile(
			`jobs/${control.activeJobId}.json`,
			head.sha,
		);
		if (!stored) throw new ApiError(502, "MISSING_ACTIVE_JOB");
		const job = validateJob(stored.value);
		if (job.jobId !== control.activeJobId)
			throw new ApiError(502, "INVALID_RELEASE_DATA");
		return job;
	}
	async requestPublish(
		paperKey: string,
		draftSha: string,
	): Promise<ReleaseJob> {
		const paper = /^[a-f\d]{64}$/.test(paperKey)
			? this.catalog.papers.find((item) => item.paperKey === paperKey)
			: undefined;
		if (!paper) throw new ApiError(404, "PAPER_NOT_FOUND");
		if (
			paper.visibility !== "published" ||
			paper.contentKind !== "note" ||
			!paper.hasBody
		)
			throw new ApiError(400, "PAPER_NOT_PUBLIC");
		if (!sha.test(draftSha)) throw new ApiError(400, "INVALID_DRAFT_VERSION");
		const head = await this.store.getHead();
		const control = await this.readControl(head.sha);
		this.writable(control);
		const draft = await this.store.getFile<DraftTree>(
			`drafts/${paperKey}.json`,
			head.sha,
		);
		if (!draft || draft.blobSha !== draftSha)
			throw new ApiError(409, "VERSION_CONFLICT");
		const createdAt = new Date().toISOString();
		const snapshot = toPublicSnapshot(
			validateDraft(draft.value, paper.id),
			randomUUID(),
			createdAt,
		);
		const baseline = control.activeReleaseId
			? await this.manifest(control.activeReleaseId, head.sha)
			: null;
		const entries = this.publicEntries(baseline?.entries ?? {});
		entries.set(paper.id, snapshot.snapshotId);
		return this.enqueue(
			head,
			control,
			Object.fromEntries(entries),
			"tree",
			{ [`snapshots/${snapshot.snapshotId}.json`]: JSON.stringify(snapshot) },
			createdAt,
		);
	}
	async requestRollback(id: string): Promise<ReleaseJob> {
		releaseId(id);
		const head = await this.store.getHead();
		const control = await this.readControl(head.sha);
		this.writable(control);
		const previous = await this.successful(id, control, head.sha);
		return this.enqueue(
			head,
			control,
			Object.fromEntries(this.publicEntries(previous.entries)),
			"rollback",
			{},
			new Date().toISOString(),
		);
	}
	/** Operator-only entry: never exposed by the Studio API. */
	async requestCodeRelease(): Promise<ReleaseJob> {
		const head=await this.store.getHead();
		const control=await this.readControl(head.sha);
		if(control.activeJobId)throw new ApiError(409,"RELEASE_BUSY",{jobId:control.activeJobId});
		const baseline=control.activeReleaseId?await this.manifest(control.activeReleaseId,head.sha):null;
		return this.enqueue(head,control,Object.fromEntries(this.publicEntries(baseline?.entries??{})),"code",{},new Date().toISOString());
	}
	private async enqueue(
		head: GitHead,
		control: ReleaseControl,
		entries: Record<string, string>,
		mode: ReleaseJob["mode"],
		files: Record<string, string>,
		createdAt: string,
	): Promise<ReleaseJob> {
		const release: ReleaseManifest = {
			schemaVersion: 1,
			releaseId: randomUUID(),
			parentReleaseId: control.activeReleaseId,
			codeSha: this.catalog.codeSha,
			createdAt,
			entries,
		};
		const job: ReleaseJob = {
			jobId: randomUUID(),
			releaseId: release.releaseId,
			codeSha: release.codeSha,
			state: "queued",
			createdAt,
			mode,
		};
		let dataSha: string;
		try {
			const result = await this.store.commitFiles(head, {
				...files,
				[`releases/${release.releaseId}.json`]: JSON.stringify(release),
				[`jobs/${job.jobId}.json`]: JSON.stringify(job),
				"control.json": JSON.stringify({ ...control, activeJobId: job.jobId }),
			});
			dataSha = result.commitSha;
		} catch (error) {
			if (error instanceof ApiError && error.code === "VERSION_CONFLICT") {
				const current = await this.readControl(
					(await this.store.getHead()).sha,
				);
				if (current.activeJobId)
					throw new ApiError(409, "RELEASE_BUSY", {
						jobId: current.activeJobId,
					});
			}
			throw error;
		}
		try {
			await this.store.dispatchPublish(job.jobId, dataSha, job.codeSha);
			return job;
		} catch (error) {
			const uncertain =
				!(error instanceof ApiError) ||
				![
					"DISPATCH_REJECTED",
					"APP_CREDENTIALS_INVALID",
					"GITHUB_ACCESS_DENIED",
					"GITHUB_RATE_LIMITED",
				].includes(error.code);
			const updated: ReleaseJob = {
				...job,
				state: uncertain ? "queued" : "failed",
				updatedAt: new Date().toISOString(),
				error: {
					code: uncertain ? "DISPATCH_UNCERTAIN" : "DISPATCH_REJECTED",
					message: uncertain
						? "发布请求结果正在核对，请保留当前任务。"
						: "发布工作流未接受请求，请检查配置后重试。",
				},
			};
			try {
				const latest = await this.store.getHead();
				const current = await this.readControl(latest.sha);
				if (current.activeJobId !== job.jobId) return this.getJob(job.jobId);
				await this.store.commitFiles(latest, {
					[`jobs/${job.jobId}.json`]: JSON.stringify(updated),
					...(!uncertain
						? {
								"control.json": JSON.stringify({
									...current,
									activeJobId: null,
								}),
							}
						: {}),
				});
				return updated;
			} catch {
				return {
					...job,
					error: {
						code: "DISPATCH_UNCERTAIN",
						message: "发布请求结果正在核对，请保留当前任务。",
					},
				};
			}
		}
	}
}
