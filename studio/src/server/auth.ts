import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { type AuthorConfig, isLoopback } from "./config";

export interface AuthorSession {
	userId: string;
	expiresAt: number;
	csrfToken: string;
}
export class ApiError extends Error {
	constructor(
		public status: number,
		public code: string,
		public details?: { jobId: string },
	) {
		super(code);
	}
}
export const nowSeconds = (): number => Math.floor(Date.now() / 1000);
export function signSession(session: AuthorSession, secret: string): string {
	return signPayload(session, secret);
}
export function signPayload(value: unknown, secret: string): string {
	const body = Buffer.from(JSON.stringify(value)).toString("base64url");
	return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
}
export function verifyPayload(token: string, secret: string): unknown {
	if (token.length > 4096) return null;
	const [body, signature, extra] = token.split(".");
	if (!body || !signature || extra !== undefined) return null;
	const expected = createHmac("sha256", secret).update(body).digest();
	const actual = Buffer.from(signature, "base64url");
	if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
		return null;
	try {
		return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
	} catch {
		return null;
	}
}
export function cookieName(
	config: AuthorConfig,
	kind: "session" | "state" = "session",
): string {
	return `${isLoopback(config.origin) ? "" : "__Host-"}paper-tree-${kind}`;
}
export function getCookie(request: Request, name: string): string | null {
	const values = (request.headers.get("cookie") ?? "")
		.split(";")
		.map((part) => part.trim())
		.filter((part) => part.startsWith(`${name}=`));
	return values.length === 1 ? values[0].slice(name.length + 1) : null;
}
export function authCookie(
	config: AuthorConfig,
	kind: "session" | "state",
	token: string,
	maxAge: number,
): string {
	return `${cookieName(config, kind)}=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; ${isLoopback(config.origin) ? "" : "Secure; "}SameSite=Lax`;
}
export function readSession(
	request: Request,
	config: AuthorConfig,
): AuthorSession | null {
	const raw = verifyPayload(
		getCookie(request, cookieName(config)) ?? "",
		config.sessionSecret,
	) as Partial<AuthorSession> | null;
	if (
		!raw ||
		raw.userId !== config.ownerUserId ||
		typeof raw.expiresAt !== "number" ||
		!Number.isInteger(raw.expiresAt) ||
		raw.expiresAt <= nowSeconds() ||
		raw.expiresAt > nowSeconds() + 7200 ||
		typeof raw.csrfToken !== "string" ||
		!/^[a-f\d]{48}$/.test(raw.csrfToken)
	)
		return null;
	return {
		userId: raw.userId,
		expiresAt: raw.expiresAt,
		csrfToken: raw.csrfToken,
	};
}
export function requireAuthor(
	request: Request,
	config: AuthorConfig,
	write: boolean,
): AuthorSession {
	const session = readSession(request, config);
	if (!session) throw new ApiError(401, "UNAUTHENTICATED");
	if (
		write &&
		(request.headers.get("origin") !== config.origin ||
			request.headers.get("X-CSRF-Token") !== session.csrfToken)
	)
		throw new ApiError(403, "CSRF_REJECTED");
	return session;
}
export function safeReturnTo(input: string | null): string {
	if (input === null || input === "") return "/studio/paper-trees/";
	if (!/^\/studio\/paper-trees\/(?:[a-f\d]{64}\/)?$/.test(input))
		throw new ApiError(400, "INVALID_RETURN_PATH");
	return input;
}
export function newSession(config: AuthorConfig): AuthorSession {
	return {
		userId: config.ownerUserId,
		expiresAt: nowSeconds() + 7200,
		csrfToken: randomBytes(24).toString("hex"),
	};
}
