import { randomBytes } from "node:crypto";
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

export interface ApiDependencies {
	fetchImpl?: typeof fetch;
	now?: () => number;
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
		return privateResponse({ error: "STUDIO_NOT_CONFIGURED" }, 503);
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
		throw new ApiError(404, "NOT_FOUND");
	} catch (error) {
		return privateResponse(
			{ error: error instanceof ApiError ? error.code : "GITHUB_AUTH_FAILED" },
			error instanceof ApiError ? error.status : 502,
		);
	}
}
