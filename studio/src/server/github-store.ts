import { createHash, sign } from "node:crypto";
import type { PaperRef } from "../../../scripts/paper-trees/catalog";
import {
	type DraftTree,
	validateDraft,
} from "../../../src/features/paper-trees/model";
import { ApiError } from "./auth";
import type { AuthorConfig } from "./config";

export interface Versioned<T> {
	value: T;
	blobSha: string;
}
export interface GitHead {
	sha: string;
	treeSha: string;
}
interface InstallationToken {value:string;expiresAt:number}
interface TokenSlot {token?:InstallationToken;pending?:Promise<InstallationToken>}
const warmTokens=new WeakMap<typeof fetch,Map<string,TokenSlot>>();
const shaPattern = /^[a-f\d]{40}$/;
const uuidPattern =
	"[a-f\\d]{8}-[a-f\\d]{4}-[a-f\\d]{4}-[a-f\\d]{4}-[a-f\\d]{12}";
function safePath(path: string): void {
	if (
		!(
			path === "control.json" ||
			/^drafts\/[a-f\d]{64}\.json$/.test(path) ||
			new RegExp(`^(?:snapshots|releases|jobs)/${uuidPattern}\\.json$`).test(
				path,
			)
		)
	)
		throw new ApiError(400, "INVALID_STORAGE_PATH");
}
function sha(value: unknown): string {
	if (typeof value !== "string" || !shaPattern.test(value))
		throw new ApiError(502, "INVALID_GITHUB_RESPONSE");
	return value;
}
interface GitResponse {
	token?: string;
	expires_at?: string;
	object?: { sha?: string };
	tree?: { sha?: string };
	sha?: string;
	type?: string;
	encoding?: string;
	content?: string;
}
async function boundedJson(response: Response): Promise<GitResponse> {
	const limit = 2 * 1024 * 1024;
	if (Number(response.headers.get("content-length")) > limit)
		throw new ApiError(502, "GITHUB_RESPONSE_TOO_LARGE");
	const reader = response.body?.getReader();
	if (!reader) throw new ApiError(502, "INVALID_GITHUB_RESPONSE");
	const chunks: Uint8Array[] = [];
	let bytes = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			bytes += value.byteLength;
			if (bytes > limit) {
				await reader.cancel();
				throw new ApiError(502, "GITHUB_RESPONSE_TOO_LARGE");
			}
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	try {
		return JSON.parse(Buffer.concat(chunks).toString("utf8"));
	} catch {
		throw new ApiError(502, "INVALID_GITHUB_RESPONSE");
	}
}
export class GitHubTreeStore {
	constructor(
		private config: Pick<AuthorConfig,"dataRepo"|"dataBranch"> & Partial<Pick<AuthorConfig,"appId"|"privateKey"|"installationId">>,
		private fetchImpl: typeof fetch = fetch,
		private workflowToken?: string,
	) {}
	private async installationToken(): Promise<string> {
		if (this.workflowToken) return this.workflowToken;
		let cache=warmTokens.get(this.fetchImpl);
		if(!cache){cache=new Map();warmTokens.set(this.fetchImpl,cache);}
		const key=createHash("sha256").update(JSON.stringify([this.config.appId,this.config.installationId,this.config.dataRepo,this.config.privateKey])).digest("hex");
		let slot=cache.get(key);
		if(!slot){slot={};cache.set(key,slot);}
		if(slot.token && slot.token.expiresAt>Date.now()+60000)return slot.token.value;
		if(!slot.pending)slot.pending=this.mintInstallationToken();
		try {slot.token=await slot.pending;return slot.token.value;}
		finally {delete slot.pending;}
	}
	private async mintInstallationToken():Promise<InstallationToken> {
		const now = Math.floor(Date.now() / 1000);
		const header = Buffer.from(
			JSON.stringify({ alg: "RS256", typ: "JWT" }),
		).toString("base64url");
		const payload = Buffer.from(
			JSON.stringify({ iat: now - 60, exp: now + 540, iss: this.config.appId }),
		).toString("base64url");
		let jwt: string;
		try {
			if (!this.config.privateKey) throw new Error("Missing App key");
			jwt = `${header}.${payload}.${sign("RSA-SHA256", Buffer.from(`${header}.${payload}`), this.config.privateKey).toString("base64url")}`;
		} catch {
			throw new ApiError(503, "APP_CREDENTIALS_INVALID");
		}
		const response = await this.transport(
			`https://api.github.com/app/installations/${this.config.installationId}/access_tokens`,
			{
				method: "POST",
				headers: this.headers(jwt),
				body: JSON.stringify({
					repositories: [this.config.dataRepo.split("/")[1]],
					permissions: { contents: "write", actions: "write" },
				}),
			},
		);
		this.checkStatus(response);
		const token = await boundedJson(response);
		const expiresAt = Date.parse(token.expires_at ?? "");
		if (typeof token.token !== "string" || !Number.isFinite(expiresAt))
			throw new ApiError(502, "INVALID_GITHUB_RESPONSE");
		return {
			value: token.token,
			expiresAt,
		};
	}
	private headers(token: string): Record<string, string> {
		return {
			accept: "application/vnd.github+json",
			authorization: `Bearer ${token}`,
			"content-type": "application/json",
			"X-GitHub-Api-Version": "2022-11-28",
		};
	}
	private async transport(url: string, init: RequestInit): Promise<Response> {
		try {
			return await this.fetchImpl(url, {
				...init,
				signal: AbortSignal.timeout(15000),
			});
		} catch {
			throw new ApiError(502, "GITHUB_UNAVAILABLE");
		}
	}
	private checkStatus(response: Response): void {
		if (response.ok) return;
		if ([409, 422].includes(response.status))
			throw new ApiError(409, "VERSION_CONFLICT");
		if (
			response.status === 429 ||
			response.headers.get("x-ratelimit-remaining") === "0"
		)
			throw new ApiError(429, "GITHUB_RATE_LIMITED");
		if ([401, 403].includes(response.status))
			throw new ApiError(503, "GITHUB_ACCESS_DENIED");
		throw new ApiError(502, "GITHUB_UNAVAILABLE");
	}
	private async response(
		path: string,
		method = "GET",
		body?: unknown,
	): Promise<Response> {
		const token = await this.installationToken();
		return this.transport(
			`https://api.github.com/repos/${this.config.dataRepo}${path}`,
			{
				method,
				headers: this.headers(token),
				...(body === undefined ? {} : { body: JSON.stringify(body) }),
			},
		);
	}
	private async json(
		path: string,
		method = "GET",
		body?: unknown,
	): Promise<GitResponse> {
		const response = await this.response(path, method, body);
		this.checkStatus(response);
		return boundedJson(response);
	}
	async getHead(): Promise<GitHead> {
		const ref = await this.json(
			`/git/ref/heads/${encodeURIComponent(this.config.dataBranch)}`,
		);
		const commitSha = sha(ref.object?.sha);
		const commit = await this.json(`/git/commits/${commitSha}`);
		return { sha: commitSha, treeSha: sha(commit.tree?.sha) };
	}
	async getFile<T>(path: string, ref: string): Promise<Versioned<T> | null> {
		safePath(path);
		sha(ref);
		const response = await this.response(
			`/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${ref}`,
		);
		if (response.status === 404) return null;
		this.checkStatus(response);
		const file = await boundedJson(response);
		if (
			file.type !== "file" ||
			file.encoding !== "base64" ||
			typeof file.content !== "string" ||
			file.content.length > 1450000
		)
			throw new ApiError(502, "INVALID_GITHUB_RESPONSE");
		try {
			return {
				value: JSON.parse(
					Buffer.from(file.content, "base64").toString("utf8"),
				) as T,
				blobSha: sha(file.sha),
			};
		} catch {
			throw new ApiError(502, "INVALID_GITHUB_RESPONSE");
		}
	}
	async commitFiles(
		base: GitHead,
		files: Record<string, string>,
	): Promise<{ commitSha: string }> {
		sha(base.sha);
		sha(base.treeSha);
		if (!Object.keys(files).length) throw new ApiError(400, "EMPTY_COMMIT");
		for (const [path, content] of Object.entries(files)) {
			safePath(path);
			if (Buffer.byteLength(content) > 1024 * 1024 + 4096)
				throw new ApiError(413, "FILE_TOO_LARGE");
		}
		const tree = await this.json("/git/trees", "POST", {
			base_tree: base.treeSha,
			tree: Object.entries(files).map(([path, content]) => ({
				path,
				mode: "100644",
				type: "blob",
				content,
			})),
		});
		const commit = await this.json("/git/commits", "POST", {
			message: "Update paper tree data",
			tree: sha(tree.sha),
			parents: [base.sha],
		});
		const commitSha = sha(commit.sha);
		await this.json(
			`/git/refs/heads/${encodeURIComponent(this.config.dataBranch)}`,
			"PATCH",
			{ sha: commitSha, force: false },
		);
		return { commitSha };
	}
	async saveDraft(
		paper: PaperRef,
		draft: DraftTree,
		expectedBlobSha: string | null,
	): Promise<Versioned<DraftTree>> {
		if (
			!/^[a-f\d]{64}$/.test(paper.paperKey) ||
			createHash("sha256").update(paper.id).digest("hex") !== paper.paperKey
		)
			throw new ApiError(400, "INVALID_PAPER");
		if (expectedBlobSha !== null) sha(expectedBlobSha);
		const value = validateDraft(draft, paper.id);
		value.updatedAt = new Date().toISOString();
		const path = `drafts/${paper.paperKey}.json`;
		const base = await this.getHead();
		const current = await this.getFile<DraftTree>(path, base.sha);
		if ((current?.blobSha ?? null) !== expectedBlobSha)
			throw new ApiError(409, "VERSION_CONFLICT");
		const content = JSON.stringify(value);
		await this.commitFiles(base, { [path]: content });
		return {
			value,
			blobSha: createHash("sha1")
				.update(`blob ${Buffer.byteLength(content)}\0${content}`)
				.digest("hex"),
		};
	}
	async dispatchPublish(
		jobId: string,
		dataSha: string,
		codeSha: string,
	): Promise<void> {
		if (!new RegExp(`^${uuidPattern}$`).test(jobId))
			throw new ApiError(400, "INVALID_JOB_ID");
		sha(dataSha);
		sha(codeSha);
		let response: Response;
		try {
			response = await this.response(
				"/actions/workflows/publish.yml/dispatches",
				"POST",
				{
					ref: this.config.dataBranch,
					inputs: { job_id: jobId, data_sha: dataSha, code_sha: codeSha },
				},
			);
		} catch (error) {
			if (error instanceof ApiError && error.code === "GITHUB_UNAVAILABLE")
				throw new ApiError(502, "DISPATCH_UNCERTAIN");
			throw error;
		}
		if (response.status >= 500) throw new ApiError(502, "DISPATCH_UNCERTAIN");
		if (!response.ok)
			throw new ApiError(
				response.status === 429 ? 429 : 502,
				"DISPATCH_REJECTED",
			);
		this.checkStatus(response);
	}
}
