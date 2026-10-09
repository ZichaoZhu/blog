import type { PaperCatalog } from "../../../scripts/paper-trees/catalog";
import type { ReleaseManifest } from "../../../src/features/paper-trees/model";
import {
	type DraftTree,
	validateDraft,
} from "../../../src/features/paper-trees/model";
import type { Versioned } from "../server/github-store";
import type { ReleaseJob } from "../server/release";

export type ClientSession =
	| { authenticated: false }
	| { authenticated: true; csrfToken: string; expiresAt: number };
let csrfToken = "";
export class ClientError extends Error {
	constructor(
		public code: string,
		public status: number,
		message: string,
	) {
		super(message);
	}
}
async function call<T>(
	path: string,
	method = "GET",
	body?: unknown,
): Promise<T> {
	const response = await fetch(path, {
		method,
		credentials: "same-origin",
		cache: "no-store",
		headers: {
			...(body === undefined ? {} : { "content-type": "application/json" }),
			...(method === "GET" ? {} : { "X-CSRF-Token": csrfToken }),
		},
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
	const json = await response.json();
	if (!response.ok)
		throw new ClientError(
			json.error ?? "REQUEST_FAILED",
			response.status,
			json.message ?? "请求失败，请稍后重试。",
		);
	return json;
}
export async function getSession(): Promise<ClientSession> {
	const session = await call<ClientSession>("/api/session");
	csrfToken = session.authenticated ? session.csrfToken : "";
	return session;
}
export function forgetSession(): void {
	csrfToken = "";
}
export async function logout(): Promise<void> {
	await call("/api/logout", "POST");
	forgetSession();
}
export async function getPapers(): Promise<PaperCatalog> {
	return call("/api/papers");
}
export async function getDraft(
	paperKey: string,
): Promise<Versioned<DraftTree> | null> {
	const result = await call<{
		draft: DraftTree | null;
		blobSha: string | null;
	}>(`/api/draft?paperKey=${encodeURIComponent(paperKey)}`);
	return result.draft && result.blobSha
		? {
				value: validateDraft(result.draft, result.draft.paperId),
				blobSha: result.blobSha,
			}
		: null;
}
export async function saveDraft(
	paperKey: string,
	draft: DraftTree,
	expectedBlobSha: string | null,
): Promise<Versioned<DraftTree>> {
	const result = await call<{ draft: DraftTree; blobSha: string }>(
		`/api/draft?paperKey=${encodeURIComponent(paperKey)}`,
		"PUT",
		{ draft: validateDraft(draft, draft.paperId), expectedBlobSha },
	);
	return {
		value: validateDraft(result.draft, draft.paperId),
		blobSha: result.blobSha,
	};
}
export async function getActiveJob(): Promise<ReleaseJob | null> {
	return call("/api/jobs");
}
export async function getJob(jobId: string): Promise<ReleaseJob> {
	return call(`/api/jobs?jobId=${encodeURIComponent(jobId)}`);
}
export async function getHistory(
	cursor: string | null = null,
): Promise<{ items: ReleaseManifest[]; cursor: string | null }> {
	return call(
		`/api/history${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
	);
}
export async function requestPublish(
	paperKey: string,
	draftSha: string,
): Promise<ReleaseJob> {
	return call("/api/publish", "POST", { paperKey, draftSha });
}
export async function requestRollback(releaseId: string): Promise<ReleaseJob> {
	return call("/api/rollback", "POST", { releaseId });
}
