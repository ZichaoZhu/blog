export interface AuthorConfig {
	appId: string;
	clientId: string;
	clientSecret: string;
	privateKey: string;
	installationId: string;
	ownerUserId: string;
	sessionSecret: string;
	origin: string;
	dataRepo: string;
	dataBranch: string;
	blogRepo: string;
	blogBranch: string;
}
export function isLoopback(origin: string): boolean {
	const url = new URL(origin);
	return (
		url.protocol === "http:" &&
		["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
	);
}
export function readAuthorConfig(
	env: Record<string, string | undefined> = process.env,
): AuthorConfig {
	const mapping = {
		appId: "GITHUB_APP_ID",
		clientId: "GITHUB_APP_CLIENT_ID",
		clientSecret: "GITHUB_APP_CLIENT_SECRET",
		privateKey: "GITHUB_APP_PRIVATE_KEY",
		installationId: "GITHUB_APP_INSTALLATION_ID",
		ownerUserId: "AUTHOR_GITHUB_USER_ID",
		sessionSecret: "AUTHOR_SESSION_SECRET",
		origin: "AUTHOR_ORIGIN",
		dataRepo: "PAPER_TREE_DATA_REPO",
		dataBranch: "PAPER_TREE_DATA_BRANCH",
		blogRepo: "BLOG_SOURCE_REPO",
		blogBranch: "BLOG_SOURCE_BRANCH",
	} as const;
	const config = Object.fromEntries(
		Object.entries(mapping).map(([key, name]) => {
			const value = env[name];
			if (!value?.trim())
				throw new Error(`Missing server configuration: ${name}`);
			return [key, value];
		}),
	) as unknown as AuthorConfig;
	const origin = new URL(config.origin);
	if (
		origin.pathname !== "/" ||
		origin.search ||
		origin.hash ||
		origin.username ||
		origin.password ||
		(origin.protocol !== "https:" &&
			!(
				env.NODE_ENV !== "production" &&
				env.PAPER_TREE_LOCAL_DEV === "true" &&
				isLoopback(config.origin)
			))
	)
		throw new Error("AUTHOR_ORIGIN must be an HTTPS origin");
	config.origin = origin.origin;
	if (
		![config.appId, config.installationId, config.ownerUserId].every((id) =>
			/^[1-9]\d*$/.test(id),
		)
	)
		throw new Error("GitHub IDs must be numeric");
	if (Buffer.byteLength(config.sessionSecret) < 32)
		throw new Error("Session secret must be at least 32 bytes");
	if (
		![config.dataRepo, config.blogRepo].every(
			(repo) =>
				/^[\w.-]+\/[\w.-]+$/.test(repo) &&
				!repo.split("/").some((p) => p === "." || p === ".."),
		)
	)
		throw new Error("Invalid repository");
	if (
		![config.dataBranch, config.blogBranch].every(
			(ref) =>
				/^[\w/-]+$/.test(ref) &&
				!ref.includes("..") &&
				!ref.startsWith("/") &&
				!ref.endsWith("/") &&
				!ref.includes("//"),
		)
	)
		throw new Error("Invalid branch");
	config.privateKey = config.privateKey.replace(/\\n/g, "\n");
	if (
		!config.privateKey.includes("-----BEGIN") ||
		!config.privateKey.includes("PRIVATE KEY-----")
	)
		throw new Error("Invalid GitHub App private key");
	return config;
}
