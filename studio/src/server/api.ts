import { randomBytes } from "node:crypto";
import type { PaperCatalog } from "../../../scripts/paper-trees/catalog";
import { validateDraft } from "../../../src/features/paper-trees/model";
import {
	ApiError,
	authCookie,
	cookieName,
	getCookie,
	newSession,
	readSession,
	requireAuthor,
	safeReturnTo,
	signPayload,
	signSession,
	verifyPayload,
} from "./auth";
import { type AuthorConfig, readAuthorConfig } from "./config";
import { GitHubTreeStore } from "./github-store";

export interface ApiDependencies {
	fetchImpl?: typeof fetch;
	now?: () => number;
	catalog?: PaperCatalog;
	store?: GitHubTreeStore;
}
export function errorMessage(code: string): string {
	const messages: Record<string, string> = {
		UNAUTHENTICATED: "请先使用作者 GitHub 账号登录。",
		OWNER_ONLY: "此工作区仅允许作者访问。",
		CSRF_REJECTED: "请求校验失败，请刷新页面后重试。",
		VERSION_CONFLICT: "草稿已有新版本，请先备份当前修改，再重新加载。",
		GITHUB_RATE_LIMITED: "GitHub 请求次数已达限制，请稍后重试。",
		GITHUB_ACCESS_DENIED: "GitHub 服务权限不可用，请检查应用配置。",
		INVALID_TREE: "解析树内容未通过校验，请检查后重试。",
		REQUEST_TOO_LARGE: "解析树文件超过大小限制。",
		STUDIO_NOT_CONFIGURED: "作者服务尚未完成配置。",
	};
	return messages[code] ?? "请求未完成，请稍后重试。";
}
async function requestJson(request: Request): Promise<Record<string, unknown>> {
	if (request.headers.get("content-type")?.split(";")[0] !== "application/json")
		throw new ApiError(415, "JSON_REQUIRED");
	const limit = 1024 * 1024 + 4096;
	const reader = request.body?.getReader();
	if (!reader) throw new ApiError(400, "INVALID_REQUEST");
	const chunks: Uint8Array[] = [];
	let bytes = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			bytes += value.byteLength;
			if (bytes > limit) {
				await reader.cancel();
				throw new ApiError(413, "REQUEST_TOO_LARGE");
			}
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	try {
		const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
		if (!value || typeof value !== "object" || Array.isArray(value))
			throw new Error();
		return value;
	} catch {
		throw new ApiError(400, "INVALID_REQUEST");
	}
}
export function privateResponse(
	body: unknown,
	status = 200,
	extra: HeadersInit = {},
): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"content-type": "application/json; charset=utf-8",
			"cache-control": "private, no-store",
			"x-robots-tag": "noindex, nofollow",
			...Object.fromEntries(new Headers(extra)),
		},
	});
}
function redirect(path: string, cookies: string[]): Response {
	const headers = new Headers({
		location: path,
		"cache-control": "private, no-store",
		"x-robots-tag": "noindex, nofollow",
	});
	for (const cookie of cookies) headers.append("set-cookie", cookie);
	return new Response(null, { status: 302, headers });
}
export async function handleApi(
	request: Request,
	suppliedConfig?: AuthorConfig,
	dependencies: ApiDependencies = {},
): Promise<Response> {
	let config: AuthorConfig;
	try {
		config = suppliedConfig ?? readAuthorConfig();
	} catch {
		return privateResponse(
			{
				error: "STUDIO_NOT_CONFIGURED",
				message: errorMessage("STUDIO_NOT_CONFIGURED"),
			},
			503,
		);
	}
	try {
		const url = new URL(request.url);
		const path = url.pathname.replace(/\/$/, "");
		if (path === "/api/session") {
			if (request.method !== "GET")
				throw new ApiError(405, "METHOD_NOT_ALLOWED");
			const session = readSession(request, config);
			return privateResponse(
				session
					? {
							authenticated: true,
							csrfToken: session.csrfToken,
							expiresAt: session.expiresAt,
						}
					: { authenticated: false },
			);
		}
		if (path === "/api/logout") {
			if (request.method !== "POST")
				throw new ApiError(405, "METHOD_NOT_ALLOWED");
			requireAuthor(request, config, true);
			return privateResponse({ authenticated: false }, 200, {
				"set-cookie": authCookie(config, "session", "", 0),
			});
		}
		if (path === "/api/auth/login") {
			if (request.method !== "GET")
				throw new ApiError(405, "METHOD_NOT_ALLOWED");
			const state = signPayload(
				{
					nonce: randomBytes(24).toString("hex"),
					expiresAt:
						Math.floor((dependencies.now?.() ?? Date.now()) / 1000) + 300,
					returnTo: safeReturnTo(url.searchParams.get("returnTo")),
				},
				config.sessionSecret,
			);
			const authorize = new URL("https://github.com/login/oauth/authorize");
			authorize.searchParams.set("client_id", config.clientId);
			authorize.searchParams.set("state", state);
			authorize.searchParams.set(
				"redirect_uri",
				`${config.origin}/api/auth/callback`,
			);
			return redirect(authorize.href, [
				authCookie(config, "state", state, 300),
			]);
		}
		if (path === "/api/auth/callback") {
			if (request.method !== "GET")
				throw new ApiError(405, "METHOD_NOT_ALLOWED");
			const state = url.searchParams.get("state");
			const code = url.searchParams.get("code");
			const raw = verifyPayload(state ?? "", config.sessionSecret) as {
				nonce?: string;
				expiresAt?: number;
				returnTo?: string;
			} | null;
			const now = Math.floor((dependencies.now?.() ?? Date.now()) / 1000);
			if (
				!state ||
				!code ||
				code.length > 512 ||
				url.searchParams.has("error") ||
				state !== getCookie(request, cookieName(config, "state")) ||
				!raw ||
				typeof raw.expiresAt !== "number" ||
				raw.expiresAt <= now ||
				raw.expiresAt > now + 300 ||
				typeof raw.nonce !== "string" ||
				!/^[a-f\d]{48}$/.test(raw.nonce)
			)
				throw new ApiError(400, "INVALID_OAUTH_STATE");
			const returnTo = safeReturnTo(raw.returnTo ?? null);
			const fetchImpl = dependencies.fetchImpl ?? fetch;
			const exchange = await fetchImpl(
				"https://github.com/login/oauth/access_token",
				{
					method: "POST",
					headers: {
						accept: "application/json",
						"content-type": "application/json",
					},
					body: JSON.stringify({
						client_id: config.clientId,
						client_secret: config.clientSecret,
						code,
						redirect_uri: `${config.origin}/api/auth/callback`,
					}),
					signal: AbortSignal.timeout(15000),
				},
			);
			if (!exchange.ok) throw new ApiError(502, "GITHUB_AUTH_FAILED");
			const token = (await exchange.json()) as { access_token?: string };
			if (!token.access_token) throw new ApiError(502, "GITHUB_AUTH_FAILED");
			const userResponse = await fetchImpl("https://api.github.com/user", {
				headers: {
					accept: "application/vnd.github+json",
					authorization: `Bearer ${token.access_token}`,
					"X-GitHub-Api-Version": "2022-11-28",
				},
				signal: AbortSignal.timeout(15000),
			});
			if (!userResponse.ok) throw new ApiError(502, "GITHUB_AUTH_FAILED");
			const user = (await userResponse.json()) as { id?: unknown };
			if (
				typeof user.id !== "number" ||
				!Number.isSafeInteger(user.id) ||
				String(user.id) !== config.ownerUserId
			)
				throw new ApiError(403, "OWNER_ONLY");
			return redirect(returnTo, [
				authCookie(config, "state", "", 0),
				authCookie(
					config,
					"session",
					signSession(newSession(config), config.sessionSecret),
					7200,
				),
			]);
		}
		requireAuthor(request, config, request.method !== "GET");
		if (path === "/api/papers" || path === "/api/draft") {
			if (path === "/api/papers" && request.method !== "GET")
				throw new ApiError(405, "METHOD_NOT_ALLOWED");
			if (path === "/api/draft" && !["GET", "PUT"].includes(request.method))
				throw new ApiError(405, "METHOD_NOT_ALLOWED");
			const catalog =
				dependencies.catalog ?? (await import("./catalog")).paperCatalog;
			if (path === "/api/papers") return privateResponse(catalog);
			const paperKey = url.searchParams.get("paperKey");
			const paper =
				paperKey &&
				/^[a-f\d]{64}$/.test(paperKey) &&
				url.searchParams.getAll("paperKey").length === 1
					? catalog.papers.find(
							(p) =>
								p.paperKey === paperKey &&
								p.contentKind === "note" &&
								p.hasBody,
						)
					: undefined;
			if (!paper) throw new ApiError(404, "PAPER_NOT_FOUND");
			const store =
				dependencies.store ??
				new GitHubTreeStore(config, dependencies.fetchImpl);
			if (request.method === "GET") {
				const head = await store.getHead();
				const saved = await store.getFile(
					`drafts/${paper.paperKey}.json`,
					head.sha,
				);
				return privateResponse({
					draft: saved ? validateDraft(saved.value, paper.id) : null,
					blobSha: saved?.blobSha ?? null,
				});
			}
			const body = await requestJson(request);
			if (
				Object.keys(body).some(
					(key) => !["draft", "expectedBlobSha"].includes(key),
				) ||
				!(
					body.expectedBlobSha === null ||
					(typeof body.expectedBlobSha === "string" &&
						/^[a-f\d]{40}$/.test(body.expectedBlobSha))
				)
			)
				throw new ApiError(400, "INVALID_REQUEST");
			let draft: ReturnType<typeof validateDraft>;
			try {
				draft = validateDraft(body.draft, paper.id);
			} catch {
				throw new ApiError(400, "INVALID_TREE");
			}
			const saved = await store.saveDraft(
				paper,
				draft,
				body.expectedBlobSha as string | null,
			);
			return privateResponse({ draft: saved.value, blobSha: saved.blobSha });
		}
		throw new ApiError(404, "NOT_FOUND");
	} catch (error) {
		const code =
			error instanceof ApiError ? error.code : "STUDIO_REQUEST_FAILED";
		return privateResponse(
			{ error: code, message: errorMessage(code) },
			error instanceof ApiError ? error.status : 502,
		);
	}
}
